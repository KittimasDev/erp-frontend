"use client";

import PageLoading from "@/components/common/PageLoading";

import { useEffect, useState } from "react";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Input,
  Modal,
  Spin,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelSalesInvoiceMutation,
  useConfirmSalesInvoiceMutation,
} from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import {
  useSalesInvoicePaymentAttachmentsQuery,
  useSalesInvoiceQuery,
} from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { ApiError } from "@/lib/api/client";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import { useArInvoicePermissions } from "@/hooks/sales-invoices/useArInvoicePermissions";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useActiveSalesTaxInvoiceQuery,
  useIssueSalesTaxInvoiceMutation,
} from "@/hooks/sales-tax-invoices/useSalesTaxInvoices";
import type { DocumentAttachment } from "@/types/document-attachments";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { arReceiptRoutes, arRoutes, taxInvoiceRoutes } from "@/lib/sales/ar-routes";
import type { SalesInvoice, SalesInvoiceItem } from "@/types/sales-invoices";
import {
  salesInvoicePaymentMethodLabel,
  salesInvoicePaymentStatusLabel,
  salesInvoiceStatusLabel,
} from "@/types/sales-invoices";
import { vatAmountLabelT } from "@/types/purchase-orders";
import {
  resolveVatMode,
  STANDARD_VAT_PERCENT,
  VAT_MODE_LABEL,
  VatMode,
} from "@/lib/money/vat-totals";

/** B3: หัวเอกสารดูจากอัตราที่ผูก / ยอด VAT จริง / โหมด VAT — ว่างแล้วอย่าขึ้น «ไม่คิด VAT» ถ้ามียอด */
function resolveInvoiceVatRate(data: {
  taxRate?: { rate?: number | string } | null;
  vatMode?: string | null;
  vatAmount?: string | number | null;
}): number | undefined {
  const linked = data.taxRate != null ? Number(data.taxRate.rate) : NaN;
  if (Number.isFinite(linked) && linked > 0) return linked;
  if (resolveVatMode(data.vatMode) === VatMode.NONE) return undefined;
  if (Number(data.vatAmount ?? 0) > 0.0001) return STANDARD_VAT_PERCENT;
  if (resolveVatMode(data.vatMode) !== VatMode.NONE) return STANDARD_VAT_PERCENT;
  return undefined;
}
import ApplyCreditButton from "@/components/ar-receipts/ApplyCreditButton";
import ArInvoiceDeliveriesCard from "./ArInvoiceDeliveriesCard";
import styles from "./SalesInvoiceDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import DocumentPaper from "@/components/common/DocumentPaper";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusClass(status: string) {
  switch (status) {
    case "POSTED":
      return styles.statusApproved;
    case "DRAFT":
    case "CANCELLED":
      return styles.statusCancelled; // แบบร่าง/ยกเลิก = เทา (มาตรฐานสถานะ)
    default:
      return styles.statusDraft;
  }
}

function attachmentDisplayName(file: DocumentAttachment) {
  return file.originalFileName || file.description || file.id;
}

function isPreviewableAttachment(file: DocumentAttachment) {
  const mime = file.mimeType ?? "";
  return mime.startsWith("image/") || mime === "application/pdf";
}

