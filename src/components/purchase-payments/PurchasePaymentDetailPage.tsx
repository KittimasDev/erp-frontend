"use client";
import { Tag } from "antd";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, DatePicker, Form, Input, Modal, Spin, Upload } from "antd";
import type { UploadProps } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelPurchasePaymentMutation,
  useConfirmPurchasePaymentMutation,
  useDeletePurchasePaymentAttachmentMutation,
  useUploadPurchasePaymentAttachmentMutation,
} from "@/hooks/purchase-payments/usePurchasePaymentMutations";
import {
  usePurchasePaymentAttachmentsQuery,
  usePurchasePaymentQuery,
} from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import { usePurchaseOrderQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { ApiError } from "@/lib/api/client";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import { useLanguage } from "@/lib/i18n/language";
import { useT, tNow } from "@/lib/i18n/useT";
import { tStatus } from "@/types/purchase-orders";
import type { DocumentAttachment } from "@/types/document-attachments";
import type { SupplierPaymentVoucher } from "@/types/purchase-payments";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL, SUPPLIER_PAYMENT_STATUS_COLOR } from "@/types/purchase-payments";
import ProcurementFlowTimeline from "@/components/procurement/ProcurementFlowTimeline";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import styles from "./PurchasePaymentDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = {
  id: string;
  /** ลิงก์กลับหน้ารายการ */
  listHref?: string;
};

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


const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function isImageMime(mimeType?: string) {
  return Boolean(mimeType?.startsWith("image/"));
}

function attachmentDisplayName(file: DocumentAttachment) {
  return file.originalFileName || tNow("ไฟล์แนบ");
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB HH:mm");
}

function formatFileSize(value?: string | number) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PurchasePaymentDetailPage({
  id,
  listHref = "/purchase-payments",
}: Props) {
  const t = useT();
  const query = usePurchasePaymentQuery(id);
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
        {t("ไม่พบใบสำคัญจ่าย")}
        <div style={{ marginTop: 12 }}>
          <Link href={listHref}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  return <PurchasePaymentDetailView data={data} listHref={listHref} />;
}

