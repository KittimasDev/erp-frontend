"use client";

import { useState } from "react";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Result,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { tStatus } from "@/types/purchase-orders";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useApCreditNoteSettlementMutations,
  useApDocumentQuery,
  useApInvoiceOptionsQuery,
  useApproveApDocumentMutation,
  useCancelApDocumentMutation,
  useRejectApDocumentMutation,
  useSubmitApDocumentMutation,
} from "@/hooks/ap-documents/useApDocuments";
import { useCompanyBankAccountsQuery } from "@/hooks/company-profile/useCompanyBankAccountsQuery";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  AP_SETTLEMENT_METHOD_LABEL,
  AP_USAGE_STATUS_COLOR,
  AP_USAGE_STATUS_LABEL,
  AP_VAT_MODE_LABEL,
  type ApCreditNoteRefund,
  type ApDocument,
  type ApDocumentItem,
  type ApDocumentKind,
  type ApDocumentLink,
  type ApEvent,
  type ApSupplierCreditUsage,
} from "@/types/ap-documents";

import { AP_DOCUMENT_CONFIG, apEventLabel, apShortLabel, formatThaiDate, money } from "./apDocumentConfig";
import PageHeader from "@/components/common/PageHeader";

type Props = { kind: ApDocumentKind; id: string };

/** 11/10/2569 10:30 — พ.ศ. เหมือนวันที่อื่นในหน้า */
const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = dayjs(value);
  return d.format("DD/MM/BBBB HH:mm");
};

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type RefundForm = {
  refundDate: Dayjs;
  amount: number;
  companyBankAccountId: string;
  referenceNo?: string;
  remark?: string;
};

