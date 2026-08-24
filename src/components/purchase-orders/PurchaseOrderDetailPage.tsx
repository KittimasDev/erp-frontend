"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Modal, Spin, Upload } from "antd";
import type { UploadProps } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DownloadOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  PaperClipOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelPurchaseOrderMutation,
  useConfirmPurchaseOrderMutation,
  useUploadPurchaseOrderAttachmentMutation,
} from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import {
  usePurchaseOrderAttachmentsQuery,
  usePurchaseOrderQuery,
} from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { usePurchasePaymentByPoQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { ApiError } from "@/lib/api/client";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/auth/token";
import { RoleCode } from "@/lib/auth/role-codes";
import type { DocumentAttachment } from "@/types/document-attachments";
import { PURCHASE_ORDER_STATUS_LABEL } from "@/types/purchase-orders";
import { GOODS_RECEIPT_STATUS_LABEL } from "@/types/goods-receipts";
import { SUPPLIER_PAYMENT_STATUS_LABEL } from "@/types/purchase-payments";
import ProcurementFlowTimeline from "@/components/procurement/ProcurementFlowTimeline";
import styles from "./PurchaseOrderDetailPage.module.css";

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
    case "CONFIRMED":
    case "COMPLETED":
      return styles.statusApproved;
    case "PARTIALLY_RECEIVED":
      return styles.statusApproved;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

function isImageMime(mimeType?: string) {
  return Boolean(mimeType?.startsWith("image/"));
}

function attachmentDisplayName(file: DocumentAttachment) {
  return file.originalFileName || "ไฟล์แนบ";
}

export default function PurchaseOrderDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const query = usePurchaseOrderQuery(id);
  const attachmentsQuery = usePurchaseOrderAttachmentsQuery(id);
  const confirmMutation = useConfirmPurchaseOrderMutation();
  const cancelMutation = useCancelPurchaseOrderMutation();
  const uploadMutation = useUploadPurchaseOrderAttachmentMutation();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(false);

  const data = query.data?.data;
  const attachments = attachmentsQuery.data?.data ?? [];
  const canWrite =
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    isAdministrator();
  const canCancel =
    userHasRole(RoleCode.PROCUREMENT_MANAGER) || isAdministrator();
  const receiveActions = useScreenActionPermissions("PURCHASE_ORDERS_RECEIVE");
  const canReceive = isAdministrator() || receiveActions.canAdd;
  const canPay =
    userHasRole(RoleCode.ACCOUNTING_OFFICER) || isAdministrator();
  const canUploadAttachment =
    canWrite &&
    (data?.status === "DRAFT" || data?.status === "CONFIRMED");

  const grByPoQuery = useGoodsReceiptsByPoQuery(
    data ? data.id : undefined,
  );
  const linkedGrs = grByPoQuery.data?.data ?? [];

  const paymentByPoQuery = usePurchasePaymentByPoQuery(data?.id);
  const linkedPayment = paymentByPoQuery.data?.data ?? null;
  const isPaid =
    data?.paymentStatus === "PAID" || linkedPayment?.status === "PAID";

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
        error instanceof ApiError ? error.message : "ดาวน์โหลดไฟล์ไม่สำเร็จ",
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
        error instanceof ApiError ? error.message : "เปิดไฟล์ไม่สำเร็จ",
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
        message.error("รองรับเฉพาะ PDF และรูป JPG/PNG/WEBP");
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        message.error("ขนาดไฟล์ต้องไม่เกิน 20MB");
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
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบใบสั่งซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    uploadMutation.isPending;

  const printPdf = async () => {
    const { generatePurchaseOrderPdf } = await import(
      "@/utils/generatePurchaseOrderPdf"
    );
    generatePurchaseOrderPdf({
      poNo: data.poNo,
      poDate: formatDate(data.poDate),
      vendorName: data.creditor?.nameTh ?? "—",
      vendorCode: data.creditor?.creditorCode ?? "—",
      paymentTerm: data.paymentTerm?.name ?? "ไม่ระบุ",
      taxLabel: data.taxRate
        ? `${data.taxRate.name} (${data.taxRate.rate}%)`
        : "ไม่ระบุ",
      prNo: data.purchaseRequest?.prNo ?? "—",
      createdBy: data.createdBy?.displayName ?? "—",
      remark: data.remark?.trim() || "",
      subtotalAmount: Number(data.subtotalAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      vatAmount: Number(data.vatAmount) || 0,
      totalAmount: Number(data.totalAmount) || 0,
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
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Order</p>
          <h1 className={styles.pageTitle}>{data.poNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.creditor?.nameTh ?? "—"} · {formatDate(data.poDate)} ·{" "}
            {data.items?.length ?? 0} รายการ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/purchase-orders")}
          >
            กลับ
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            พิมพ์ PDF
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.poNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>{formatDate(data.poDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ขาย</span>
                <div className={styles.metaValue}>
                  {data.creditor
                    ? `${data.creditor.creditorCode} — ${data.creditor.nameTh}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อ้างอิง PR</span>
                <div className={styles.metaValue}>
                  {data.purchaseRequest ? (
                    <Link href={`/purchase-requests/${data.purchaseRequest.id}`}>
                      {data.purchaseRequest.prNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เงื่อนไขชำระ</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? "ไม่ระบุ"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ภาษี</span>
                <div className={styles.metaValue}>
                  {data.taxRate
                    ? `${data.taxRate.name} (${data.taxRate.rate}%)`
                    : "ไม่ระบุ"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
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
                      {item.itemCode ?? "—"} · ราคา{" "}
                      {formatMoney(item.unitPrice)}
                    </p>
                    <div className={styles.itemMeta}>
                      <span>
                        คลังปลายทาง:{" "}
                        {item.expectedWarehouseCode || item.expectedWarehouseName
                          ? `${item.expectedWarehouseCode ?? ""}${
                              item.expectedWarehouseCode &&
                              item.expectedWarehouseName
                                ? " — "
                                : ""
                            }${item.expectedWarehouseName ?? ""}`
                          : "ระบุตอนรับของ"}
                      </span>
                      {item.expectedLocationCode || item.expectedLocationName ? (
                        <span>
                          ตำแหน่ง: {item.expectedLocationCode ?? ""}
                          {item.expectedLocationCode && item.expectedLocationName
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

          {data.remark ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                <PaperClipOutlined /> ใบเสนอราคา / ไฟล์แนบ
              </h2>
            </div>
            {attachmentsQuery.isLoading ? (
              <div className={styles.textBlock}>
                <Spin size="small" /> กำลังโหลดไฟล์แนบ...
              </div>
            ) : attachments.length === 0 ? (
              <p className={styles.textBlock}>ยังไม่มีไฟล์แนบใบเสนอราคา</p>
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
                          ดู
                        </Button>
                      )}
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => void downloadAttachment(file)}
                      >
                        ดาวน์โหลด
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
                  อัปโหลดใบเสนอราคา
                </Button>
              </Upload>
            ) : null}
            {canUploadAttachment ? (
              <p className={styles.sectionHint}>
                รองรับ PDF และรูป JPG/PNG/WEBP ขนาดไม่เกิน 20MB
              </p>
            ) : null}
          </div>
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.poNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {PURCHASE_ORDER_STATUS_LABEL[data.status] ?? data.status}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>Subtotal</span>
              <strong>{formatMoney(data.subtotalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ส่วนลด</span>
              <strong>{formatMoney(data.discountAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>VAT</span>
              <strong>{formatMoney(data.vatAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>รวมทั้งสิ้น</span>
              <strong>{formatMoney(data.totalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ไฟล์แนบ</span>
              <strong>{attachments.length}</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            <Button
              className={styles.secondaryBtn}
              icon={<FilePdfOutlined />}
              onClick={printPdf}
            >
              พิมพ์ PDF สั่งซื้อ
            </Button>

            {canWrite && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busy}
                  onClick={() => confirmMutation.mutate(data.id)}
                >
                  Confirm ใบสั่งซื้อ
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/purchase-orders/${data.id}/edit`)
                  }
                >
                  แก้ไข
                </Button>
              </>
            ) : null}

            {canReceive &&
            (data.status === "CONFIRMED" ||
              data.status === "PARTIALLY_RECEIVED") ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<InboxOutlined />}
                onClick={() =>
                  router.push(`/purchase-orders/${data.id}/receive`)
                }
              >
                รับของ
              </Button>
            ) : null}

            {linkedPayment ? (
              <Button
                className={styles.secondaryBtn}
                icon={<DollarOutlined />}
                onClick={() =>
                  router.push(`/purchase-payments/${linkedPayment.id}`)
                }
              >
                ดูใบสำคัญจ่าย
                {linkedPayment.voucherNo ? ` ${linkedPayment.voucherNo}` : ""}
              </Button>
            ) : null}

            {canPay &&
            data.status === "COMPLETED" &&
            !isPaid &&
            !linkedPayment ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<DollarOutlined />}
                onClick={() =>
                  router.push(
                    `/purchase-payments/create-from-po/${data.id}`,
                  )
                }
              >
                จ่ายเงิน / สร้างใบสำคัญจ่าย
              </Button>
            ) : null}

            {canCancel &&
            (data.status === "DRAFT" || data.status === "CONFIRMED") ? (
              <Button
                className={styles.secondaryBtn}
                danger
                loading={busy}
                onClick={() =>
                  modal.confirm({
                    title: "ยืนยันยกเลิกใบสั่งซื้อ?",
                    onOk: () => cancelMutation.mutateAsync(data.id),
                  })
                }
              >
                ยกเลิกเอกสาร
              </Button>
            ) : null}
          </div>

          {linkedGrs.length > 0 ? (
            <div className={styles.flowNote}>
              <strong>ใบรับของที่อ้างอิง PO นี้</strong>
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
                      <Link href={`/goods-receipts/${gr.id}`}>
                        {gr.grNo}
                      </Link>{" "}
                      · {GOODS_RECEIPT_STATUS_LABEL[gr.status] ?? gr.status} ·{" "}
                      {formatDate(gr.grDate)}
                      {warehouses.length > 0 ? (
                        <>
                          <br />
                          <span style={{ color: "#5c6570", fontSize: 12 }}>
                            คลังที่รับเข้า: {warehouses.join(", ")}
                          </span>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {linkedPayment ? (
            <div className={styles.flowNote}>
              <strong>ใบสำคัญจ่าย</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>
                  <Link href={`/purchase-payments/${linkedPayment.id}`}>
                    {linkedPayment.voucherNo}
                  </Link>{" "}
                  ·{" "}
                  {SUPPLIER_PAYMENT_STATUS_LABEL[linkedPayment.status] ??
                    linkedPayment.status}{" "}
                  · {formatDate(linkedPayment.voucherDate)} ·{" "}
                  {formatMoney(linkedPayment.totalAmount)}
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
        open={previewOpen}
        title={previewTitle || "ดูไฟล์แนบ"}
        onCancel={closePreview}
        footer={null}
        width={previewIsImage ? 720 : 900}
        destroyOnHidden
      >
        {previewLoading || !previewUrl ? (
          <div className={styles.stateCard}>
            <Spin /> กำลังโหลดไฟล์...
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
