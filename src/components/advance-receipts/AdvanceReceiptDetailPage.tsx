"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Input, Modal, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import DocumentPaper from "@/components/common/DocumentPaper";
import PageHeader from "@/components/common/PageHeader";
import PageLoading from "@/components/common/PageLoading";
import {
  useAdvanceReceiptQuery,
  useCancelAdvanceReceiptMutation,
  useConfirmAdvanceReceiptMutation,
  useUpdateAdvanceReceiptMutation,
} from "@/hooks/advance-receipts/useAdvanceReceipts";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useActiveAdvanceTaxInvoiceQuery,
  useIssueAdvanceTaxInvoiceMutation,
} from "@/hooks/sales-tax-invoices/useSalesTaxInvoices";
import { getArReceipt } from "@/lib/api/ar-receipts";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { advanceReceiptRoutes, arReceiptRoutes, arRoutes, taxInvoiceRoutes } from "@/lib/sales/ar-routes";
import {
  AR_PAYMENT_METHOD_LABEL,
  AR_RECEIPT_STATUS_LABEL,
} from "@/types/ar-receipts";
import {
  ADVANCE_STATUS_COLOR,
  ADVANCE_STATUS_LABEL,
  ADVANCE_TYPE_LABEL,
  type AdvanceReceiptApplication,
} from "@/types/advance-receipts";
import AdvanceReceiptForm from "./AdvanceReceiptForm";

