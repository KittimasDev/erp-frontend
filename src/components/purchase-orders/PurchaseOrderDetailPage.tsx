"use client";

import { vatAmountLabelT, tStatus } from "@/types/purchase-orders";
import { getStoredLanguage } from "@/lib/i18n/language";
import { tNow, useT, type TFunction } from "@/lib/i18n/useT";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPurchaseOrderBackHref } from "@/lib/navigation/purchase-order-list-return";
import { App, Button, Descriptions, Input, Modal, Spin, Table, Tag, Typography, Upload } from "antd";
import type { UploadProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  PaperClipOutlined,
  RollbackOutlined,
  SendOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useApprovePurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useRejectPurchaseOrderMutation,
  useReturnPurchaseOrderToDraftMutation,
  useSubmitPurchaseOrderMutation,
  useUploadPurchaseOrderAttachmentMutation,
} from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import {
  canAccessPurchaseOrderApprovals,
  usePurchaseOrderAttachmentsQuery,
  usePurchaseOrderQuery,
} from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { usePurchasePaymentByPoQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import DocumentHtmlView from "@/components/common/DocumentHtmlView";
import { documentHtmlIsEmpty } from "@/lib/html/sanitize-document-html";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { ApiError } from "@/lib/api/client";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import { getPoDeliverySchedules } from "@/lib/api/po-delivery-schedules";
import { usePoDeliverySchedulesQuery } from "@/hooks/po-delivery-schedules/usePoDeliverySchedulesQuery";
import {
  isPoScheduleOpen,
  type PoDeliverySchedule,
} from "@/types/po-delivery-schedules";
import type { DocumentAttachment } from "@/types/document-attachments";
import {
  isPoReceivableStatus,
  listPurchaseRequests,
  PO_CHARGE_TYPE_LABEL,
  purchaseOrderStatusColor,
  purchaseOrderStatusLabel,
  type PoPaymentAdjustmentItem,
} from "@/types/purchase-orders";
import { AP_DOCUMENT_CONFIG } from "@/components/ap-documents/apDocumentConfig";
import {
  calcDocumentTotals,
  resolveVatMode,
  VAT_MODE_LABEL,
  resolveDocumentVatPercent,

  withVatPercentLabel,
  withholdingTaxTypeLabel,
} from "@/lib/money/vat-totals";
import { GOODS_RECEIPT_STATUS_LABEL } from "@/types/goods-receipts";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";
import { SUPPLIER_PAYMENT_STATUS_LABEL } from "@/types/purchase-payments";
import ProcurementFlowTimeline from "@/components/procurement/ProcurementFlowTimeline";
import PoDeliverySchedulesSection from "./PoDeliverySchedulesSection";
import styles from "./PurchaseOrderDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

/** ร่าง กับ ที่ถูกส่งกลับแก้ไข แก้ไข/ส่งอนุมัติ ได้เหมือนกัน — ตรงกับ guard ฝั่ง backend */
const PO_EDITABLE_STATUSES: string[] = ["DRAFT", "REVISING"];

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function buildAdjustmentColumns(
  t: TFunction,
): ColumnsType<PoPaymentAdjustmentItem> {
  return [
      {
        title: t("ลำดับ"),
        key: "seq",
        width: 64,
        align: "center",
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
  {
    title: t("ประเภท"),
    dataIndex: "docType",
    width: 110,
    render: (v: PoPaymentAdjustmentItem["docType"]) =>
      v === "CREDIT_NOTE" ? t("ใบลดหนี้") : t("ใบเพิ่มหนี้"),
  },
  {
    title: t("เลขที่เอกสาร"),
    dataIndex: "docNo",
    width: 180,
    render: (_v, row) => {
      const base =
        row.docType === "CREDIT_NOTE"
          ? AP_DOCUMENT_CONFIG.creditNote.basePath
          : AP_DOCUMENT_CONFIG.debitNote.basePath;
      return <Link href={`${base}/${row.id}`}>{row.docNo}</Link>;
    },
  },
  {
    title: t("วันที่"),
    dataIndex: "docDate",
    width: 120,
    render: (v: string) => formatDate(v),
  },
  {
    title: t("อ้างอิง AP"),
    dataIndex: "apDocumentNo",
    width: 160,
    render: (_v, row) => (
      <Link href={`${AP_DOCUMENT_CONFIG.invoice.basePath}/${row.apDocumentId}`}>
        {row.apDocumentNo}
      </Link>
    ),
  },
  {
    title: t("ยอด (บาท)"),
    dataIndex: "signedAmount",
    align: "right",
    width: 120,
    render: (v: number) => formatMoney(v),
  },
  ];
}
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formatCreatorContact(user?: {
  displayName?: string;
  departmentName?: string;
}) {
  const name = user?.displayName?.trim();
  if (!name) {
    return "—";
  }
  const department = user?.departmentName?.trim();
  return department ? `${name} (${department})` : name;
}

function formatDate(value?: string) {
  if (!value) return "—";
  // วันที่ทั้งหน้าใช้ปี พ.ศ. เหมือนหน้า AP / รายการจ่ายเงิน (แสดงผลเท่านั้น ไม่แก้ค่าที่เก็บ) เช่น 2026-12-15 → 15/12/2569
  const day = dayjs(value);
  if (!day.isValid()) return "—";
  return day.format("DD/MM/BBBB");
}

/** หัวรอบใน PDF ใช้ปี พ.ศ. เช่น 09/10/2569 */
function formatBuddhistDate(value?: string) {
  if (!value) return "—";
  const day = dayjs(value);
  if (!day.isValid()) return "—";
  return day.format("DD/MM/BBBB");
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const day = dayjs(value);
  if (!day.isValid()) return "—";
  return day.format("DD/MM/BBBB HH:mm");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toPdfDeliveryRounds(schedules: PoDeliverySchedule[]) {
  return [...schedules]
    .filter((schedule) => schedule.status !== "CANCELLED")
    .sort((a, b) => a.roundNo - b.roundNo)
    .map((schedule) => {
      const originalDay = schedule.originalDeliveryDate
        ? dayjs(schedule.originalDeliveryDate).format("YYYY-MM-DD")
        : undefined;
      const currentDay = dayjs(schedule.deliveryDate).format("YYYY-MM-DD");
      const postponed = !!originalDay && originalDay !== currentDay;
      return {
        roundNo: schedule.roundNo,
        deliveryDate: formatBuddhistDate(schedule.effectiveDeliveryDate),
        originalDeliveryDate: postponed
          ? formatBuddhistDate(schedule.originalDeliveryDate)
          : undefined,
        items: schedule.items
          .filter((item) => Number(item.quantity) > 0)
          .map((item) => ({
            itemCode: item.itemCode ?? "—",
            itemName: item.itemNameTh ?? "—",
            qty: Number(item.quantity) || 0,
            unit: item.unitCode ?? "—",
          })),
      };
    })
    .filter((round) => round.items.length > 0);
}

function hasOpenReceivableQty(schedules: PoDeliverySchedule[]) {
  return schedules.some(
    (schedule) =>
      isPoScheduleOpen(schedule.status) &&
      schedule.items.some((item) => Number(item.remainingQuantity) > 0.0005),
  );
}

function isImageMime(mimeType?: string) {
  return Boolean(mimeType?.startsWith("image/"));
}

function attachmentDisplayName(file: DocumentAttachment) {
  return file.originalFileName || tNow("ไฟล์แนบ");
}

export default function PurchaseOrderDetailPage({ id }: Props) {
  const t = useT();
  const router = useRouter();
  const { modal, message } = App.useApp();
  const query = usePurchaseOrderQuery(id);
  const attachmentsQuery = usePurchaseOrderAttachmentsQuery(id);
  const schedulesQuery = usePoDeliverySchedulesQuery(id);
  const submitMutation = useSubmitPurchaseOrderMutation();
  const approveMutation = useApprovePurchaseOrderMutation();
  const rejectMutation = useRejectPurchaseOrderMutation();
  const returnMutation = useReturnPurchaseOrderToDraftMutation();
  const cancelMutation = useCancelPurchaseOrderMutation();
  const uploadMutation = useUploadPurchaseOrderAttachmentMutation();

  // modal เหตุผลของฝั่งอนุมัติ — ใช้ทั้งปฏิเสธและส่งกลับแก้ไข
  const [reviewAction, setReviewAction] = useState<"reject" | "return" | null>(
    null,
  );
  const [reviewReason, setReviewReason] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfLockRef = useRef(false);

  const data = query.data?.data;
  /* ใบสั่งซื้อหนึ่งใบรวมใบขอซื้อได้หลายใบ — แสดงให้ครบ ไม่ใช่แค่ใบแรก */
  const sourcePurchaseRequests = data ? listPurchaseRequests(data) : [];
  const vatMode = resolveVatMode(data?.vatMode);
  const vatPercent = resolveDocumentVatPercent({ vatMode });
  const totals = useMemo(
    () =>
      calcDocumentTotals(
        (data?.items ?? []).map((item) => Number(item.amount) || 0),
        Number(data?.discountAmount) || 0,
        vatMode,
        vatPercent,
      ),
    [data?.items, data?.discountAmount, vatMode, vatPercent],
  );
  /*
    ค่าใช้จ่ายเพิ่มเติม + ยอดรวม PO อ่านจาก backend (หัวเอกสารรวมค่าใช้จ่ายแล้ว)
    ส่วน totals ด้านบนคือ "ค่าสินค้า" ที่คิดจากบรรทัดสินค้า ตรงกับส่วนสินค้าที่ backend เก็บ
  */
  const charges = data?.charges ?? [];
  const chargeAmount = Number(data?.extraChargesAmount) || 0;
  const chargeVat = Number(data?.extraChargesVat) || 0;
  const grandTotal = data ? Number(data.totalAmount) || 0 : 0;
  const attachments = attachmentsQuery.data?.data ?? [];
  // Matrix เป็นตัวตัดสินอย่างเดียว — ไม่ OR role ทับ ไม่งั้นคนที่ไม่ได้ติ๊กสิทธิ์ก็ยังกดได้
  // (admin `*` และโหมด legacy คืน all-true จาก getScreenActionPermissions อยู่แล้ว)
  // ใช้ hook ไม่ใช่ getter เพื่อให้ปุ่มอัปเดตทันทีเมื่อแอดมิน save matrix
  const poActions = useScreenActionPermissions("PURCHASE_ORDERS");
  const canWrite = poActions.canEdit;
  // backend ให้ยกเลิกด้วย PURCHASE_ORDERS.EDIT ไม่ได้จำกัดแค่หัวหน้า
  const canCancel = poActions.canEdit;
  // อนุมัติ PO = หัวหน้าจัดซื้อ (คนละสิทธิ์กับคนสร้าง PO)
  const canApprove = canAccessPurchaseOrderApprovals();
  // รับของเป็นงานของหน้าอื่น — ใช้สิทธิ์ของหน้านั้นตัดสิน แล้วพาไปทำที่หน้านั้น
  const receiveActions = useScreenActionPermissions("GOODS_RECEIPTS");
  const canReceive = receiveActions.canAdd;
  const canUploadAttachment =
    canWrite &&
    (PO_EDITABLE_STATUSES.includes(data?.status ?? "") ||
      data?.status === "PENDING_APPROVAL" ||
      data?.status === "CONFIRMED");

  const grByPoQuery = useGoodsReceiptsByPoQuery(data ? data.id : undefined);
  const linkedGrs = grByPoQuery.data?.data ?? [];

  const paymentByPoQuery = usePurchasePaymentByPoQuery(data?.id);
  const linkedPayment = paymentByPoQuery.data?.data ?? null;
  const paymentHref = linkedPayment
    ? linkedPayment.queueItemId
      ? `/finance/payables/payment-vouchers/${linkedPayment.id}`
      : `/purchase-payments/${linkedPayment.id}`
    : null;
  const schedules = schedulesQuery.data?.data ?? [];
  const canShowReceive =
    canReceive &&
    isPoReceivableStatus(data?.status ?? "") &&
    (schedulesQuery.isLoading || hasOpenReceivableQty(schedules));

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewTitle("");
    setPreviewIsImage(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
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
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("ดาวน์โหลดไฟล์ไม่สำเร็จ"),
      );
    }
  };

  const openAttachmentPreview = async (file: DocumentAttachment) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewTitle(attachmentDisplayName(file));
    setPreviewIsImage(isImageMime(file.mimeType));
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
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

  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*",
    beforeUpload: (file) => {
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        message.error(t("รองรับเฉพาะ PDF และรูป JPG/PNG/WEBP"));
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        message.error(t("ขนาดไฟล์ต้องไม่เกิน 20MB"));
        return Upload.LIST_IGNORE;
      }
      if (!data) {
        return Upload.LIST_IGNORE;
      }
      void uploadMutation.mutateAsync({ documentId: data.id, file });
      return false;
    },
  };

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
        {t("ไม่พบใบสั่งซื้อ")}
        <div style={{ marginTop: 12 }}>
          <Link
            href="/purchase-orders"
            onClick={(event) => {
              event.preventDefault();
              router.push(getPurchaseOrderBackHref());
            }}
          >
            {t("กลับรายการ")}
          </Link>
        </div>
      </div>
    );
  }

  const busy =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    returnMutation.isPending ||
    cancelMutation.isPending ||
    uploadMutation.isPending;

  const buildPurchaseOrderPdf = async () => {
    const { generatePurchaseOrderPdf } =
      await import("@/utils/generatePurchaseOrderPdf");
    let schedules = schedulesQuery.data?.data;
    if (!schedules) {
      const response = await getPoDeliverySchedules(getAccessToken(), data.id);
      schedules = response.data;
    }
    // ต้อง await + catch — ไม่งั้นสร้าง PDF พังแล้วเงียบสนิท ผู้ใช้กดปุ่มแล้วไม่มีอะไรเกิดขึ้น
    await generatePurchaseOrderPdf({
      poNo: data.poNo,
      poDate: formatDate(data.poDate),
      vendorName: data.creditor?.nameTh ?? "—",
      vendorCode: data.creditor?.creditorCode ?? "—",
      vendorTaxId: data.creditor?.taxId ?? "—",
      vendorAddress: data.creditor?.address ?? "—",
      vendorPhone: data.creditor?.contactPhone ?? "—",
      vendorContact: data.creditor?.contactName ?? "—",
      paymentTerm: data.paymentTerm?.name ?? "ไม่ระบุ",
      taxRateLabel: withVatPercentLabel(VAT_MODE_LABEL[vatMode], vatPercent),
      vatMode,
      vatRate: vatPercent,
      withholdingTaxLabel: withholdingTaxTypeLabel(
        data.withholdingTaxType,
        data.withholdingTaxPercent,
      ),
      paymentMethodLabel:
        (data.paymentMethod &&
          (SUPPLIER_PAYMENT_METHOD_LABEL[data.paymentMethod] ??
            data.paymentMethod)) ||
        "—",
      createdBy: formatCreatorContact(data.createdBy),
      createdByPhone: data.createdBy?.phone ?? "—",
      expectedDeliveryDate: formatDate(data.expectedDeliveryDate),
      remark: data.remark?.trim() || "",
      subtotalAmount: totals.subtotal,
      discountAmount: totals.discount,
      afterDiscount: totals.afterDiscount,
      vatAmount: totals.vat + chargeVat,
      totalAmount: grandTotal,
      charges: charges.map((c) => ({
        typeLabel: c.expenseTypeName ?? PO_CHARGE_TYPE_LABEL[c.chargeType] ?? c.chargeType,
        description: c.description,
        amountBeforeVat: Number(c.amountBeforeVat) || 0,
        vatAmount: Number(c.vatAmount) || 0,
      })),
      items: (data.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemNameTh ?? item.description ?? "—",
        unit: item.unitNameTh ?? item.unitCode ?? "—",
        qty: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        amount: Number(item.amount) || 0,
      })),
      deliveryRounds: toPdfDeliveryRounds(schedules ?? []),
    });
  };

  const printPdf = async () => {
    if (pdfLockRef.current) {
      return;
    }
    pdfLockRef.current = true;
    setPdfLoading(true);
    const hideLoading = message.loading(t("กำลังสร้าง PDF..."), 0);
    try {
      await buildPurchaseOrderPdf();
    } catch (error) {
      message.error(
        error instanceof Error
          ? t("สร้าง PDF ไม่สำเร็จ: {reason}", { reason: error.message })
          : t("สร้าง PDF ไม่สำเร็จ"),
      );
    } finally {
      if (typeof hideLoading === "function") {
        hideLoading();
      }
      pdfLockRef.current = false;
      setPdfLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Purchase Order"
        icon={<FileTextOutlined />}
        title={data.poNo}
        subtitle={<>{data.creditor?.nameTh ?? "—"} · {formatDate(data.poDate)} ·{" "}
            {t("{n} รายการ", { n: data.items?.length ?? 0 })}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(getPurchaseOrderBackHref())}
          >
            {t("กลับ")}
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={printPdf}
            loading={pdfLoading}
            disabled={pdfLoading}
          >
            {t("พิมพ์ PDF")}
          </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ข้อมูลเอกสาร")}</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่")}</span>
                <div className={styles.metaValue}>{data.poNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.poDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้ขาย")}</span>
                <div className={styles.metaValue}>
                  {data.creditor
                    ? `${data.creditor.creditorCode} — ${data.creditor.nameTh}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("อ้างอิง PR")}</span>
                <div className={styles.metaValue}>
                  {sourcePurchaseRequests.length
                    ? sourcePurchaseRequests.map((pr, index) => (
                        <span key={pr.id}>
                          {index > 0 ? " · " : null}
                          <Link href={`/purchase-requests/${pr.id}`}>
                            {pr.prNo}
                          </Link>
                        </span>
                      ))
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เงื่อนไขชำระ")}</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? t("ไม่ระบุ")}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("รูปแบบ VAT")}</span>
                <div className={styles.metaValue}>
                  {withVatPercentLabel(
                    t(VAT_MODE_LABEL[resolveVatMode(data.vatMode)]),
                    vatPercent,
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("อัตรา VAT")}</span>
                <div className={styles.metaValue}>
                  {vatPercent > 0 ? `${vatPercent}%` : t("ไม่คิด VAT")}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ภาษีหัก ณ ที่จ่าย")}</span>
                <div className={styles.metaValue}>
                  {t(
                    withholdingTaxTypeLabel(
                      data.withholdingTaxType,
                      data.withholdingTaxPercent,
                    ),
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วิธีการชำระเงิน")}</span>
                <div className={styles.metaValue}>
                  {data.paymentMethod
                    ? t(
                        SUPPLIER_PAYMENT_METHOD_LABEL[data.paymentMethod] ??
                          data.paymentMethod,
                      )
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่ส่งมอบ")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.expectedDeliveryDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่กำหนดชำระเงิน")}</span>
                <div className={styles.metaValue}>
                  {(() => {
                    const aps = (data.apInvoices ?? []).filter((ap) => ap.dueDate);
                    if (aps.length > 0) {
                      return (
                        <div>
                          {aps.map((ap) => (
                            <div key={ap.id}>
                              <Link href={`/finance/payables/ap-invoices/${ap.id}`}>
                                {ap.docNo}
                              </Link>
                              {" · "}
                              {formatDate(ap.dueDate ?? undefined)}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    const term = data.paymentTerm;
                    const days = Number(term?.creditDays ?? 0);
                    if (term?.termType === "CREDIT" && days > 0) {
                      const base = data.expectedDeliveryDate || data.poDate;
                      const due = dayjs(base).add(days, "day").format("YYYY-MM-DD");
                      return (
                        <div>
                          {formatDate(due)}
                          <div style={{ fontSize: 12, opacity: 0.65 }}>
                            {t(
                              "ประมาณการจาก {base} + {days} วัน · ยืนยันเมื่อตั้งหนี้ (นับจากวันที่ใบแจ้งหนี้ Supplier)",
                              {
                                base: data.expectedDeliveryDate
                                  ? t("วันส่งมอบ")
                                  : t("วันที่ PO"),
                                days,
                              },
                            )}
                          </div>
                        </div>
                      );
                    }
                    return "—";
                  })()}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้จัดทำ")}</span>
                <div className={styles.metaValue}>
                  {formatCreatorContact(data.createdBy)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เบอร์โทรผู้จัดทำ")}</span>
                <div className={styles.metaValue}>
                  {data.createdBy?.phone || "—"}
                </div>
              </div>
            </div>
          </div>

          <PoDeliverySchedulesSection
            purchaseOrderId={data.id}
            canManage={canWrite}
          />

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการสินค้า")}</h2>
            </div>
            <div className={styles.itemList}>
              {(data.items ?? []).map((item, index) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>
                      {item.itemNameTh ?? item.description ?? "—"}
                    </p>
                    <p className={styles.itemCode}>
                      {item.itemCode ?? "—"} · {t("ราคา")}{" "}
                      {formatMoney(item.unitPrice)}
                    </p>
                    <div className={styles.itemMeta}>
                      <span>
                        {t("คลังปลายทาง:")}{" "}
                        {item.expectedWarehouseCode ||
                        item.expectedWarehouseName
                          ? `${item.expectedWarehouseCode ?? ""}${
                              item.expectedWarehouseCode &&
                              item.expectedWarehouseName
                                ? " — "
                                : ""
                            }${item.expectedWarehouseName ?? ""}`
                          : t("ระบุตอนรับของ")}
                      </span>
                      {item.expectedLocationCode ||
                      item.expectedLocationName ? (
                        <span>
                          {t("ตำแหน่ง:")} {item.expectedLocationCode ?? ""}
                          {item.expectedLocationCode &&
                          item.expectedLocationName
                            ? " — "
                            : ""}
                          {item.expectedLocationName ?? ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>{formatMoney(item.amount)}</strong>
                    <span>
                      {Number(item.quantity).toLocaleString("th-TH")}{" "}
                      {item.unitNameTh ?? item.unitCode ?? ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {charges.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("ค่าใช้จ่ายเพิ่มเติม")}</h2>
              </div>
              <div className={styles.itemList}>
                {charges.map((c, index) => (
                  <div key={c.id} className={styles.itemCard}>
                    <div className={styles.itemIndex}>{index + 1}</div>
                    <div className={styles.itemBody}>
                      <p className={styles.itemName}>
                        {c.expenseTypeName ??
                          t(PO_CHARGE_TYPE_LABEL[c.chargeType] ?? c.chargeType)}
                        {" — "}
                        {c.description}
                      </p>
                      <p className={styles.itemCode}>
                        {t(VAT_MODE_LABEL[resolveVatMode(c.vatMode)])}
                        {" · "}
                        {t("ก่อน VAT")} {formatMoney(c.amountBeforeVat)}
                        {Number(c.taxRatePercent) > 0
                          ? ` · VAT ${Number(c.taxRatePercent)}% = ${formatMoney(c.vatAmount)}`
                          : ` · ${t("ไม่มี VAT")}`}
                        {c.whtApplicable
                          ? ` · ${t("หัก ณ ที่จ่าย")} ${Number(c.whtRate)}%${c.whtIncomeType ? ` (${c.whtIncomeType})` : ""}`
                          : ""}
                      </p>
                      <div className={styles.itemMeta}>
                        <span>
                          {t("ตั้งหนี้แล้ว (ก่อน VAT):")}{" "}
                          {formatMoney(c.allocatedAmount)}
                        </span>
                        <span>
                          {t("คงเหลือตั้งหนี้ได้:")}{" "}
                          {formatMoney(c.remainingAmount)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.itemQty}>
                      <strong>{formatMoney(c.totalAmount)}</strong>
                      <span>{t("รวม VAT")}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className={styles.sectionHint}>
                {t("ค่าใช้จ่ายไม่เข้าสต๊อก/Lot — นำไปตั้งหนี้ได้ที่หน้าใบตั้งหนี้เจ้าหนี้ (แบ่งยอดได้หลายใบ)")}
              </p>
            </div>
          ) : null}

          {documentHtmlIsEmpty(data.remark) ? null : (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("หมายเหตุ")}</h2>
              </div>
              <DocumentHtmlView html={data.remark} />
            </div>
          )}

          {data.paymentAdjustment ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("สรุปการชำระเงินและการปรับหนี้")}</h2>
              </div>
              <p className={styles.sectionHint}>
                {t("ยอดสุทธิของใบสั่งซื้อด้านขวาเป็นมูลค่า PO ต้นฉบับ — ส่วนนี้แสดงยอดเจ้าหนี้หลังรวมใบเพิ่มหนี้/ลดหนี้ที่นำไปปรับ AP แล้ว")}
              </p>
              <Descriptions
                bordered
                size="small"
                column={{ xs: 1, md: 2, xl: 3 }}
                style={{ marginBottom: 12 }}
              >
                <Descriptions.Item label={t("ยอด PO เดิม")}>
                  {formatMoney(data.paymentAdjustment.originalAmount)}
                </Descriptions.Item>
                <Descriptions.Item label={t("ยอดใบเพิ่มหนี้ (+)")}>
                  {formatMoney(data.paymentAdjustment.appliedDebits)}
                </Descriptions.Item>
                <Descriptions.Item label={t("ยอดใบลดหนี้ (−)")}>
                  {formatMoney(data.paymentAdjustment.appliedCredits)}
                </Descriptions.Item>
                <Descriptions.Item label={t("ยอดที่ต้องชำระหลังปรับหนี้")}>
                  <Typography.Text strong>
                    {formatMoney(data.paymentAdjustment.payableAmount)}
                  </Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label={t("ยอดชำระแล้ว")}>
                  {formatMoney(data.paymentAdjustment.paidAmount)}
                </Descriptions.Item>
                <Descriptions.Item label={t("ยอดคงเหลือ")}>
                  <Typography.Text strong>
                    {formatMoney(data.paymentAdjustment.remainingAmount)}
                  </Typography.Text>
                </Descriptions.Item>
              </Descriptions>
              <Table<PoPaymentAdjustmentItem>
                size="small"
                rowKey={(row) => `${row.id}-${row.apDocumentId}-${row.appliedAt}`}
                pagination={false}
                locale={{ emptyText: t("ยังไม่มีเอกสารปรับหนี้ที่นำไปปรับ AP ของใบสั่งซื้อนี้") }}
                dataSource={data.paymentAdjustment.adjustments}
                columns={buildAdjustmentColumns(t)}
                scroll={{ x: 720 }}
              />
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                <PaperClipOutlined /> {t("ใบเสนอราคา / ไฟล์แนบ")}
              </h2>
            </div>
            {attachmentsQuery.isLoading ? (
              <div className={styles.textBlock}>
                <Spin size="small" /> {t("กำลังโหลดไฟล์แนบ...")}
              </div>
            ) : attachments.length === 0 ? (
              <p className={styles.textBlock}>{t("ยังไม่มีไฟล์แนบใบเสนอราคา")}</p>
            ) : (
              <ul className={styles.attachmentList}>
                {attachments.map((file) => (
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
                      {(isImageMime(file.mimeType) ||
                        file.mimeType === "application/pdf") && (
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => void openAttachmentPreview(file)}
                        >
                          {t("ดู")}
                        </Button>
                      )}
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
            {canUploadAttachment ? (
              <Upload {...uploadProps}>
                <Button
                  icon={<UploadOutlined />}
                  loading={uploadMutation.isPending}
                  style={{ marginTop: 10 }}
                >
                  {t("อัปโหลดใบเสนอราคา")}
                </Button>
              </Upload>
            ) : null}
            {canUploadAttachment ? (
              <p className={styles.sectionHint}>
                {t("รองรับ PDF และรูป JPG/PNG/WEBP ขนาดไม่เกิน 20MB")}
              </p>
            ) : null}
          </div>
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.poNo}</h2>
          </div>
          <div>
            <Tag color={purchaseOrderStatusColor(data.status)}>
              {tStatus(purchaseOrderStatusLabel(data))}
            </Tag>
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("ยอดรวมก่อนส่วนลด")}</span>
              <strong>{formatMoney(totals.subtotal)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ส่วนลดท้ายบิล")}</span>
              <strong>{formatMoney(totals.discount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ยอดหลังหักส่วนลด")}</span>
              <strong>{formatMoney(totals.afterDiscount)}</strong>
            </div>
            {chargeAmount > 0 ? (
              <div className={styles.sideRow}>
                <span>{t("ค่าใช้จ่ายเพิ่มเติม (ก่อน VAT)")}</span>
                <strong>{formatMoney(chargeAmount)}</strong>
              </div>
            ) : null}
            <div className={styles.sideRow}>
              <span>
                {chargeAmount > 0
                  ? t("VAT รวม (สินค้า + ค่าใช้จ่าย)")
                  : vatAmountLabelT(vatPercent)}
              </span>
              <strong>{formatMoney(totals.vat + chargeVat)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ยอดรวม PO")}</span>
              <strong>{formatMoney(grandTotal)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ไฟล์แนบ")}</span>
              <strong>{attachments.length}</strong>
            </div>
            {data.submittedAt ? (
              <div className={styles.sideRow}>
                <span>{t("ส่งอนุมัติเมื่อ")}</span>
                <strong>{formatDateTime(data.submittedAt)}</strong>
              </div>
            ) : null}
            {data.approvedBy ? (
              <div className={styles.sideRow}>
                <span>
                  {data.status === "REJECTED"
                    ? t("ผู้ไม่อนุมัติ")
                    : t("ผู้อนุมัติ")}
                </span>
                <strong>{data.approvedBy.displayName}</strong>
              </div>
            ) : null}
            {data.approvedAt ? (
              <div className={styles.sideRow}>
                <span>
                  {data.status === "REJECTED"
                    ? t("ไม่อนุมัติเมื่อ")
                    : t("อนุมัติเมื่อ")}
                </span>
                <strong>{formatDateTime(data.approvedAt)}</strong>
              </div>
            ) : null}
          </div>

          {data.rejectedReason ? (
            <div className={styles.flowNote}>
              <strong>
                {data.status === "REJECTED"
                  ? t("เหตุผลที่ไม่อนุมัติ")
                  : t("หัวหน้าส่งกลับให้แก้ไข")}
              </strong>
              <p style={{ margin: "6px 0 0" }}>{data.rejectedReason}</p>
            </div>
          ) : null}

          <div className={styles.actionStack}>
            <Button
              className={styles.secondaryBtn}
              icon={<FilePdfOutlined />}
              onClick={printPdf}
              loading={pdfLoading}
              disabled={pdfLoading}
            >
              {t("พิมพ์ PDF สั่งซื้อ")}
            </Button>

            {canWrite && PO_EDITABLE_STATUSES.includes(data.status) ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<SendOutlined />}
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: t("ส่งใบสั่งซื้อให้หัวหน้าอนุมัติ?"),
                      content:
                        t("ส่งแล้วจะแก้ไขไม่ได้จนกว่าหัวหน้าจะส่งกลับให้แก้ไข"),
                      okText: t("ส่งอนุมัติ"),
                      cancelText: t("ยกเลิก"),
                      onOk: () => submitMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("ส่งอนุมัติ")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/purchase-orders/${data.id}/edit`)
                  }
                >
                  {t("แก้ไข")}
                </Button>
              </>
            ) : null}

            {data.status === "PENDING_APPROVAL" && canApprove ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: t("อนุมัติใบสั่งซื้อนี้?"),
                      content:
                        t("อนุมัติแล้วจะส่ง PO ให้ผู้ขายและรอส่งสินค้า — แก้ไขไม่ได้อีก"),
                      okText: t("อนุมัติ"),
                      cancelText: t("ยกเลิก"),
                      onOk: () => approveMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("อนุมัติใบสั่งซื้อ")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<RollbackOutlined />}
                  loading={busy}
                  onClick={() => {
                    setReviewAction("return");
                    setReviewReason("");
                  }}
                >
                  {t("ส่งกลับแก้ไข")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={busy}
                  onClick={() => {
                    setReviewAction("reject");
                    setReviewReason("");
                  }}
                >
                  {t("ไม่อนุมัติ")}
                </Button>
              </>
            ) : null}

            {data.status === "PENDING_APPROVAL" && !canApprove ? (
              <p className={styles.sectionHint}>
                {t(
                  "ส่งอนุมัติแล้ว — รอหัวหน้าจัดซื้อพิจารณาที่เมนู \"อนุมัติใบสั่งซื้อ\"",
                )}
              </p>
            ) : null}

            {canShowReceive ? (
              linkedGrs.some((gr) => gr.status === "DRAFT") ? (
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<InboxOutlined />}
                  onClick={() => {
                    const draft = [...linkedGrs]
                      .filter((gr) => gr.status === "DRAFT")
                      .sort((a, b) =>
                        String(b.createdAt ?? "").localeCompare(
                          String(a.createdAt ?? ""),
                        ),
                      )[0];
                    if (draft) {
                      router.push(`/goods-receipts/${draft.id}`);
                    }
                  }}
                >
                  {t("ไปใบรับของแบบร่าง")}
                </Button>
              ) : (
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<InboxOutlined />}
                  onClick={() =>
                    router.push(`/goods-receipts/create-from-po/${data.id}`)
                  }
                >
                  {t("สร้างใบรับของ")}
                </Button>
              )
            ) : null}

            {linkedPayment && paymentHref ? (
              <Button
                className={styles.secondaryBtn}
                icon={<DollarOutlined />}
                onClick={() => router.push(paymentHref)}
              >
                {t("ดูใบสำคัญจ่าย")}
                {linkedPayment.voucherNo ? ` ${linkedPayment.voucherNo}` : ""}
              </Button>
            ) : null}

            {canCancel &&
            (PO_EDITABLE_STATUSES.includes(data.status) ||
              data.status === "PENDING_APPROVAL" ||
              data.status === "CONFIRMED") ? (
              <Button
                className={styles.secondaryBtn}
                danger
                loading={busy}
                onClick={() =>
                  modal.confirm({
                    title: t("ยืนยันยกเลิกใบสั่งซื้อ?"),
                    onOk: () => cancelMutation.mutateAsync(data.id),
                  })
                }
              >
                {t("ยกเลิกเอกสาร")}
              </Button>
            ) : null}
          </div>

          {linkedGrs.length > 0 ? (
            <div className={styles.flowNote}>
              <strong>{t("ใบรับของที่อ้างอิง PO นี้")}</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {linkedGrs.map((gr) => {
                  const warehouses = Array.from(
                    new Map(
                      (gr.items ?? [])
                        .filter((line) => line.warehouse)
                        .map((line) => [
                          line.warehouseId,
                          `${line.warehouse?.warehouseCode ?? ""} — ${
                            line.warehouse?.warehouseName ?? ""
                          }`.trim(),
                        ]),
                    ).values(),
                  );
                  return (
                    <li key={gr.id}>
                      <Link href={`/goods-receipts/${gr.id}`}>{gr.grNo}</Link> ·{" "}
                      {tStatus(GOODS_RECEIPT_STATUS_LABEL[gr.status] ?? gr.status)} ·{" "}
                      {formatDate(gr.grDate)}
                      {warehouses.length > 0 ? (
                        <>
                          <br />
                          <span style={{ color: "#5c6570", fontSize: 12 }}>
                            {t("คลังที่รับเข้า:")} {warehouses.join(", ")}
                          </span>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {data.paymentStatus || data.paidAmount || data.paymentAdjustment ? (
            <div className={styles.flowNote}>
              <strong>{t("สถานะการจ่ายเงิน")}</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>
                  {data.paymentStatus === "PAID"
                    ? t("จ่ายครบแล้ว")
                    : data.paymentStatus === "PARTIAL"
                      ? t("จ่ายบางส่วน")
                      : t("ยังไม่จ่าย")}
                  {data.paymentAdjustment
                    ? ` · ${t("จ่ายแล้ว")} ${formatMoney(data.paymentAdjustment.paidAmount)} / ${formatMoney(data.paymentAdjustment.payableAmount)}`
                    : data.paidAmount != null
                      ? ` · ${t("จ่ายแล้ว")} ${formatMoney(data.paidAmount)} / ${formatMoney(data.totalAmount)}`
                      : null}
                </li>
              </ul>
            </div>
          ) : null}

          {linkedPayment && paymentHref ? (
            <div className={styles.flowNote}>
              <strong>{t("ใบสำคัญจ่าย")}</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>
                  <Link href={paymentHref}>{linkedPayment.voucherNo}</Link> ·{" "}
                  {tStatus(
                    SUPPLIER_PAYMENT_STATUS_LABEL[linkedPayment.status] ??
                      linkedPayment.status,
                  )}{" "}
                  · {formatDate(linkedPayment.voucherDate)} ·{" "}
                  {formatMoney(linkedPayment.totalAmount)}
                  {linkedPayment.queueItemId ? ` · ${t("จากระบบการเงิน")}` : null}
                </li>
              </ul>
            </div>
          ) : null}

          <ProcurementFlowTimeline
            input={{
              pr: data.purchaseRequest
                ? {
                    id: data.purchaseRequest.id,
                    prNo: data.purchaseRequest.prNo,
                    status: data.purchaseRequest.status,
                  }
                : null,
              po: {
                id: data.id,
                poNo: data.poNo,
                status: data.status,
                paymentStatus: data.paymentStatus,
              },
              goodsReceipts: linkedGrs.map((gr) => ({
                id: gr.id,
                grNo: gr.grNo,
                status: gr.status,
              })),
              payment: linkedPayment
                ? {
                    id: linkedPayment.id,
                    voucherNo: linkedPayment.voucherNo,
                    status: linkedPayment.status,
                  }
                : null,
            }}
          />
        </aside>
      </div>

      <Modal
        title={
          reviewAction === "reject"
            ? t("ไม่อนุมัติใบสั่งซื้อ")
            : t("ส่งกลับให้จัดซื้อแก้ไข")
        }
        open={Boolean(reviewAction)}
        onCancel={() => setReviewAction(null)}
        confirmLoading={rejectMutation.isPending || returnMutation.isPending}
        okText={
          reviewAction === "reject" ? t("ไม่อนุมัติ") : t("ส่งกลับแก้ไข")
        }
        cancelText={t("ยกเลิก")}
        okButtonProps={{ danger: reviewAction === "reject" }}
        onOk={async () => {
          if (!reviewAction) return;
          const body = { reason: reviewReason.trim() || undefined };
          if (reviewAction === "reject") {
            await rejectMutation.mutateAsync({ id: data.id, body });
          } else {
            await returnMutation.mutateAsync({ id: data.id, body });
          }
          setReviewAction(null);
        }}
      >
        <Input.TextArea
          rows={3}
          placeholder={
            reviewAction === "reject"
              ? t("เหตุผลที่ไม่อนุมัติ (ถ้ามี)")
              : t("สิ่งที่ต้องแก้ไข (ถ้ามี)")
          }
          value={reviewReason}
          onChange={(e) => setReviewReason(e.target.value)}
        />
      </Modal>

      <Modal
        open={previewOpen}
        title={previewTitle || t("ดูไฟล์แนบ")}
        onCancel={closePreview}
        footer={null}
        width={previewIsImage ? 720 : 900}
        destroyOnHidden
      >
        {previewLoading || !previewUrl ? (
          <div className={styles.stateCard}>
            <Spin /> {t("กำลังโหลดไฟล์...")}
          </div>
        ) : previewIsImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={previewTitle}
            className={styles.previewImage}
          />
        ) : (
          <iframe
            title={previewTitle}
            src={previewUrl}
            className={styles.previewFrame}
          />
        )}
      </Modal>
    </div>
  );
}