function PurchasePaymentDetailView({
  data,
  listHref,
}: {
  data: SupplierPaymentVoucher;
  listHref: string;
}) {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { modal, message } = App.useApp();
  const confirmMutation = useConfirmPurchasePaymentMutation();
  const cancelMutation = useCancelPurchasePaymentMutation();
  const attachmentsQuery = usePurchasePaymentAttachmentsQuery(data.id);
  const uploadMutation = useUploadPurchasePaymentAttachmentMutation();
  const deleteAttachmentMutation = useDeletePurchasePaymentAttachmentMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(false);
  const [confirmForm] = Form.useForm<{
    paymentDate: dayjs.Dayjs;
    transactionRef?: string;
    remark?: string;
  }>();

  /**
   * ตรงกับ guard ฝั่ง backend ของ purchase-payments.controller
   * confirm จ่ายเงิน = PURCHASE_PAYMENTS_PENDING.APPROVE · ยกเลิกเอกสาร = .EDIT
   */
  const pendingActions = useScreenActionPermissions("PURCHASE_PAYMENTS_PENDING");
  const paymentActions = useScreenActionPermissions("PURCHASE_PAYMENTS");
  const canConfirmPayment = pendingActions.canApprove;
  const canCancelPayment = pendingActions.canEdit;
  const canManageAttachment =
    (pendingActions.canEdit || paymentActions.canEdit) &&
    data.status !== "CANCELLED";

  const poId = data.purchaseOrderId ?? data.purchaseOrder?.id;
  const poQuery = usePurchaseOrderQuery(poId);
  const po = poQuery.data?.data;
  const grByPoQuery = useGoodsReceiptsByPoQuery(poId);
  const linkedGrs = grByPoQuery.data?.data ?? [];
  const attachments = attachmentsQuery.data?.data ?? [];

  const busy =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    uploadMutation.isPending ||
    deleteAttachmentMutation.isPending;

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
      void uploadMutation.mutateAsync({ documentId: data.id, file });
      return false;
    },
  };

  const handlePrintPdf = async () => {
    setIsPrinting(true);
    try {
      const {
        generateSupplierPaymentVoucherPdf,
        mapSupplierPaymentVoucherToPdfData,
      } = await import("@/utils/generateSupplierPaymentVoucherPdf");
      await generateSupplierPaymentVoucherPdf(
        mapSupplierPaymentVoucherToPdfData(data),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t("พิมพ์ใบสำคัญจ่ายไม่สำเร็จ"),
      );
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Purchase Payments"
        icon={<DollarOutlined />}
        title={data.voucherNo}
        subtitle={<>{data.creditor?.nameTh ?? "—"} · {formatDate(data.voucherDate)} ·{" "}
            {formatMoney(data.totalAmount)} {t("บาท")}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(listHref)}
          >
            {t("กลับ")}
          </Button>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            loading={isPrinting}
            onClick={() => void handlePrintPdf()}
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
              <h2 className={styles.sectionTitle}>{t("ข้อมูลใบสำคัญจ่าย")}</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่")}</span>
                <div className={styles.metaValue}>{data.voucherNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.voucherDate)}
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
                <span className={styles.metaLabel}>{t("อ้างอิง PO")}</span>
                <div className={styles.metaValue}>
                  {data.purchaseOrder ? (
                    <Link href={`/purchase-orders/${data.purchaseOrder.id}`}>
                      {data.purchaseOrder.poNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วิธีจ่าย")}</span>
                <div className={styles.metaValue}>
                  {t(
                    SUPPLIER_PAYMENT_METHOD_LABEL[data.paymentMethod] ??
                      data.paymentMethod,
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เงื่อนไขชำระ")}</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? t("ไม่ระบุ")}
                </div>
              </div>
            </div>
          </div>

          {(data.payments ?? []).length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("รายการจ่ายเงิน")}</h2>
              </div>
              <div className={styles.itemList}>
                {data.payments.map((payment, index) => (
                  <div key={payment.id} className={styles.itemCard}>
                    <div className={styles.itemIndex}>{index + 1}</div>
                    <div className={styles.itemBody}>
                      <p className={styles.itemName}>
                        {formatDate(payment.paymentDate)} ·{" "}
                        {t(
                          SUPPLIER_PAYMENT_METHOD_LABEL[payment.paymentMethod] ??
                            payment.paymentMethod,
                        )}
                      </p>
                      <p className={styles.itemCode}>
                        {payment.transactionRef
                          ? `${t("อ้างอิง")} ${payment.transactionRef}`
                          : t("ไม่มีเลขอ้างอิง")}
                        {payment.paidBy
                          ? ` · ${t("โดย")} ${payment.paidBy.displayName}`
                          : ""}
                      </p>
                    </div>
                    <div className={styles.itemQty}>
                      <strong>{formatMoney(payment.amount)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.remark ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("หมายเหตุ")}</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("หลักฐานการจ่ายเงิน")}</h2>
              <span className={styles.sectionHint}>
                {attachmentsQuery.isLoading
                  ? t("กำลังโหลด...")
                  : t("{n} ไฟล์", { n: attachments.length })}
              </span>
            </div>
            {attachmentsQuery.isLoading ? (
              <Spin size="small" />
            ) : attachments.length === 0 ? (
              <p className={styles.attachmentEmpty}>{t("ยังไม่มีไฟล์หลักฐาน")}</p>
            ) : (
              <ul className={styles.attachmentList}>
                {attachments.map((file) => {
                  const sizeLabel = formatFileSize(file.fileSize);
                  return (
                    <li key={file.id} className={styles.attachmentItem}>
                      <div className={styles.attachmentMeta}>
                        <span className={styles.attachmentName}>
                          {attachmentDisplayName(file)}
                        </span>
                        <span className={styles.attachmentDesc}>
                          {[
                            sizeLabel,
                            formatDateTime(file.createdAt),
                            file.description,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
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
                        {canManageAttachment ? (
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={
                              deleteAttachmentMutation.isPending &&
                              deleteAttachmentMutation.variables
                                ?.attachmentId === file.id
                            }
                            disabled={busy}
                            onClick={() =>
                              modal.confirm({
                                title: t("ยืนยันลบไฟล์แนบ?"),
                                content: attachmentDisplayName(file),
                                okText: t("ลบ"),
                                okButtonProps: { danger: true },
                                onOk: () =>
                                  deleteAttachmentMutation.mutateAsync({
                                    attachmentId: file.id,
                                    documentId: data.id,
                                  }),
                              })
                            }
                          >
                            {t("ลบ")}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {canManageAttachment ? (
              <Upload {...uploadProps}>
                <Button
                  icon={<UploadOutlined />}
                  loading={uploadMutation.isPending}
                  style={{ marginTop: 10 }}
                >
                  {t("อัปโหลดหลักฐาน")}
                </Button>
              </Upload>
            ) : null}
            {canManageAttachment ? (
              <p className={styles.sectionHint} style={{ marginTop: 8 }}>
                {t("รองรับ PDF และรูป JPG/PNG/WEBP ขนาดไม่เกิน 20MB")}
              </p>
            ) : null}
          </div>
          <ESignatureHistoryCard documentId={data.id} style={{ marginTop: 16 }} />
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.voucherNo}</h2>
          </div>
          <div>
            <Tag color={SUPPLIER_PAYMENT_STATUS_COLOR[data.status] ?? "default"}>
            {tStatus(SUPPLIER_PAYMENT_STATUS_LABEL[data.status] ?? data.status)}
          </Tag>
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("ยอดจ่าย")}</span>
              <strong>{formatMoney(data.totalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("จ่ายเมื่อ")}</span>
              <strong>
                {data.paidAt
                  ? dayjs(data.paidAt).format("DD/MM/BBBB HH:mm")
                  : "—"}
              </strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ไฟล์แนบ")}</span>
              <strong>{attachments.length}</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            {data.status === "DRAFT" && canConfirmPayment ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() => {
                  confirmForm.setFieldsValue({
                    paymentDate: dayjs(data.voucherDate),
                  });
                  setConfirmOpen(true);
                }}
              >
                {t("Confirm จ่ายเงิน")}
              </Button>
            ) : null}
            {data.status === "DRAFT" && canCancelPayment ? (
              <Button
                className={styles.secondaryBtn}
                danger
                loading={busy}
                onClick={() =>
                  modal.confirm({
                    title: t("ยืนยันยกเลิกใบสำคัญจ่าย?"),
                    onOk: () => cancelMutation.mutateAsync(data.id),
                  })
                }
              >
                {t("ยกเลิกเอกสาร")}
              </Button>
            ) : null}
          </div>

          <ProcurementFlowTimeline
            input={{
              pr: po?.purchaseRequest
                ? {
                    id: po.purchaseRequest.id,
                    prNo: po.purchaseRequest.prNo,
                    status: po.purchaseRequest.status,
                  }
                : null,
              po: po
                ? {
                    id: po.id,
                    poNo: po.poNo,
                    status: po.status,
                    paymentStatus: po.paymentStatus,
                  }
                : data.purchaseOrder
                  ? {
                      id: data.purchaseOrder.id,
                      poNo: data.purchaseOrder.poNo,
                      status: data.purchaseOrder.status,
                      paymentStatus: data.purchaseOrder.paymentStatus,
                    }
                  : null,
              goodsReceipts: linkedGrs.map((gr) => ({
                id: gr.id,
                grNo: gr.grNo,
                status: gr.status,
              })),
              payment: {
                id: data.id,
                voucherNo: data.voucherNo,
                status: data.status,
              },
            }}
          />
        </aside>
      </div>

      <Modal
        title={t("Confirm จ่ายเงิน")}
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        confirmLoading={confirmMutation.isPending}
        okText={lang === "en" ? "Pay" : "จ่ายเงิน"}
        destroyOnHidden={false}
        forceRender
        onOk={async () => {
          const values = await confirmForm.validateFields();
          await confirmMutation.mutateAsync({
            id: data.id,
            body: {
              paymentDate: values.paymentDate.format("YYYY-MM-DD"),
              transactionRef: values.transactionRef?.trim() || undefined,
              remark: values.remark?.trim() || undefined,
            },
          });
          setConfirmOpen(false);
        }}
      >
        <Form form={confirmForm} layout="vertical" preserve={false}>
          <Form.Item
            label={t("วันที่จ่าย")}
            name="paymentDate"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item
            label={t("เลขอ้างอิงการโอน")}
            name="transactionRef"
            rules={
              data.paymentMethod === "TRANSFER"
                ? [{ required: true, message: t("กรณีโอนต้องระบุเลขอ้างอิง") }]
                : undefined
            }
          >
            <Input placeholder="TRX-..." />
          </Form.Item>
          <Form.Item label={t("หมายเหตุ")} name="remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
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