export default function SalesInvoiceDetailPage({ id }: Props) {
  const t = useT();
  const query = useSalesInvoiceQuery(id);
  const data = query.data?.data;

  if (query.isLoading) {
    return <PageLoading />;
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบใบแจ้งหนี้")}
        <div style={{ marginTop: 12 }}>
          <Link href={arRoutes.list}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  return <SalesInvoiceDetailView data={data} />;
}

function SalesInvoiceDetailView({ data }: { data: SalesInvoice }) {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { modal, message } = App.useApp();
  const confirmMutation = useConfirmSalesInvoiceMutation();
  const cancelMutation = useCancelSalesInvoiceMutation();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const attachmentsQuery = useSalesInvoicePaymentAttachmentsQuery(data.id);
  const paymentAttachments = attachmentsQuery.data?.data ?? [];

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(false);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const paidAmount = (data.payments ?? []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );
  const outstandingAmount = Math.max(
    0,
    (Number(data.totalAmount) || 0) - paidAmount,
  );

  const { canEdit, canApprove } = useArInvoicePermissions();
  const canWrite = canEdit || canApprove;
  const taxPerms = useScreenActionPermissions("FINANCE_TAX_INVOICES");
  const receiptPerms = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const activeTaxQuery = useActiveSalesTaxInvoiceQuery(
    data.id,
    data.status === "POSTED",
  );
  const issueTaxMutation = useIssueSalesTaxInvoiceMutation();
  const activeTax = activeTaxQuery.data?.data;

  const busy = confirmMutation.isPending || cancelMutation.isPending;

  const printPdf = async () => {
    const { generateSalesInvoicePdf } = await import(
      "@/utils/generateSalesInvoicePdf"
    );
    await generateSalesInvoicePdf({
      invoiceNo: data.invoiceNo,
      invoiceDate: formatDate(data.invoiceDate),
      dueDate: formatDate(data.dueDate),
      customerName: data.customer?.nameTh ?? "—",
      customerCode: data.customer?.customerCode ?? "—",
      salesOrderNo: data.salesOrder?.soNo ?? "—",
      deliveryOrderNo:
        (data.deliveryOrders?.length ?? 0) > 0
          ? data.deliveryOrders!.map((d) => d.deliveryOrderNo).join(", ")
          : (data.deliveryOrder?.deliveryOrderNo ?? "—"),
      paymentTerm: data.paymentTerm?.name ?? "—",
      vatModeLabel: VAT_MODE_LABEL[resolveVatMode(data.vatMode)],
      remark: data.remark?.trim() || "",
      preparedBy: {
        id: data.createdBy?.id,
        name: data.createdBy?.displayName,
      },
      subtotalAmount: Number(data.subtotalAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      afterDiscount: Math.max(
        0,
        Number(data.subtotalAmount) - Number(data.discountAmount),
      ),
      vatAmount: Number(data.vatAmount) || 0,
      vatRate: resolveInvoiceVatRate(data),
      vatMode: data.vatMode,
      totalAmount: Number(data.totalAmount) || 0,
      advanceDeductions: (data.advanceDeductions ?? []).map((row) => ({
        docNo: row.docNo,
        baseAmount: Number(row.baseAmount) || 0,
        vatAmount: Number(row.vatAmount) || 0,
        amount: Number(row.amount) || 0,
      })),
      items: (data.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemName ?? "—",
        unit: item.unitName ?? "—",
        qty: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        amount: Number(item.amount) || 0,
      })),
    });
  };

  const downloadAttachment = async (file: DocumentAttachment) => {
    try {
      const { blob, filename } = await downloadDocumentAttachment(
        getAccessToken(),
        file.id,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || attachmentDisplayName(file);
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("ดาวน์โหลดไฟล์ไม่สำเร็จ"),
      );
    }
  };

  const openAttachmentPreview = async (file: DocumentAttachment) => {
    if (!isPreviewableAttachment(file)) {
      await downloadAttachment(file);
      return;
    }
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewTitle(attachmentDisplayName(file));
    setPreviewIsImage((file.mimeType ?? "").startsWith("image/"));
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const { blob } = await downloadDocumentAttachment(
        getAccessToken(),
        file.id,
      );
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      setPreviewOpen(false);
      message.error(
        error instanceof ApiError ? error.message : t("เปิดไฟล์ไม่สำเร็จ"),
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const itemColumns: ColumnsType<SalesInvoiceItem> = [
    {
      title: t("ลำดับ"),
      width: 48,
      render: (_v, _r, index) => index + 1,
    },
    {
      title: t("สินค้า"),
      render: (_v, row) => (
        <div>
          <div>{row.itemName ?? "—"}</div>
          <div style={{ color: "#8a9199", fontSize: 12 }}>{row.itemCode}</div>
        </div>
      ),
    },
    {
      title: t("จำนวน"),
      dataIndex: "quantity",
      align: "right",
      width: 100,
    },
    {
      title: t("หน่วย"),
      dataIndex: "unitName",
      width: 80,
      render: (v?: string) => v ?? "—",
    },
    {
      title: t("ราคา/หน่วย"),
      dataIndex: "unitPrice",
      align: "right",
      width: 120,
      render: (v: string) => formatMoney(v),
    },
    {
      title: t("ส่วนลด"),
      dataIndex: "discountAmount",
      align: "right",
      width: 100,
      render: (v: string) => formatMoney(v),
    },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "amount",
      align: "right",
      width: 120,
      render: (v: string) => formatMoney(v),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales Invoices · AR"
        icon={<FileTextOutlined />}
        title={data.invoiceNo}
        subtitle={<>{data.customer?.nameTh ?? "—"} · {formatDate(data.invoiceDate)} ·{" "}
            {formatMoney(data.totalAmount)} {t("บาท")}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(arRoutes.list)}
          >
            {t("กลับ")}
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            {t("พิมพ์ PDF")}
          </Button>
          {data.status === "POSTED" && activeTax ? (
            <Button
              icon={<FileTextOutlined />}
              onClick={() => router.push(taxInvoiceRoutes.detail(activeTax.id))}
            >
              {t("ดูใบกำกับภาษี")}
            </Button>
          ) : null}
          {data.status === "POSTED" &&
          !activeTax &&
          !activeTaxQuery.isLoading &&
          taxPerms.canAdd &&
          resolveVatMode(data.vatMode) !== VatMode.NONE ? (
            <Button
              icon={<FileTextOutlined />}
              loading={issueTaxMutation.isPending}
              onClick={() => {
                modal.confirm({
                  title: t("ออกใบกำกับภาษี?"),
                  content: t("วันที่ใบใช้วันส่งของ ถ้าจะยกเลิกใบแจ้งหนี้ต้องยกเลิกใบกำกับภาษีก่อน"),
                  okText: t("ออกใบกำกับภาษี"),
                  cancelText: t("ปิด"),
                  onOk: async () => {
                    const res = await issueTaxMutation.mutateAsync(data.id);
                    if (res.data?.id) router.push(taxInvoiceRoutes.detail(res.data.id));
                  },
                });
              }}
            >
              {t("ออกใบกำกับภาษี")}
            </Button>
          ) : null}
          {canWrite && data.status === "DRAFT" ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(arRoutes.edit(data.id))}
              >
                {t("แก้ไข")}
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() => {
                  modal.confirm({
                    title: t("ยืนยันใบแจ้งหนี้?"),
                    content: t("สถานะจะเป็น POSTED / UNPAID"),
                    okText: t("ยืนยัน"),
                    cancelText: t("ยกเลิก"),
                    onOk: () => confirmMutation.mutateAsync(data.id),
                  });
                }}
              >
                Confirm
              </Button>
            </>
          ) : null}
          {canWrite &&
          (data.status === "DRAFT" ||
            (data.status === "POSTED" && data.paymentStatus === "UNPAID")) ? (
            <Button
              danger
              icon={<CloseOutlined />}
              loading={busy}
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </Button>
          ) : null}
          {data.status === "POSTED" && outstandingAmount > 0 ? (
            <ApplyCreditButton
              customerId={data.customerId}
              salesInvoiceId={data.id}
              salesOrderId={data.salesOrderId}
              invoiceNo={data.invoiceNo}
              outstanding={outstandingAmount}
            />
          ) : null}
          {receiptPerms.canAdd &&
          data.status === "POSTED" &&
          outstandingAmount > 0.005 ? (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() =>
                router.push(arReceiptRoutes.createForInvoice(data.customerId, data.id))
              }
            >
              {t("รับชำระ")}
            </Button>
          ) : null}
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <DocumentPaper
            titleTh={t("ใบแจ้งหนี้")}
            titleEn="SALES INVOICE"
            meta={[
              { label: t("เลขที่เอกสาร"), value: data.invoiceNo },
              { label: t("วันที่เอกสาร"), value: formatDate(data.invoiceDate) },
              { label: t("ครบกำหนด"), value: formatDate(data.dueDate) },
            ]}
          >
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ข้อมูลใบแจ้งหนี้")}</h2>
              <span
                className={`${styles.statusPill} ${statusClass(data.status)}`}
              >
                {salesInvoiceStatusLabel(data.status, lang)}
                {data.paymentStatus
                  ? ` · ${salesInvoicePaymentStatusLabel(data.paymentStatus, lang)}`
                  : ""}
              </span>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่")}</span>
                <div className={styles.metaValue}>{data.invoiceNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.invoiceDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ครบกำหนด")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.dueDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ลูกค้า")}</span>
                <div className={styles.metaValue}>
                  {data.customer?.nameTh ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ใบส่งสินค้า")}</span>
                <div className={styles.metaValue}>
                  {(data.deliveryOrders?.length ?? 0) > 0
                    ? data.deliveryOrders!.map((d, i) => (
                        <span key={d.id}>
                          {i > 0 ? ", " : null}
                          <Link href={`/delivery-orders/${d.id}`}>
                            {d.deliveryOrderNo}
                          </Link>
                        </span>
                      ))
                    : data.deliveryOrderId ? (
                        <Link href={`/delivery-orders/${data.deliveryOrderId}`}>
                          {data.deliveryOrder?.deliveryOrderNo ?? data.deliveryOrderId}
                        </Link>
                      ) : (
                        "—"
                      )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ใบสั่งขาย")}</span>
                <div className={styles.metaValue}>
                  {data.salesOrderId ? (
                    <Link href={`/sales-orders/${data.salesOrderId}`}>
                      {data.salesOrder?.soNo ?? data.salesOrderId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เงื่อนไขชำระ")}</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("รูปแบบ VAT")}</span>
                <div className={styles.metaValue}>
                  {t(VAT_MODE_LABEL[resolveVatMode(data.vatMode)])}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("อัตรา VAT")}</span>
                <div className={styles.metaValue}>
                  {(() => {
                    const rate = resolveInvoiceVatRate(data);
                    if (rate == null) return t("ไม่คิด VAT");
                    if (data.taxRate) {
                      return `${data.taxRate.name} (${rate}%)`;
                    }
                    return `VAT ${rate}%`;
                  })()}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("หมายเหตุ")}</span>
                <div className={styles.metaValue}>{data.remark || "—"}</div>
              </div>
              {data.status === "CANCELLED" ? (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("เหตุผลที่ยกเลิก")}</span>
                  <div className={styles.metaValue}>{data.cancelReason || "—"}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการสินค้า")}</h2>
            </div>
            <Table
              rowKey="id"
              columns={itemColumns}
              dataSource={data.items ?? []}
              pagination={false}
              size="small"
            />
            <div className={styles.metaGrid} style={{ marginTop: 16 }}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ยอดรวมก่อนส่วนลด")}</span>
                <div className={styles.metaValue}>
                  {formatMoney(data.subtotalAmount)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ส่วนลดท้ายบิล")}</span>
                <div className={styles.metaValue}>
                  {formatMoney(data.discountAmount)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ยอดหลังหักส่วนลด")}</span>
                <div className={styles.metaValue}>
                  {formatMoney(
                    String(
                      Math.max(
                        0,
                        Number(data.subtotalAmount) -
                          Number(data.discountAmount),
                      ),
                    ),
                  )}
                </div>
              </div>
              {(data.advanceDeductions ?? []).map((row) => (
                <div className={styles.metaItem} key={row.id}>
                  <span className={styles.metaLabel}>
                    {t("หักเงินล่วงหน้า {docNo}", { docNo: row.docNo })}
                  </span>
                  <div className={styles.metaValue}>
                    {t("ก่อน VAT {base} / VAT {vat} / รวม {amount}", {
                      base: formatMoney(row.baseAmount),
                      vat: formatMoney(row.vatAmount),
                      amount: formatMoney(row.amount),
                    })}
                  </div>
                </div>
              ))}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>
                  {vatAmountLabelT(resolveInvoiceVatRate(data))}
                  {(data.advanceDeductions ?? []).length > 0
                    ? ` (${t("หลังหักเงินล่วงหน้า")})`
                    : ""}
                </span>
                <div className={styles.metaValue}>
                  {formatMoney(data.vatAmount)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ยอดสุทธิ")}</span>
                <div className={styles.metaValue}>
                  <strong>{formatMoney(data.totalAmount)}</strong>
                </div>
              </div>
              {data.paymentStatus ? (
                <>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("ชำระแล้ว")}</span>
                    <div className={styles.metaValue}>
                      {formatMoney(String(paidAmount))}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("คงค้าง")}</span>
                    <div className={styles.metaValue}>
                      <strong>{formatMoney(String(outstandingAmount))}</strong>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {(data.payments?.length ?? 0) > 0 ||
          paymentAttachments.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("การรับชำระ")}</h2>
              </div>
              {(data.payments ?? []).map((p) => (
                <div key={p.id} className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("วิธีรับชำระ")}</span>
                    <div className={styles.metaValue}>
                      {salesInvoicePaymentMethodLabel(p.paymentMethod, lang)}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("จำนวนเงิน")}</span>
                    <div className={styles.metaValue}>
                      {formatMoney(p.amount)}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("วันที่รับชำระ")}</span>
                    <div className={styles.metaValue}>
                      {formatDate(p.paidAt)}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("เลขที่ใบรับชำระ")}</span>
                    <div className={styles.metaValue}>
                      {p.arReceiptId && p.receiptNo ? (
                        <Link href={arReceiptRoutes.detail(p.arReceiptId)}>
                          {p.receiptNo}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("อ้างอิง")}</span>
                    <div className={styles.metaValue}>
                      {p.transactionRef || "—"}
                    </div>
                  </div>
                </div>
              ))}

              <div className={styles.attachmentBlock}>
                <div className={styles.attachmentHead}>
                  <strong>{t("หลักฐานการชำระเงิน")}</strong>
                </div>
                {attachmentsQuery.isLoading ? (
                  <Spin size="small" />
                ) : paymentAttachments.length === 0 ? (
                  <p className={styles.attachmentEmpty}>
                    {t("ยังไม่มีหลักฐาน")}
                  </p>
                ) : (
                  <ul className={styles.attachmentList}>
                    {paymentAttachments.map((file) => (
                      <li key={file.id} className={styles.attachmentItem}>
                        <div className={styles.attachmentMeta}>
                          <span className={styles.attachmentName}>
                            {attachmentDisplayName(file)}
                          </span>
                          {file.description ? (
                            <span className={styles.attachmentDesc}>
                              {file.description}
                            </span>
                          ) : null}
                        </div>
                        <div className={styles.attachmentActions}>
                          {isPreviewableAttachment(file) ? (
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => void openAttachmentPreview(file)}
                            >
                              {t("ดู")}
                            </Button>
                          ) : null}
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => void downloadAttachment(file)}
                          >
                            {t("ดาวน์โหลด")}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          <ArInvoiceDeliveriesCard invoice={data} canEdit={canEdit} />

          </DocumentPaper>
          <ESignatureHistoryCard documentId={data.id} style={{ marginTop: 16 }} />
        </section>
      </div>

      <Modal
        open={cancelOpen}
        title={t("ยกเลิกใบแจ้งหนี้")}
        okText={t("ยกเลิกเอกสาร")}
        cancelText={t("ปิด")}
        okButtonProps={{
          danger: true,
          disabled: cancelReason.trim().length < 5,
        }}
        confirmLoading={cancelMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => {
          setCancelOpen(false);
          setCancelReason("");
        }}
        onOk={async () => {
          const reason = cancelReason.trim();
          if (reason.length < 5) {
            message.warning(t("กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร"));
            return;
          }
          try {
            await cancelMutation.mutateAsync({
              id: data.id,
              reason,
            });
          } catch {
            return; // hook แจ้ง error แล้ว — ค้าง modal ไว้
          }
          setCancelOpen(false);
          setCancelReason("");
          router.push(arRoutes.list);
        }}
      >
        <p>{t("ยกเลิกได้เฉพาะใบแจ้งหนี้ที่ยังไม่รับชำระ")}</p>
        <Input.TextArea
          value={cancelReason}
          rows={3}
          maxLength={500}
          placeholder={t("เหตุผลการยกเลิก (อย่างน้อย 5 ตัวอักษร)")}
          onChange={(event) => setCancelReason(event.target.value)}
          status={
            cancelReason.length > 0 && cancelReason.trim().length < 5
              ? "error"
              : undefined
          }
        />
      </Modal>

      <Modal
        title={previewTitle || t("ตัวอย่างไฟล์")}
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
        footer={null}
        width={previewIsImage ? 720 : 900}
      >
        {previewLoading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Spin />
          </div>
        ) : previewIsImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={previewTitle}
            className={styles.previewImage}
          />
        ) : previewUrl ? (
          <iframe
            title={previewTitle}
            src={previewUrl}
            className={styles.previewFrame}
          />
        ) : null}
      </Modal>
    </div>
  );
}