const APPLICATION_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "ร่าง", color: "default" },
  POSTED: { label: "ยืนยัน", color: "green" },
  CANCELLED: { label: "ยกเลิก", color: "red" },
};

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdvanceReceiptDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const { modal } = App.useApp();
  const perms = useScreenActionPermissions("FINANCE_ADVANCE_RECEIPTS");
  const taxPerms = useScreenActionPermissions("FINANCE_TAX_INVOICES");
  const query = useAdvanceReceiptQuery(id);
  const update = useUpdateAdvanceReceiptMutation(id);
  const confirm = useConfirmAdvanceReceiptMutation();
  const cancel = useCancelAdvanceReceiptMutation();
  const issueTax = useIssueAdvanceTaxInvoiceMutation();
  const doc = query.data?.data;
  const received = doc?.status === "RECEIVED" || doc?.status === "FULLY_APPLIED";
  const activeTax = useActiveAdvanceTaxInvoiceQuery(id, Boolean(doc) && received);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [canSaveDraft, setCanSaveDraft] = useState(true);
  const canPrint = !isMatrixPermissionMode() || hasPermission("FINANCE_ADVANCE_RECEIPTS.EXPORT");

  const printReceipt = async () => {
    if (!doc?.arReceiptId) return;
    const res = await getArReceipt(getAccessToken(), doc.arReceiptId);
    const { generateArReceiptPdf } = await import("@/utils/generateArDocumentsPdf");
    await generateArReceiptPdf(res.data);
  };

  if (!perms.canView) {
    return <AccessDenied screenCodes={["FINANCE_ADVANCE_RECEIPTS"]} />;
  }
  if (query.isLoading) return <PageLoading label="กำลังโหลดเอกสารรับเงินล่วงหน้า" />;
  if (!doc) {
    return (
      <div>
        <p>{t("ไม่พบเอกสารรับเงินล่วงหน้า")}</p>
        <Link href={advanceReceiptRoutes.list}>{t("กลับ")}</Link>
      </div>
    );
  }

  const applicationColumns: ColumnsType<AdvanceReceiptApplication> = [
    {
      title: t("เลขที่ใบแจ้งหนี้"),
      dataIndex: "invoiceNo",
      render: (value: string, row) => (
        <Link href={arRoutes.detail(row.salesInvoiceId)}>{value}</Link>
      ),
    },
    {
      title: t("วันที่"),
      dataIndex: "invoiceDate",
      width: 110,
      render: (value?: string) => formatDate(value),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 150,
      render: (value: string) => {
        const meta = APPLICATION_STATUS[value];
        return (
          <>
            <Tag color={meta?.color ?? "default"} style={{ marginInlineEnd: 4 }}>
              {t(meta?.label ?? value)}
            </Tag>
            {value === "DRAFT" ? <Tag color="orange">{t("จอง")}</Tag> : null}
          </>
        );
      },
    },
    {
      title: t("ก่อน VAT"),
      dataIndex: "baseAmount",
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: t("VAT"),
      dataIndex: "vatAmount",
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: t("ยอดหัก"),
      dataIndex: "amount",
      align: "right",
      render: (value: string) => <strong>{formatMoney(value)}</strong>,
    },
  ];

  const taxDoc = activeTax.data?.data;
  const canIssueTax = received && !taxDoc && !activeTax.isLoading && taxPerms.canAdd;

  return (
    <div>
      <PageHeader
        eyebrow="Finance · Advance receipts"
        title={doc.docNo}
        subtitle={`${doc.customerName ?? ""} · ${formatDate(doc.receiptDate)}`}
        actions={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(advanceReceiptRoutes.list)}>
              {t("กลับ")}
            </Button>
            {doc.status === "DRAFT" && perms.canEdit ? (
              <Button
                icon={<SaveOutlined />}
                htmlType="submit"
                form="advance-receipt-edit"
                loading={update.isPending}
                disabled={!canSaveDraft || update.isPending}
              >
                {t("บันทึกร่าง")}
              </Button>
            ) : null}
            {doc.status === "DRAFT" && perms.canAdd ? (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={confirm.isPending}
                onClick={() => {
                  modal.confirm({
                    title: t("ยืนยันรับเงินและออกใบรับชำระมัดจำ?"),
                    content: t("เงินจะเข้าเครดิตลูกค้าของใบสั่งขายนี้"),
                    okText: t("ยืนยันรับเงิน"),
                    cancelText: t("ปิด"),
                    onOk: () => confirm.mutateAsync(id),
                  });
                }}
              >
                {t("ยืนยันรับเงิน")}
              </Button>
            ) : null}
            {received && doc.arReceiptId && canPrint ? (
              <Button icon={<FilePdfOutlined />} onClick={() => void printReceipt()}>
                {t("พิมพ์ใบเสร็จ")}
              </Button>
            ) : null}
            {taxDoc ? (
              <Button
                icon={<FileTextOutlined />}
                onClick={() => router.push(taxInvoiceRoutes.detail(taxDoc.id))}
              >
                {t("ดูใบกำกับภาษี")}
              </Button>
            ) : null}
            {canIssueTax ? (
              <Button
                icon={<FileTextOutlined />}
                loading={issueTax.isPending}
                onClick={() => {
                  modal.confirm({
                    title: t("ออกใบกำกับภาษี?"),
                    content: t("วันที่ใบคือวันรับเงิน และใช้เลขที่ชุดเดียวกับใบกำกับภาษีอื่น"),
                    okText: t("ออกใบกำกับภาษี"),
                    cancelText: t("ปิด"),
                    onOk: async () => {
                      const res = await issueTax.mutateAsync(id);
                      if (res.data?.id) router.push(taxInvoiceRoutes.detail(res.data.id));
                    },
                  });
                }}
              >
                {t("ออกใบกำกับภาษี")}
              </Button>
            ) : null}
            {(doc.status === "DRAFT" || doc.status === "RECEIVED") && perms.canDelete ? (
              <Button danger icon={<CloseOutlined />} onClick={() => setReasonOpen(true)}>
                {t("ยกเลิก")}
              </Button>
            ) : null}
          </>
        }
      />
      {doc.status === "DRAFT" ? (
        <>
          <AdvanceReceiptForm
            formId="advance-receipt-edit"
            initial={doc}
            onCanSaveChange={setCanSaveDraft}
            onSubmit={(body) => update.mutate(body)}
          />
        </>
      ) : (
        <DocumentPaper
          titleTh={t(ADVANCE_TYPE_LABEL[doc.docType] ?? doc.docType)}
          titleEn="ADVANCE RECEIPT"
          meta={[
            { label: t("เลขที่เอกสาร"), value: doc.docNo },
            { label: t("วันรับเงิน"), value: formatDate(doc.receiptDate) },
            { label: t("สถานะ"), value: t(ADVANCE_STATUS_LABEL[doc.status] ?? doc.status) },
          ]}
          panels={[
            {
              title: t("ลูกค้า"),
              rows: [
                { label: t("ชื่อ"), value: doc.customerName || "—" },
                { label: t("ใบสั่งขาย"), value: doc.soNo || "—" },
                { label: t("เปอร์เซ็นต์มัดจำ"), value: `${Number(doc.percent)}%` },
              ],
            },
            {
              title: t("การรับเงิน"),
              rows: [
                {
                  label: t("วิธีรับเงิน"),
                  value: t(AR_PAYMENT_METHOD_LABEL[doc.paymentMethod] ?? doc.paymentMethod),
                },
                { label: t("เลขอ้างอิง"), value: doc.transactionRef || "—" },
                {
                  label: t("เลขที่ใบรับชำระ"),
                  value: doc.arReceiptId ? (
                    <span>
                      <Link href={arReceiptRoutes.detail(doc.arReceiptId)}>
                        {doc.receiptNo}
                      </Link>
                      {doc.receiptStatus ? (
                        <>
                          {" · "}
                          <Tag
                            color={
                              doc.receiptStatus === "CANCELLED" ? "red" : "green"
                            }
                            style={{ marginInlineEnd: 0 }}
                          >
                            {t(
                              AR_RECEIPT_STATUS_LABEL[doc.receiptStatus] ??
                                doc.receiptStatus,
                            )}
                          </Tag>
                        </>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  ),
                },
              ],
            },
          ]}
        >
          <Tag
            color={ADVANCE_STATUS_COLOR[doc.status] ?? "default"}
            style={{ marginBottom: 12 }}
          >
            {t(ADVANCE_STATUS_LABEL[doc.status] ?? doc.status)}
            {doc.status === "CANCELLED" && doc.cancelReason
              ? ` — ${doc.cancelReason}`
              : ""}
          </Tag>
          <div style={{ marginLeft: "auto", maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>{t("ยอดก่อน VAT")}</span>
              <strong>{formatMoney(doc.subtotalAmount)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>{t("VAT")}</span>
              <strong>{formatMoney(doc.vatAmount)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>{t("ยอดรวม")}</span>
              <strong>{formatMoney(doc.totalAmount)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>{t("จองโดยใบร่าง")}</span>
              <strong>
                {doc.reservedAmount != null ? formatMoney(doc.reservedAmount) : "—"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>{t("ใช้จริง (ยืนยันแล้ว)")}</span>
              <strong>{formatMoney(doc.usedAmount ?? doc.appliedAmount)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {doc.status === "CANCELLED"
                  ? t("คงเหลือที่ใช้ได้")
                  : t("คงเหลือ")}
              </span>
              <strong>{formatMoney(doc.remainingAmount)}</strong>
            </div>
          </div>
          {doc.applications ? (
            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                {t("ประวัติการนำไปหักในใบแจ้งหนี้")}
              </div>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                columns={applicationColumns}
                dataSource={doc.applications}
                locale={{ emptyText: t("ยังไม่มีการนำไปหักในใบแจ้งหนี้") }}
              />
              <p style={{ color: "#8a9199", fontSize: 12, margin: "8px 0 0" }}>
                {t("แถว “จอง” = ใบแจ้งหนี้ร่าง ยังไม่ตัดมัดจำจริง จนกว่าจะยืนยันใบแจ้งหนี้")}
              </p>
            </div>
          ) : null}
        </DocumentPaper>
      )}
      {doc.status === "DRAFT" ? (
        <div style={{ marginTop: 16, maxWidth: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>{t("ยอดก่อน VAT")}</span>
            <strong>{formatMoney(doc.subtotalAmount)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>{t("VAT")}</span>
            <strong>{formatMoney(doc.vatAmount)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("ยอดรวม")}</span>
            <strong>{formatMoney(doc.totalAmount)}</strong>
          </div>
        </div>
      ) : null}
      <Modal
        open={reasonOpen}
        destroyOnHidden
        mask={{ closable: false }}
        title={t("ยกเลิกเอกสารรับเงินล่วงหน้า")}
        okText={t("ยกเลิก")}
        cancelText={t("ปิด")}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5, loading: cancel.isPending }}
        onOk={() => {
          cancel.mutate(
            { id, reason: reason.trim() },
            { onSuccess: () => setReasonOpen(false) },
          );
        }}
        onCancel={() => setReasonOpen(false)}
      >
        <Input.TextArea
          rows={3}
          value={reason}
          maxLength={2000}
          placeholder={t("เหตุผล")}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
