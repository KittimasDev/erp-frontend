"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Table,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile, UploadProps } from "antd";
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
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelSalesInvoiceMutation,
  useConfirmSalesInvoiceMutation,
  useReceiveSalesInvoicePaymentMutation,
  useUploadSalesInvoicePaymentAttachmentMutation,
} from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import {
  useSalesInvoicePaymentAttachmentsQuery,
  useSalesInvoiceQuery,
} from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { ApiError } from "@/lib/api/client";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { DocumentAttachment } from "@/types/document-attachments";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { SalesInvoice, SalesInvoiceItem } from "@/types/sales-invoices";
import {
  salesInvoicePaymentMethodLabel,
  salesInvoicePaymentStatusLabel,
  salesInvoiceStatusLabel,
} from "@/types/sales-invoices";
import { vatAmountLabelT } from "@/types/purchase-orders";
import { resolveVatMode, VAT_MODE_LABEL } from "@/lib/money/vat-totals";
import styles from "./SalesInvoiceDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
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
    case "CANCELLED":
      return styles.statusCancelled;
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
    return (
      <div className={styles.stateCard}>
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบใบแจ้งหนี้")}
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-invoices">{t("กลับรายการ")}</Link>
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
  const receiveMutation = useReceiveSalesInvoicePaymentMutation();
  const cancelMutation = useCancelSalesInvoiceMutation();
  const uploadAttachmentMutation =
    useUploadSalesInvoicePaymentAttachmentMutation();
  const attachmentsQuery = useSalesInvoicePaymentAttachmentsQuery(data.id);
  const paymentAttachments = attachmentsQuery.data?.data ?? [];

  const [payOpen, setPayOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(false);
  const [payForm] = Form.useForm<{
    paymentMethod: string;
    amount: number;
    paidAt: dayjs.Dayjs;
    transactionRef?: string;
    remark?: string;
  }>();

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

  const invoiceActions = useScreenActionPermissions("SALES_INVOICES");
  const canEdit = invoiceActions.canEdit;
  const canApprove = invoiceActions.canApprove;
  const canWrite = canEdit || canApprove;

  const busy =
    confirmMutation.isPending ||
    receiveMutation.isPending ||
    cancelMutation.isPending ||
    uploadAttachmentMutation.isPending;

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
      deliveryOrderNo: data.deliveryOrder?.deliveryOrderNo ?? "—",
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
      vatRate: data.taxRate ? Number(data.taxRate.rate) : undefined,
      totalAmount: Number(data.totalAmount) || 0,
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

  const uploadPaymentProof = async (file: File, description?: string) => {
    const { optimizePaymentSlipFile } = await import(
      "@/utils/optimizePaymentSlipFile"
    );
    const optimized = await optimizePaymentSlipFile(file);
    await uploadAttachmentMutation.mutateAsync({
      documentId: data.id,
      file: optimized,
      description,
    });
  };

  const pendingUploadProps: UploadProps = {
    multiple: true,
    accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*",
    fileList: pendingFiles,
    beforeUpload: (file) => {
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        message.error(t("รองรับเฉพาะ PDF และรูป JPG/PNG/WEBP"));
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        message.error(t("ขนาดไฟล์ต้องไม่เกิน 20MB"));
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: ({ fileList }) => {
      setPendingFiles(fileList);
    },
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
            onClick={() => router.push("/sales-invoices")}
          >
            {t("กลับ")}
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            {t("พิมพ์ PDF")}
          </Button>
          {canWrite && data.status === "DRAFT" ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/sales-invoices/${data.id}/edit`)}
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
              onClick={() => {
                modal.confirm({
                  title: t("ยกเลิกใบแจ้งหนี้?"),
                  content: t("ยกเลิกได้เฉพาะใบแจ้งหนี้ที่ยังไม่รับชำระ"),
                  okText: t("ยกเลิกเอกสาร"),
                  okButtonProps: { danger: true },
                  cancelText: t("ปิด"),
                  onOk: async () => {
                    await cancelMutation.mutateAsync(data.id);
                    router.push("/sales-invoices");
                  },
                });
              }}
            >
              Cancel
            </Button>
          ) : null}
          {canWrite &&
          data.status === "POSTED" &&
          (data.paymentStatus === "UNPAID" ||
            data.paymentStatus === "PARTIALLY_PAID") ? (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              loading={busy}
              onClick={() => {
                payForm.setFieldsValue({
                  paymentMethod: "TRANSFER",
                  amount: outstandingAmount,
                  paidAt: dayjs(),
                });
                setPendingFiles([]);
                setPayOpen(true);
              }}
            >
              {t("รับชำระ")}
            </Button>
          ) : null}
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
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
                  {data.deliveryOrderId ? (
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
                  {data.taxRate
                    ? `${data.taxRate.name} (${data.taxRate.rate}%)`
                    : t("ไม่คิด VAT")}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("หมายเหตุ")}</span>
                <div className={styles.metaValue}>{data.remark || "—"}</div>
              </div>
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
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>
                  {vatAmountLabelT(
                    data.taxRate ? Number(data.taxRate.rate) : undefined,
                  )}
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
                    {t("ยังไม่มีหลักฐาน — แนบได้ตอนรับชำระเงิน")}
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
        </section>
      </div>

      <Modal
        title={t("รับชำระเงิน")}
        open={payOpen}
        onCancel={() => {
          setPayOpen(false);
          setPendingFiles([]);
        }}
        okText={t("บันทึกรับชำระ")}
        confirmLoading={
          receiveMutation.isPending || uploadAttachmentMutation.isPending
        }
        onOk={async () => {
          const values = await payForm.validateFields();
          await receiveMutation.mutateAsync({
            id: data.id,
            body: {
              paymentMethod: values.paymentMethod,
              amount: values.amount,
              paidAt: values.paidAt.format("YYYY-MM-DD"),
              transactionRef: values.transactionRef?.trim() || undefined,
              remark: values.remark?.trim() || undefined,
            },
          });

          const filesToUpload = pendingFiles
            .map((f) => f.originFileObj)
            .filter((f): f is NonNullable<typeof f> => Boolean(f));
          for (const file of filesToUpload) {
            await uploadPaymentProof(
              file,
              `ยืนยันชำระ ${formatMoney(String(values.amount))} บาท`,
            );
          }

          setPendingFiles([]);
          setPayOpen(false);
        }}
      >
        <p>
          {t("ยอดคงค้าง:")} <strong>{formatMoney(String(outstandingAmount))}</strong>{" "}
          {t("บาท (จาก {total} บาท)", { total: formatMoney(data.totalAmount) })}
        </p>
        <Form form={payForm} layout="vertical">
          <Form.Item
            name="paymentMethod"
            label={t("วิธีรับชำระ")}
            rules={[{ required: true, message: t("เลือกวิธีรับชำระ") }]}
          >
            <Select
              options={[
                { value: "CASH", label: salesInvoicePaymentMethodLabel("CASH", lang) },
                { value: "TRANSFER", label: salesInvoicePaymentMethodLabel("TRANSFER", lang) },
                { value: "CHEQUE", label: salesInvoicePaymentMethodLabel("CHEQUE", lang) },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label={t("จำนวนเงินที่รับชำระ")}
            rules={[
              { required: true, message: t("ระบุจำนวนเงิน") },
              {
                validator: (_rule, value) =>
                  value > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error(t("จำนวนเงินต้องมากกว่า 0"))),
              },
              {
                validator: (_rule, value) =>
                  value <= outstandingAmount + 0.005
                    ? Promise.resolve()
                    : Promise.reject(new Error(t("รับชำระเกินยอดคงค้างไม่ได้"))),
              },
            ]}
          >
            <InputNumber
              min={0.01}
              max={outstandingAmount}
              precision={2}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="paidAt"
            label={t("วันที่รับชำระ")}
            rules={[{ required: true, message: t("ระบุวันที่") }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="transactionRef" label={t("เลขอ้างอิง")}>
            <Input placeholder={t("เช่น เลขโอน")} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            label={t("ไฟล์ยืนยันการชำระเงิน")}
            extra={t("รองรับ PDF / JPG / PNG / WEBP ไม่เกิน 20MB — อัปโหลดหลังบันทึกรับชำระ")}
          >
            <Upload {...pendingUploadProps}>
              <Button icon={<UploadOutlined />}>{t("เลือกไฟล์")}</Button>
            </Upload>
          </Form.Item>
        </Form>
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