export default function ApDocumentDetailPage({ kind, id }: Props) {
  const config = AP_DOCUMENT_CONFIG[kind];
  const isInvoice = kind === "invoice";
  const isCredit = kind === "creditNote";
  const t = useT();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const perms = useScreenActionPermissions(config.screenCode);
  const debitNotePerms = useScreenActionPermissions(AP_DOCUMENT_CONFIG.debitNote.screenCode);
  const query = useApDocumentQuery(kind, id);
  const submitMutation = useSubmitApDocumentMutation(kind, id);
  const approveMutation = useApproveApDocumentMutation(kind, id);
  const rejectMutation = useRejectApDocumentMutation(kind, id);
  const cancelMutation = useCancelApDocumentMutation(kind, id);
  const settlement = useApCreditNoteSettlementMutations(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [refundForm] = Form.useForm<RefundForm>();
  const [creditForm] = Form.useForm<{ apDocumentId: string; amount: number }>();
  const [cancelRefundTarget, setCancelRefundTarget] = useState<ApCreditNoteRefund | null>(null);
  const [cancelRefundReason, setCancelRefundReason] = useState("");

  const doc = query.data;
  const bankQuery = useCompanyBankAccountsQuery(isCredit && doc?.settlementMethod === "REFUND");
  const apOptionsQuery = useApInvoiceOptionsQuery(
    isCredit && doc?.settlementMethod === "SUPPLIER_CREDIT" && creditOpen
      ? { creditorId: doc.creditorId, billingStatus: "ALL", page: 1, limit: 100 }
      : undefined,
    "creditNote",
  );

  if (query.isLoading) return <Spin />;
  if (!doc) {
    return (
      <Result
        status="404"
        title={t("ไม่พบ{label}", { label: apShortLabel(config) })}
        extra={<Button onClick={() => router.push(config.basePath)}>{t("กลับรายการ")}</Button>}
      />
    );
  }

  const isEditable = doc.status === "DRAFT" || doc.status === "REJECTED";
  const isPending = doc.status === "PENDING_APPROVAL";
  const isApproved = doc.status === "APPROVED";
  const method = doc.settlementMethod ?? "OFFSET_AP";
  const busy =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending;
  const attachmentType = isCredit ? "AP_CREDIT_NOTE" : "AP_DEBIT_NOTE";
  const outstanding = doc.outstandingAmount ?? 0;
  const refunds = doc.refunds ?? [];
  const usages = doc.creditUsages ?? [];

  const handleSubmit = () =>
    modal.confirm({
      title: t("ส่งอนุมัติ{label} {docNo}?", { label: apShortLabel(config), docNo: doc.docNo }),
      content: t("ยอด {amount} บาท · ส่งแล้วแก้ไขไม่ได้จนกว่าจะถูกไม่อนุมัติ", { amount: money.format(doc.totalAmount) }),
      okText: t("ส่งอนุมัติ"),
      onOk: async () => {
        try {
          await submitMutation.mutateAsync();
          message.success(t("ส่งอนุมัติแล้ว"));
        } catch (error) {
          message.error(errorText(error, t("ส่งอนุมัติไม่สำเร็จ")));
        }
      },
    });

  const handleApprove = () =>
    modal.confirm({
      title: t("อนุมัติ{label} {docNo}?", { label: apShortLabel(config), docNo: doc.docNo }),
      content: t("ยอด {amount} บาท · อนุมัติแล้วยังไม่กระทบยอด AP จนกว่าจะยืนยันนำไปใช้ และแก้ไขไม่ได้", { amount: money.format(doc.totalAmount) }),
      okText: t("อนุมัติ"),
      onOk: async () => {
        try {
          await approveMutation.mutateAsync();
          message.success(t("อนุมัติแล้ว"));
        } catch (error) {
          message.error(errorText(error, t("อนุมัติไม่สำเร็จ")));
        }
      },
    });

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync(rejectReason.trim());
      message.success(t("บันทึกไม่อนุมัติแล้ว"));
      setRejectOpen(false);
      setRejectReason("");
    } catch (error) {
      message.error(errorText(error, t("ไม่อนุมัติไม่สำเร็จ")));
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(cancelReason);
      message.success(t("ยกเลิกแล้ว"));
      setCancelOpen(false);
      setCancelReason("");
    } catch (error) {
      message.error(errorText(error, t("ยกเลิกไม่สำเร็จ")));
    }
  };

  const handlePrint = async () => {
    const { generateApDocumentPdf } = await import("@/utils/generateApDocumentPdf");
    void generateApDocumentPdf(doc);
  };

  const handleRefund = async (values: RefundForm) => {
    try {
      await settlement.refund.mutateAsync({
        refundDate: values.refundDate.format("YYYY-MM-DD"),
        amount: Number(values.amount),
        companyBankAccountId: values.companyBankAccountId,
        referenceNo: values.referenceNo?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
      });
      message.success(t("บันทึกรับเงินคืนแล้ว"));
      setRefundOpen(false);
      refundForm.resetFields();
    } catch (error) {
      message.error(errorText(error, t("บันทึกรับเงินคืนไม่สำเร็จ")));
    }
  };

  const handleCancelRefund = async () => {
    if (!cancelRefundTarget) return;
    try {
      await settlement.cancelRefund.mutateAsync({
        refundId: cancelRefundTarget.id,
        reason: cancelRefundReason.trim(),
      });
      message.success(t("ยกเลิกรายการรับเงินคืนแล้ว"));
      setCancelRefundTarget(null);
      setCancelRefundReason("");
    } catch (error) {
      message.error(errorText(error, t("ยกเลิกรายการรับเงินคืนไม่สำเร็จ")));
    }
  };

  const handleUseCredit = async (values: { apDocumentId: string; amount: number }) => {
    try {
      await settlement.applyCredit.mutateAsync({
        apDocumentId: values.apDocumentId,
        amount: Number(values.amount),
      });
      message.success(t("ใช้เครดิตผู้ขายแล้ว"));
      setCreditOpen(false);
      creditForm.resetFields();
    } catch (error) {
      message.error(errorText(error, t("ใช้เครดิตไม่สำเร็จ")));
    }
  };

  const lineColumns: ColumnsType<ApDocumentItem> = [
    { title: "#", key: "no", width: 48, align: "center", render: (_, __, i) => i + 1 },
    { title: t("รายละเอียด"), dataIndex: "description" },
    {
      title: t("จำนวน"),
      dataIndex: "quantity",
      align: "right",
      width: 110,
      render: (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 3 }),
    },
    { title: t("หน่วย"), dataIndex: "unitLabel", width: 90, render: (v: string | null) => v || "—" },
    {
      title: t("ราคา/หน่วย"),
      dataIndex: "unitPrice",
      align: "right",
      width: 130,
      render: (value: number) => money.format(value),
    },
    {
      title: t("ส่วนลด"),
      dataIndex: "discountAmount",
      align: "right",
      width: 110,
      render: (value?: number) => money.format(value ?? 0),
    },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "amount",
      align: "right",
      width: 140,
      render: (value: number) => money.format(value),
    },
  ];

  const debitNoteColumns: ColumnsType<ApDocumentLink> = [
    {
      title: t("ใบเพิ่มหนี้"),
      dataIndex: "docNo",
      render: (value: string, row) => (
        <Link href={`${AP_DOCUMENT_CONFIG.debitNote.basePath}/${row.id}`}>{value}</Link>
      ),
    },
    { title: t("วันที่"), dataIndex: "docDate", render: formatThaiDate },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      render: (value: string) => (
        <Tag color={AP_DOCUMENT_STATUS_COLOR[value]}>{tStatus(AP_DOCUMENT_STATUS_LABEL[value] ?? value)}</Tag>
      ),
    },
    {
      title: t("ยอดเพิ่มหนี้"),
      dataIndex: "totalAmount",
      align: "right",
      render: (value: number) => money.format(value),
    },
  ];

  const refundColumns: ColumnsType<ApCreditNoteRefund> = [
    { title: t("วันที่รับเงิน"), dataIndex: "refundDate", render: formatThaiDate, width: 120 },
    {
      title: t("ยอดรับจริง"),
      dataIndex: "amount",
      align: "right",
      width: 130,
      render: (value: number) => money.format(value),
    },
    { title: t("บัญชีที่รับเงิน"), dataIndex: "bankAccountLabel", render: (v: string | null) => v || "—" },
    { title: t("เลขที่อ้างอิง/หลักฐาน"), dataIndex: "referenceNo", render: (v: string | null) => v || "—" },
    { title: t("ผู้บันทึก"), dataIndex: "createdByName", render: (v: string | null) => v || "—" },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 110,
      render: (value: string, row) =>
        value === "CANCELLED" ? (
          <Tag color="default" title={row.cancelReason ?? undefined}>
            {tStatus("ยกเลิก")}
          </Tag>
        ) : (
          <Tag color="success">{t("มีผล")}</Tag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_, row) =>
        row.status === "ACTIVE" && perms.canEdit ? (
          <Button size="small" danger onClick={() => setCancelRefundTarget(row)}>
            {t("ยกเลิก")}
          </Button>
        ) : null,
    },
  ];

  const usageColumns: ColumnsType<ApSupplierCreditUsage> = [
    { title: t("วันที่ใช้"), dataIndex: "usedAt", render: formatDateTime, width: 150 },
    {
      title: t("ใบตั้งหนี้ที่ใช้เครดิต"),
      dataIndex: "apDocumentNo",
      render: (value: string, row) => (
        <Link href={`${AP_DOCUMENT_CONFIG.invoice.basePath}/${row.apDocumentId}`}>{value}</Link>
      ),
    },
    {
      title: t("ยอดที่ใช้"),
      dataIndex: "amount",
      align: "right",
      render: (value: number) => money.format(value),
    },
    { title: t("ผู้ใช้เครดิต"), dataIndex: "usedByName", render: (v: string | null) => v || "—" },
  ];

  const eventColumns: ColumnsType<ApEvent> = [
    { title: t("วัน-เวลา"), dataIndex: "performedAt", width: 160, render: formatDateTime },
    {
      title: t("การดำเนินการ"),
      dataIndex: "action",
      width: 200,
      render: (value: string) => apEventLabel(value),
    },
    { title: t("ผู้ดำเนินการ"), dataIndex: "performedByName", width: 160, render: (v?: string) => v || "—" },
    { title: t("รายละเอียด"), dataIndex: "note", render: (v?: string) => v || "—" },
  ];

  const canOpenApply =
    isApproved &&
    !isInvoice &&
    method === "OFFSET_AP" &&
    !doc.appliedToApId &&
    Boolean(doc.referenceDocumentId);

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{apShortLabel(config)} {doc.docNo}</>}
        meta={
          <>
<Tag color={AP_DOCUMENT_STATUS_COLOR[doc.status]}>
              {tStatus(AP_DOCUMENT_STATUS_LABEL[doc.status] ?? doc.status)}
            </Tag>
{doc.usageStatus ? (
              <Tag color={AP_USAGE_STATUS_COLOR[doc.usageStatus] ?? "default"}>
                {tStatus(AP_USAGE_STATUS_LABEL[doc.usageStatus] ?? doc.usageStatus)}
              </Tag>
            ) : null}
          </>
        }
        actions={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(config.basePath)}>
              {t("กลับ")}
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={() => void handlePrint()}>
              {t("พิมพ์ PDF")}
            </Button>
            {isEditable && perms.canEdit ? (
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`${config.basePath}/${doc.id}/edit`)}
              >
                {t("แก้ไข")}
              </Button>
            ) : null}
            {isEditable && perms.canEdit ? (
              <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={handleSubmit}>
                {t("ส่งอนุมัติ")}
              </Button>
            ) : null}
            {isPending && perms.canApprove ? (
              <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={handleApprove}>
                {t("อนุมัติ")}
              </Button>
            ) : null}
            {isPending && perms.canApprove ? (
              <Button danger icon={<StopOutlined />} loading={busy} onClick={() => setRejectOpen(true)}>
                {t("ไม่อนุมัติ")}
              </Button>
            ) : null}
            {canOpenApply ? (
              <Button
                type="primary"
                onClick={() =>
                  router.push(`${AP_DOCUMENT_CONFIG.invoice.basePath}/${doc.referenceDocumentId}`)
                }
              >
                {t("ไปปรับหนี้ที่ใบตั้งหนี้")}
              </Button>
            ) : null}
            {isCredit && isApproved && method === "REFUND" && outstanding > 0 && perms.canEdit ? (
              <Button type="primary" onClick={() => setRefundOpen(true)}>
                {t("ดำเนินการรับเงินคืน")}
              </Button>
            ) : null}
            {isCredit && isApproved && method === "SUPPLIER_CREDIT" && outstanding > 0 && perms.canEdit ? (
              <Button type="primary" onClick={() => setCreditOpen(true)}>
                {t("ใช้เครดิตกับใบตั้งหนี้")}
              </Button>
            ) : null}
            {isInvoice && isApproved && debitNotePerms.canAdd ? (
              <Button
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(
                    `${AP_DOCUMENT_CONFIG.debitNote.basePath}/create?creditorId=${doc.creditorId}&invoiceId=${doc.id}`,
                  )
                }
              >
                {t("ออกใบเพิ่มหนี้")}
              </Button>
            ) : null}
            {doc.status !== "CANCELLED" && perms.canEdit ? (
              <Button danger icon={<CloseOutlined />} loading={busy} onClick={() => setCancelOpen(true)}>
                {t("ยกเลิก")}
              </Button>
            ) : null}
          
          </>
        }
      />

      <Card>
        {doc.status === "CANCELLED" ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            title={t("ยกเลิกโดย {name} เมื่อ {time}", { name: doc.cancelledByName ?? "—", time: formatDateTime(doc.cancelledAt) })}
            description={doc.cancelReason ? t("เหตุผล: {reason}", { reason: doc.cancelReason }) : undefined}
          />
        ) : null}
        {doc.status === "REJECTED" ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            title={t("ไม่อนุมัติโดย {name} เมื่อ {time}", { name: doc.rejectedByName ?? "—", time: formatDateTime(doc.rejectedAt) })}
            description={t("เหตุผล: {reason} · แก้ไขแล้วส่งอนุมัติใหม่ได้", { reason: doc.rejectReason ?? "—" })}
          />
        ) : null}
        {isApproved && !isInvoice && doc.usageStatus && outstanding > 0 ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title={t("อนุมัติแล้ว — ยังไม่กระทบยอด AP · ยอดที่ยังไม่ได้ดำเนินการ {amount} บาท", { amount: money.format(outstanding) })}
            description={
              method === "OFFSET_AP"
                ? t("เปิดใบตั้งหนี้ที่อ้างอิง กด “ปรับหนี้” แล้วเลือกเอกสารนี้ เพื่อให้ยอด AP เปลี่ยน")
                : method === "REFUND"
                  ? t("กด “ดำเนินการรับเงินคืน” เมื่อได้รับเงินจากผู้ขาย (รับเป็นงวดได้)")
                  : t("ใช้เครดิตนี้หักกับใบตั้งหนี้ของผู้ขายรายเดียวกันได้ที่ปุ่ม “ใช้เครดิตกับใบตั้งหนี้” หรือที่หน้าใบตั้งหนี้")
            }
          />
        ) : null}
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label={t("เจ้าหนี้")}>
            {doc.creditorCode} {doc.creditorName}
          </Descriptions.Item>
          <Descriptions.Item label={t("เลขประจำตัวผู้เสียภาษี")}>{doc.creditorTaxId || "—"}</Descriptions.Item>
          <Descriptions.Item label={t("วันที่เอกสาร")}>{formatThaiDate(doc.docDate)}</Descriptions.Item>
          <Descriptions.Item
            label={
              isInvoice
                ? t("เลขที่ใบแจ้งหนี้ผู้ขาย")
                : isCredit
                  ? t("เลขที่ใบลดหนี้ผู้ขาย")
                  : t("เลขที่ใบเพิ่มหนี้ผู้ขาย")
            }
          >
            {doc.supplierDocNo || "—"}
            {doc.supplierDocDate ? ` (${formatThaiDate(doc.supplierDocDate)})` : ""}
          </Descriptions.Item>
          {isInvoice ? (
            <>
              <Descriptions.Item label={t("อ้างอิงใบสั่งซื้อ")}>
                {doc.purchaseOrderId ? (
                  <Link href={`/purchase-orders/${doc.purchaseOrderId}`}>{doc.purchaseOrderNo}</Link>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("ครบกำหนดชำระ")}>{formatThaiDate(doc.dueDate)}</Descriptions.Item>
            </>
          ) : (
            <>
              <Descriptions.Item label={t("อ้างอิงใบตั้งหนี้ (AP)")}>
                {doc.referenceDocumentId ? (
                  <Link href={`${AP_DOCUMENT_CONFIG.invoice.basePath}/${doc.referenceDocumentId}`}>
                    {doc.referenceDocumentNo}
                  </Link>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("อ้างอิงใบสั่งซื้อ")}>
                {doc.purchaseOrderId ? (
                  <Link href={`/purchase-orders/${doc.purchaseOrderId}`}>{doc.purchaseOrderNo}</Link>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label={isCredit ? t("สาเหตุที่ลดหนี้") : t("เหตุผลที่เพิ่มหนี้")} span="filled">
                {doc.reason || "—"}
              </Descriptions.Item>
            </>
          )}
          {isCredit ? (
            <Descriptions.Item label={t("วิธีจัดการยอด")}>
              {t(AP_SETTLEMENT_METHOD_LABEL[method] ?? method)}
            </Descriptions.Item>
          ) : null}
          {!isInvoice && doc.appliedToApId ? (
            <Descriptions.Item label={t("นำไปปรับหนี้ของ")}>
              <Link href={`${AP_DOCUMENT_CONFIG.invoice.basePath}/${doc.appliedToApId}`}>
                {doc.appliedToApNo ?? doc.appliedToApId}
              </Link>
              {doc.appliedAt ? ` · ${formatDateTime(doc.appliedAt)}` : ""}
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item label={t("การคิด VAT")}>
            {t(AP_VAT_MODE_LABEL[doc.vatMode] ?? doc.vatMode)}
            {doc.vatMode !== "NONE" ? ` ${doc.vatRate}%` : ""}
          </Descriptions.Item>
          <Descriptions.Item label={t("ผู้สร้าง")}>{doc.createdByName || "—"}</Descriptions.Item>
          {!isInvoice ? (
            <Descriptions.Item label={t("ผู้ตรวจสอบ (ผู้ส่งอนุมัติ)")}>
              {doc.submittedByName ? `${doc.submittedByName} · ${formatDateTime(doc.submittedAt)}` : "—"}
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item label={t("ผู้อนุมัติ")}>
            {doc.approvedByName ? `${doc.approvedByName} · ${formatDateTime(doc.approvedAt)}` : "—"}
          </Descriptions.Item>
          {doc.remark ? (
            <Descriptions.Item label={t("หมายเหตุ")} span="filled">
              {doc.remark}
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      </Card>

      <Card title={t("รายการ")}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={lineColumns}
          dataSource={doc.items}
          scroll={{ x: 760 }}
        />
        <Descriptions
          bordered
          size="small"
          column={1}
          style={{ maxWidth: 420, marginLeft: "auto", marginTop: 16 }}
        >
          <Descriptions.Item label={t("มูลค่าก่อน VAT")}>{money.format(doc.subtotalAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("VAT {rate}%", { rate: doc.vatRate })}>{money.format(doc.vatAmount)}</Descriptions.Item>
          <Descriptions.Item label={t(isInvoice ? "ยอดตั้งหนี้" : isCredit ? "ยอดลดหนี้" : "ยอดเพิ่มหนี้")}>
            <Typography.Text strong>{money.format(doc.totalAmount)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {isCredit && method === "REFUND" ? (
        <Card
          title={t("การรับเงินคืนจากผู้ขาย")}
          extra={
            <Typography.Text type="secondary">
              {t("รับแล้ว {received} · คงเหลือ {remaining} บาท", { received: money.format(doc.refundedAmount ?? 0), remaining: money.format(outstanding) })}
            </Typography.Text>
          }
        >
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={refundColumns}
            dataSource={refunds}
            locale={{ emptyText: t("ยังไม่มีการรับเงินคืน") }}
            scroll={{ x: 800 }}
          />
        </Card>
      ) : null}

      {isCredit && method === "SUPPLIER_CREDIT" ? (
        <Card
          title={t("เครดิตผู้ขาย")}
          extra={
            <Typography.Text type="secondary">
              {t("ใช้แล้ว {used} · เครดิตคงเหลือ {remaining} บาท", { used: money.format(doc.creditUsedAmount ?? 0), remaining: money.format(outstanding) })}
            </Typography.Text>
          }
        >
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={usageColumns}
            dataSource={usages}
            locale={{ emptyText: isApproved ? t("ยังไม่ได้นำเครดิตไปใช้") : t("ใช้เครดิตได้เมื่ออนุมัติแล้ว") }}
          />
        </Card>
      ) : null}

      {isInvoice ? (
        <Card title={t("ใบเพิ่มหนี้ที่อ้างถึงใบนี้")}>
          {doc.debitNotes?.length ? (
            <>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                columns={debitNoteColumns}
                dataSource={doc.debitNotes}
              />
              <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0, textAlign: "right" }}>
                {t("ยอดหนี้หลังปรับ (เฉพาะใบที่อนุมัติแล้ว):")}{" "}
                <Typography.Text strong>{money.format(doc.adjustedTotalAmount ?? doc.totalAmount)}</Typography.Text>
              </Typography.Paragraph>
            </>
          ) : (
            <Typography.Text type="secondary">{t("ยังไม่มีใบเพิ่มหนี้")}</Typography.Text>
          )}
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            {t("หมายเหตุ: ยอดในใบสำคัญจ่ายยังคิดจากใบสั่งซื้อ ไม่ได้รวมใบตั้งหนี้/ใบเพิ่มหนี้")}
          </Typography.Paragraph>
        </Card>
      ) : null}

      {!isInvoice ? (
        <Card title={t("เอกสารแนบ")}>
          <DocumentAttachmentsPanel
            documentType={attachmentType}
            documentId={doc.id}
            canEdit={perms.canEdit && doc.status !== "CANCELLED"}
            emptyText={t("ไม่มีเอกสารแนบ")}
          />
        </Card>
      ) : null}

      <ESignatureHistoryCard documentId={doc.id} />

      {!isInvoice ? (
        <Card title={t("ประวัติการดำเนินการ")}>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={eventColumns}
            dataSource={(doc as ApDocument).events ?? []}
            locale={{ emptyText: t("ยังไม่มีประวัติ") }}
            scroll={{ x: 640 }}
          />
        </Card>
      ) : null}

      <Modal
        open={cancelOpen}
        title={t("ยกเลิก{label} {docNo}", { label: apShortLabel(config), docNo: doc.docNo })}
        okText={t("ยืนยันยกเลิก")}
        okButtonProps={{ danger: true, disabled: isApproved && !cancelReason.trim() }}
        confirmLoading={cancelMutation.isPending}
        onOk={() => void handleCancel()}
        onCancel={() => setCancelOpen(false)}
      >
        <Typography.Paragraph>
          {isApproved
            ? t("ใบนี้อนุมัติแล้ว ต้องระบุเหตุผลในการยกเลิก")
            : t("ยกเลิกแล้วแก้ไขหรืออนุมัติต่อไม่ได้")}
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          maxLength={2000}
          placeholder={isApproved ? t("เหตุผล (บังคับ)") : t("เหตุผล (ไม่บังคับ)")}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
        />
      </Modal>

      <Modal
        open={rejectOpen}
        title={t("ไม่อนุมัติ{label} {docNo}", { label: apShortLabel(config), docNo: doc.docNo })}
        okText={t("ยืนยันไม่อนุมัติ")}
        okButtonProps={{ danger: true, disabled: rejectReason.trim().length < 5 }}
        confirmLoading={rejectMutation.isPending}
        onOk={() => void handleReject()}
        onCancel={() => setRejectOpen(false)}
        destroyOnHidden
      >
        <Typography.Paragraph>{t("ผู้สร้างจะแก้ไขแล้วส่งอนุมัติใหม่ได้")}</Typography.Paragraph>
        <Input.TextArea
          rows={3}
          maxLength={2000}
          placeholder={t("เหตุผลที่ไม่อนุมัติ (อย่างน้อย 5 ตัวอักษร)")}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
        />
      </Modal>

      <Modal
        open={refundOpen}
        title={t("ดำเนินการรับเงินคืน — {docNo}", { docNo: doc.docNo })}
        okText={t("บันทึกรับเงินคืน")}
        confirmLoading={settlement.refund.isPending}
        onOk={() => refundForm.submit()}
        onCancel={() => setRefundOpen(false)}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          {t("ยอดที่รับคืนได้อีก {amount} บาท · รับเป็นงวดได้ ปิดยอดเมื่อรับครบ", { amount: money.format(outstanding) })}
        </Typography.Paragraph>
        <Form<RefundForm>
          form={refundForm}
          layout="vertical"
          initialValues={{ refundDate: dayjs(), amount: outstanding }}
          onFinish={(values) => void handleRefund(values)}
        >
          <Form.Item name="refundDate" label={t("วันที่รับเงิน")} rules={[{ required: true, message: t("ระบุวันที่") }]}>
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="amount"
            label={t("ยอดรับจริง (บาท)")}
            rules={[
              { required: true, message: t("ระบุยอดรับจริง") },
              {
                validator: (_, value?: number) =>
                  value !== undefined && value > outstanding + 0.0001
                    ? Promise.reject(new Error(t("เกินยอดคงเหลือ {amount} บาท", { amount: money.format(outstanding) })))
                    : Promise.resolve(),
              },
            ]}
          >
            <InputNumber min={0.01} precision={2} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="companyBankAccountId"
            label={t("บัญชีที่รับเงินเข้า")}
            rules={[{ required: true, message: t("เลือกบัญชี") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={bankQuery.isLoading}
              placeholder={t("เลือกบัญชีธนาคารของบริษัท")}
              options={(bankQuery.data ?? [])
                .filter((bank) => bank.isActive)
                .map((bank) => ({
                  value: bank.id,
                  label: `${bank.bankName} ${bank.accountNumber} (${bank.accountName})`,
                }))}
            />
          </Form.Item>
          <Form.Item name="referenceNo" label={t("เลขที่อ้างอิง / หลักฐานการโอน")}>
            <Input maxLength={100} placeholder={t("เช่น เลขที่สลิป — แนบไฟล์หลักฐานได้ที่ส่วนเอกสารแนบ")} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={cancelRefundTarget !== null}
        title={t("ยกเลิกรายการรับเงินคืน")}
        okText={t("ยืนยันยกเลิก")}
        okButtonProps={{ danger: true, disabled: !cancelRefundReason.trim() }}
        confirmLoading={settlement.cancelRefund.isPending}
        onOk={() => void handleCancelRefund()}
        onCancel={() => setCancelRefundTarget(null)}
        destroyOnHidden
      >
        <Typography.Paragraph>
          {t("ยกเลิกรับเงินคืน {amount} บาท แล้วยอดคงเหลือของใบลดหนี้จะเพิ่มกลับ", { amount: money.format(cancelRefundTarget?.amount ?? 0) })}
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          maxLength={2000}
          placeholder={t("เหตุผล (บังคับ)")}
          value={cancelRefundReason}
          onChange={(event) => setCancelRefundReason(event.target.value)}
        />
      </Modal>

      <Modal
        open={creditOpen}
        title={t("ใช้เครดิตผู้ขาย — {docNo}", { docNo: doc.docNo })}
        okText={t("ยืนยันใช้เครดิต")}
        confirmLoading={settlement.applyCredit.isPending}
        onOk={() => creditForm.submit()}
        onCancel={() => setCreditOpen(false)}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          {t("เครดิตคงเหลือ {amount} บาท · ใช้ได้กับใบตั้งหนี้ที่อนุมัติแล้วของ {name} เท่านั้น และต้องไม่ทำให้ยอด AP ต่ำกว่ายอดที่วางบิล/มี PV/จ่ายแล้ว", { amount: money.format(outstanding), name: doc.creditorName })}
        </Typography.Paragraph>
        <Form<{ apDocumentId: string; amount: number }>
          form={creditForm}
          layout="vertical"
          initialValues={{ amount: outstanding }}
          onFinish={(values) => void handleUseCredit(values)}
        >
          <Form.Item
            name="apDocumentId"
            label={t("ใบตั้งหนี้ที่จะหักเครดิต")}
            rules={[{ required: true, message: t("เลือกใบตั้งหนี้") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={apOptionsQuery.isFetching}
              placeholder={t("เลือกใบตั้งหนี้")}
              notFoundContent={t("ผู้ขายรายนี้ยังไม่มีใบตั้งหนี้ที่อนุมัติแล้ว")}
              options={(apOptionsQuery.data?.items ?? []).map((invoice) => ({
                value: invoice.id,
                label: `${invoice.docNo}${invoice.supplierDocNo ? ` (${invoice.supplierDocNo})` : ""} · ${money.format(invoice.totalAmount)}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label={t("ยอดเครดิตที่ใช้ (บาท)")}
            rules={[
              { required: true, message: t("ระบุยอด") },
              {
                validator: (_, value?: number) =>
                  value !== undefined && value > outstanding + 0.0001
                    ? Promise.reject(new Error(t("เกินเครดิตคงเหลือ {amount} บาท", { amount: money.format(outstanding) })))
                    : Promise.resolve(),
              },
            ]}
          >
            <InputNumber min={0.01} precision={2} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
