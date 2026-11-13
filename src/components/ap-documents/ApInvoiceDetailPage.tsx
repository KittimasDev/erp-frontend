"use client";

import { useState } from "react";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import CancelReasonModal from "@/components/common/CancelReasonModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, FilePdfOutlined, MoreOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import {
  useApInvoiceActionMutation,
  useApInvoiceDetailQuery,
  useApInvoicePvMutation,
} from "@/hooks/ap-documents/useApDocuments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { purchaseJournalQueryKey } from "@/hooks/purchase-journal/usePurchaseJournal";
import { VOUCHER_STATUS_COLOR, VOUCHER_STATUS_LABEL } from "@/types/payment-vouchers";
import { PO_CHARGE_TYPE_LABEL, tStatus } from "@/types/purchase-orders";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  AP_PAYMENT_STATUS_COLOR,
  AP_PAYMENT_STATUS_LABEL,
  AP_VAT_MODE_LABEL,
  type ApAdjustmentHistory,
  type ApBillingLink,
  type ApDocumentItem,
  type ApVoucherRef,
  type DepositSource,
} from "@/types/ap-documents";

import AdjustDebtModal from "./AdjustDebtModal";
import { AP_DOCUMENT_CONFIG, apEventLabel, apShortLabel, formatThaiDate, money, termText } from "./apDocumentConfig";
import PageHeader from "@/components/common/PageHeader";

const config = AP_DOCUMENT_CONFIG.invoice;
const BILLING_CREATE_PATH = "/finance/payables/billing-notes/create";
const BILLING_PATH = "/finance/payables/billing-notes";
const PV_PATH = "/finance/payables/payment-vouchers";

/** 11/10/2569 10:30 — พ.ศ. เหมือนวันที่อื่นในหน้า */
const dt = (value?: string | null) => {
  if (!value) return "—";
  const d = dayjs(value);
  return d.format("DD/MM/BBBB HH:mm");
};

/**
 * รายละเอียดใบตั้งหนี้ (read-only ตามสถานะ) 11 section
 * หลังอนุมัติ: ปุ่ม "ปรับหนี้" (ซ่อนถ้าวางบิลแล้ว) / "ออกใบวางบิล" (primary)
 */
export default function ApInvoiceDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const perms = useScreenActionPermissions(config.screenCode);
  const query = useApInvoiceDetailQuery(id);
  const action = useApInvoiceActionMutation(id);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const { cancelQueue } = useApInvoicePvMutation(id);
  const [reasonFor, setReasonFor] = useState<"reject" | "cancel" | null>(null);
  // คิวรอสร้าง PV ที่กำลังจะยกเลิก (เปิด Modal กรอกเหตุผล)
  const [cancelQueueId, setCancelQueueId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const d = query.data;

  if (query.isLoading) return <Spin />;
  if (!d) {
    return (
      <Result
        status="404"
        title={t("ไม่พบ{label}", { label: apShortLabel(config) })}
        extra={<Button onClick={() => router.push(config.basePath)}>{t("กลับรายการ")}</Button>}
      />
    );
  }

  const status = d.status;
  const run = async (a: "submit" | "approve", okText: string) => {
    try {
      await action.mutateAsync({ action: a });
      void queryClient.invalidateQueries({ queryKey: purchaseJournalQueryKey });
      message.success(okText);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("ดำเนินการไม่สำเร็จ"));
    }
  };
  const confirmApprove = () =>
    modal.confirm({
      title: t("อนุมัติใบตั้งหนี้ {docNo}?", { docNo: d.docNo }),
      content: `${t("ยอดตั้งหนี้ {amount} บาท", { amount: money.format(d.totalAmount) })}${d.deposit.thisDeduct > 0 ? ` · ${t("หักมัดจำ {amount} บาท", { amount: money.format(d.deposit.thisDeduct) })}` : ""} · ${t("อนุมัติแล้วแก้ไขยอดโดยตรงไม่ได้")}`,
      okText: t("อนุมัติ"),
      onOk: () => run("approve", t("อนุมัติแล้ว")),
    });
  const submitReason = async () => {
    if (!reasonFor) return;
    try {
      await action.mutateAsync({ action: reasonFor, reason: reason.trim() });
      void queryClient.invalidateQueries({ queryKey: purchaseJournalQueryKey });
      message.success(reasonFor === "reject" ? t("บันทึกการไม่อนุมัติแล้ว") : t("ยกเลิกแล้ว"));
      setReasonFor(null);
      setReason("");
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("ดำเนินการไม่สำเร็จ"));
    }
  };
  const handlePrint = async () => {
    const { generateApDocumentPdf } = await import("@/utils/generateApDocumentPdf");
    void generateApDocumentPdf(d);
  };

  const editable = (status === "DRAFT" || status === "REJECTED") && perms.canEdit;

  const moreItems: MenuProps["items"] = [
    { key: "print-invoice", label: t("พิมพ์ใบตั้งหนี้ (PDF)"), onClick: () => void handlePrint() },
    status === "APPROVED" && perms.canEdit && d.billedAmount <= 0
      ? { key: "adjust", label: t("ปรับหนี้"), onClick: () => setAdjustOpen(true) }
      : null,
    { key: "back", label: t("กลับรายการ"), onClick: () => router.push(config.basePath) },
    status !== "CANCELLED" && perms.canEdit
      ? { type: "divider" as const, key: "divider" }
      : null,
    status !== "CANCELLED" && perms.canEdit
      ? { key: "cancel", label: t("ยกเลิกใบตั้งหนี้"), danger: true, onClick: () => setReasonFor("cancel") }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const itemColumns: ColumnsType<ApDocumentItem> = [
    { title: "#", key: "no", width: 48, align: "center", render: (_v, _r, i) => i + 1 },
    { title: t("รหัสสินค้า"), dataIndex: "itemCode", width: 130, render: (v: string | null) => v || "—" },
    { title: t("รายละเอียด"), dataIndex: "description" },
    {
      title: t("จำนวนรับจริง"),
      dataIndex: "quantity",
      align: "right",
      width: 120,
      render: (v: number) => v.toLocaleString("th-TH", { maximumFractionDigits: 3 }),
    },
    { title: t("หน่วย"), dataIndex: "unitLabel", width: 80, render: (v: string | null) => v || "—" },
    { title: t("ราคา/หน่วย"), dataIndex: "unitPrice", align: "right", width: 120, render: (v: number) => money.format(v) },
    { title: t("ส่วนลด"), dataIndex: "discountAmount", align: "right", width: 100, render: (v?: number) => money.format(v ?? 0) },
    { title: t("มูลค่า"), dataIndex: "amount", align: "right", width: 130, render: (v: number) => money.format(v) },
  ];
  const depositColumns: ColumnsType<DepositSource> = [
    { title: t("ใบสำคัญจ่าย (มัดจำ)"), dataIndex: "voucherNo", render: (v: string, r) => <Link href={`/finance/payables/payment-vouchers/${r.voucherId}`}>{v}</Link> },
    { title: t("เลขที่รายการจ่าย"), dataIndex: "paymentNo", render: (v?: string) => v ?? "—" },
    { title: t("วันที่จ่ายจริง"), dataIndex: "paymentDate", render: (v?: string) => formatThaiDate(v) },
    { title: t("ยอดมัดจำ"), dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    { title: t("ภาษีที่หักไปแล้ว"), dataIndex: "whtAmount", align: "right", render: (v: number) => money.format(v) },
  ];
  const adjustColumns: ColumnsType<ApAdjustmentHistory> = [
    { title: t("เลขที่เอกสาร"), dataIndex: "docNo", render: (v: string, r) => <Link href={`${AP_DOCUMENT_CONFIG.debitNote.basePath}/${r.id}`}>{v}</Link> },
    { title: t("ประเภท"), dataIndex: "docType", render: (v: string) => (v === "CREDIT_NOTE" ? t("ใบลดหนี้") : t("ใบเพิ่มหนี้")) },
    { title: t("วันที่เอกสาร"), dataIndex: "docDate", render: (v: string) => formatThaiDate(v) },
    { title: t("เหตุผลการปรับหนี้"), dataIndex: "reason", render: (v?: string) => v ?? "—" },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "signedAmount",
      align: "right",
      render: (v: number) => `${v >= 0 ? "+" : "−"}${money.format(Math.abs(v))}`,
    },
    { title: t("สถานะ"), key: "used", render: () => <Tag color="green">{t("ใช้ปรับหนี้แล้ว")}</Tag> },
    { title: t("ปรับเมื่อ / โดย"), key: "when", render: (_v, r) => `${dt(r.appliedAt)} · ${r.appliedByName ?? "—"}` },
    {
      title: "",
      key: "a",
      width: 130,
      render: (_v, r) => (
        <Link href={`${AP_DOCUMENT_CONFIG.debitNote.basePath}/${r.id}`}>
          <Button size="small">{t("ดูรายละเอียด")}</Button>
        </Link>
      ),
    },
  ];
  const billingColumns: ColumnsType<ApBillingLink> = [
    { title: t("เลขที่ใบวางบิล"), dataIndex: "billingNoteNo", render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: t("วันที่เอกสาร"), dataIndex: "billingNoteDate", render: (v?: string) => formatThaiDate(v) },
    { title: t("ยอดที่นำ AP นี้ไปวางบิล"), dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    { title: t("สถานะใบวางบิล"), key: "bs", render: (_v, r) => (r.status === "CANCELLED" ? <Tag>{tStatus("ยกเลิก")}</Tag> : <Tag color="blue">{tStatus(r.billingNoteStatus ?? "ยืนยันแล้ว")}</Tag>) },
    { title: t("สถานะการออก PV"), dataIndex: "pvStatus", render: (v?: string) => (v ? tStatus(v) : t("ยังไม่ออก PV")) },
    {
      title: "",
      key: "a",
      width: 130,
      render: (_v, r) => (
        <Link href={`${BILLING_PATH}/${r.billingNoteId}`}>
          <Button size="small">{t("ดูรายละเอียด")}</Button>
        </Link>
      ),
    },
  ];
  const voucherColumns: ColumnsType<ApVoucherRef> = [
    {
      title: t("เลขที่ PV"),
      key: "no",
      render: (_v, r) =>
        r.voucherId ? (
          <Link href={`${PV_PATH}/${r.voucherId}`}>{r.voucherNo}</Link>
        ) : (
          <Typography.Text type="secondary">{t("รอสร้างใบสำคัญจ่าย ({queueNo})", { queueNo: r.queueNo ?? "" })}</Typography.Text>
        ),
    },
    { title: t("วันที่เอกสาร"), dataIndex: "docDate", width: 120, render: (v: string) => formatThaiDate(v) },
    { title: t("จำนวนเงิน"), dataIndex: "amount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: t("สถานะ PV"),
      dataIndex: "status",
      width: 190,
      render: (v: string) =>
        v === "WAITING_PV" ? (
          <Tag color="gold">{t("รอสร้างใบสำคัญจ่าย")}</Tag>
        ) : (
          <Tag color={VOUCHER_STATUS_COLOR[v] ?? "default"}>{tStatus(VOUCHER_STATUS_LABEL[v] ?? v)}</Tag>
        ),
    },
    {
      title: t("สถานะการจ่ายเงินจริง"),
      key: "pay",
      width: 200,
      render: (_v, r) =>
        r.paymentStatus === "PAID" ? (
          <span>
            <Tag color="green">{t("จ่ายแล้ว")}</Tag>
            {r.paymentId && r.paymentNo ? (
              <Link href={`/finance/payables/payment-records/${r.paymentId}`}>{r.paymentNo}</Link>
            ) : null}
            {r.paymentDate ? ` · ${formatThaiDate(r.paymentDate)}` : ""}
          </span>
        ) : (
          <Tag>{t("ยังไม่จ่าย")}</Tag>
        ),
    },
    {
      title: "",
      key: "a",
      width: 210,
      render: (_v, r) => (
        <Space>
          {r.voucherId ? (
            <Link href={`${PV_PATH}/${r.voucherId}`}>
              <Button size="small">{t("ดูรายละเอียด")}</Button>
            </Link>
          ) : (
            <Link href={PV_PATH}>
              <Button size="small">{t("ไปสร้างใบสำคัญจ่าย")}</Button>
            </Link>
          )}
          {r.canCancelQueue && r.queueItemId && perms.canEdit ? (
            <Button
              size="small"
              danger
              loading={cancelQueue.isPending}
              onClick={() => setCancelQueueId(r.queueItemId as string)}
            >
              {t("ยกเลิกรายการ")}
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const billingDisabledReason = d.billingBlockReason;
  // PO ต้นทางยกเลิกแล้ว → ปิดส่งอนุมัติ/อนุมัติ (backend ปฏิเสธซ้ำ) คงปุ่มยกเลิกเอกสารไว้
  const poCancelled = d.purchaseOrderStatus === "CANCELLED";

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{t("ใบตั้งหนี้")} {d.docNo}</>}
        meta={
          <>
<Tag color={AP_DOCUMENT_STATUS_COLOR[status]}>{tStatus(AP_DOCUMENT_STATUS_LABEL[status] ?? status)}</Tag>
{status === "APPROVED" ? (
              <Tag color={AP_PAYMENT_STATUS_COLOR[d.paymentStatus]}>{tStatus(AP_PAYMENT_STATUS_LABEL[d.paymentStatus] ?? d.paymentStatus)}</Tag>
            ) : null}
          </>
        }
        actions={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(config.basePath)}>
              {t("กลับรายการ")}
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={() => void handlePrint()}>
              {t("พิมพ์ PDF")}
            </Button>
            {editable ? (
              <>
                <Button onClick={() => router.push(`${config.basePath}/${id}/edit`)}>{t("แก้ไข")}</Button>
                <Button type="primary" loading={action.isPending} disabled={poCancelled} onClick={() => void run("submit", status === "REJECTED" ? t("ส่งอนุมัติใหม่แล้ว") : t("ส่งอนุมัติแล้ว"))}>
                  {status === "REJECTED" ? t("ส่งอนุมัติใหม่") : t("ส่งอนุมัติ")}
                </Button>
              </>
            ) : null}
            {status === "PENDING_APPROVAL" && perms.canApprove ? (
              <>
                <Button type="primary" loading={action.isPending} disabled={poCancelled} onClick={confirmApprove}>
                  {t("อนุมัติ")}
                </Button>
                <Button danger onClick={() => setReasonFor("reject")}>
                  {t("ไม่อนุมัติ")}
                </Button>
              </>
            ) : null}
            {status === "APPROVED" && perms.canEdit ? (
              <Tooltip title={billingDisabledReason}>
                <span>
                  <Button
                    type="primary"
                    disabled={!d.canIssueBilling}
                    onClick={() => router.push(`${BILLING_CREATE_PATH}?apId=${id}`)}
                  >
                    {t("ออกใบวางบิล")}
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {/* ปรับหนี้ / ยกเลิก / พิมพ์ใบตั้งหนี้ */}
            <Dropdown menu={{ items: moreItems }} trigger={["click"]} placement="bottomRight">
              <Button icon={<MoreOutlined />}>{t("เพิ่มเติม")}</Button>
            </Dropdown>
          
          </>
        }
      />

      <Card>
        {poCancelled ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 8 }}
            title={t("PO {poNo} ยกเลิกแล้ว กรุณายกเลิกเอกสารนี้", { poNo: d.purchaseOrderNo ?? "" })}
            description={t("ส่งอนุมัติและอนุมัติไม่ได้ ยังยกเลิกใบตั้งหนี้ได้จากเมนูเพิ่มเติม")}
          />
        ) : null}
        {status === "REJECTED" && d.rejectReason ? (
          <Alert type="error" showIcon title={t("ไม่อนุมัติ — แก้ไขแล้วส่งอนุมัติใหม่ได้")} description={d.rejectReason} />
        ) : null}
        {status === "CANCELLED" ? (
          <Alert type="warning" showIcon title={`${t("ยกเลิกเมื่อ {time}", { time: dt(d.cancelledAt) })}${d.cancelledByName ? ` ${t("โดย {name}", { name: d.cancelledByName })}` : ""}`} description={d.cancelReason ?? undefined} />
        ) : null}
        {status === "APPROVED" && !d.canIssueBilling && billingDisabledReason ? (
          <Alert type="info" showIcon title={t("ปุ่มออกใบวางบิลปิดอยู่: {reason}", { reason: billingDisabledReason })} />
        ) : null}
      </Card>

      <Card title={t("1. ข้อมูลเอกสาร")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label={t("เลขที่ใบตั้งหนี้")}>{d.docNo}</Descriptions.Item>
          <Descriptions.Item label={t("วันที่ตั้งหนี้")}>{formatThaiDate(d.docDate)}</Descriptions.Item>
          <Descriptions.Item label={t("สถานะเอกสาร")}>
            <Tag color={AP_DOCUMENT_STATUS_COLOR[status]}>{tStatus(AP_DOCUMENT_STATUS_LABEL[status] ?? status)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("ผู้ขาย")} span={2}>
            {d.creditorCode} {d.creditorName}
          </Descriptions.Item>
          <Descriptions.Item label={t("เลขประจำตัวผู้เสียภาษี")}>{d.creditorTaxId || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("2. เอกสารอ้างอิง")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label={t("เลขที่รายการจ่ายเงิน")}>{d.paymentListNo ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("เลขที่ PO")}>
            {d.purchaseOrderId ? <Link href={`/purchase-orders/${d.purchaseOrderId}`}>{d.purchaseOrderNo}</Link> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("เลขที่ GRN")}>{d.goodsReceiptNo ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("เลขที่ใบแจ้งหนี้ Supplier")}>{d.supplierDocNo || "—"}</Descriptions.Item>
          <Descriptions.Item label={t("วันที่ใบแจ้งหนี้")}>{formatThaiDate(d.supplierDocDate)}</Descriptions.Item>
          <Descriptions.Item label={t("เลขที่ใบกำกับภาษี")}>{d.taxInvoiceNo || "—"}</Descriptions.Item>
          <Descriptions.Item label={t("วันที่ใบกำกับภาษี")}>{formatThaiDate(d.taxInvoiceDate)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("3. รายการสินค้า / บริการ")} size="small">
        <Table
          size="small"
          rowKey="id"
          columns={itemColumns}
          dataSource={d.items}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: t("ไม่มีรายการสินค้า (ใบตั้งหนี้ค่าใช้จ่ายเพิ่มเติมจาก PO)") }}
        />
      </Card>

      {(d.charges?.length ?? 0) > 0 ? (
        <Card title={t("3.1 ค่าใช้จ่ายเพิ่มเติมจาก PO ที่ตั้งหนี้ในใบนี้")} size="small">
          <Table
            size="small"
            rowKey="poChargeId"
            pagination={false}
            dataSource={d.charges}
            scroll={{ x: 800 }}
            columns={[
              {
                title: t("ประเภท / รายละเอียด"),
                key: "desc",
                render: (_v, c) => (
                  <span>
                    <Tag>{t(PO_CHARGE_TYPE_LABEL[c.chargeType] ?? c.chargeType)}</Tag> {c.description}
                  </span>
                ),
              },
              { title: t("ยอดก่อน VAT"), dataIndex: "amountBeforeVat", align: "right", width: 140, render: (v: number) => money.format(v) },
              { title: "VAT", key: "rate", align: "right", width: 90, render: (_v, c) => `${c.vatRate}%` },
              { title: t("VAT (บาท)"), dataIndex: "vatAmount", align: "right", width: 120, render: (v: number) => money.format(v) },
              { title: t("รวม"), dataIndex: "totalAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
              {
                title: t("หัก ณ ที่จ่าย"),
                key: "wht",
                align: "right",
                width: 150,
                render: (_v, c) => (c.whtAmount > 0 ? `${money.format(c.whtAmount)} (${c.whtRate}%)` : "—"),
              },
            ]}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("ค่าใช้จ่ายรวมอยู่ในยอดตั้งหนี้ด้านล่างแล้ว (ค่าสินค้ารวม VAT {amount}) · ยกเลิกใบนี้แล้ววงเงินค่าใช้จ่ายคืนให้ PO อัตโนมัติ", { amount: money.format(d.goodsAmount ?? 0) })}
          </Typography.Text>
        </Card>
      ) : null}

      <Card title={t("4. สรุปยอดตั้งหนี้และยอดคงเหลือ (บาท)")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label={t("มูลค่าก่อน VAT")}>{money.format(d.subtotalAmount)}</Descriptions.Item>
          <Descriptions.Item
            label={
              (d.charges?.length ?? 0) > 0
                ? t("VAT (สินค้า + ค่าใช้จ่าย)")
                : t("VAT {rate}% ({mode})", { rate: d.vatRate, mode: t(AP_VAT_MODE_LABEL[d.vatMode] ?? d.vatMode) })
            }
          >
            {money.format(d.vatAmount)}
          </Descriptions.Item>
          <Descriptions.Item label={t("ยอดตั้งหนี้เดิม")}>
            <Typography.Text strong>{money.format(d.totalAmount)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t("ยอดเพิ่มหนี้ (+)")}>{money.format(d.appliedDebits)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดลดหนี้ (−)")}>{money.format(d.appliedCredits)}</Descriptions.Item>
          <Descriptions.Item label={t("มัดจำที่หัก (−)")}>{money.format(d.deposit.thisDeduct)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดที่ต้องชำระ")}>{money.format(d.netPayableAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ฐานภาษีหัก ณ ที่จ่าย")}>
            {Number(d.whtAmount) > 0 ? money.format(d.whtBaseAmount) : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("อัตรา / ยอด WHT ที่จะหักตอนจ่าย")}>
            {Number(d.whtAmount) > 0
              ? `${Number(d.whtRate)}% · ${money.format(d.whtAmount)}`
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("ยอดโอนสุทธิโดยประมาณ")}>
            <Typography.Text strong>
              {money.format(d.netTransferAmount ?? Math.max(d.netPayableAmount - (d.whtAmount ?? 0), 0))}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t("ยอดชำระเงินจริง (−)")}>{money.format(d.paidAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดเจ้าหนี้คงเหลือ")}>
            <Typography.Text strong>{money.format(d.remainingAmount)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t("ยอด PV ค้างดำเนินการ")}>{money.format(d.pvOpenAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดที่ออก PV เพิ่มได้")}>
            <Typography.Text strong>{money.format(d.issuablePvAmount)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t("สถานะการชำระเงิน")}>
            <Tag color={AP_PAYMENT_STATUS_COLOR[d.paymentStatus]}>{tStatus(AP_PAYMENT_STATUS_LABEL[d.paymentStatus] ?? d.paymentStatus)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("วางบิลไปแล้ว")}>{money.format(d.billedAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดพร้อมวางบิล")} span={2}>
            {money.format(d.billableAmount)}
          </Descriptions.Item>
        </Descriptions>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t("ยอดเจ้าหนี้คงเหลือ = ตั้งหนี้ + เพิ่มหนี้ − ลดหนี้ − มัดจำ − ยอดชำระจริง · WHT หักตอนออก PV/จ่ายจริง (ฐานก่อน VAT) ไม่หักซ้ำกับมัดจำที่หักไปแล้ว · สถานะชำระคิดจากยอดที่ชำระจริงเท่านั้น")}
        </Typography.Text>
      </Card>

      <Card title={t("5. การหักเงินล่วงหน้า / มัดจำ")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label={t("มัดจำที่บันทึกจ่ายจริงแล้วทั้งหมด")}>{money.format(d.deposit.totalPaid)}</Descriptions.Item>
          <Descriptions.Item label={t("ใช้กับ AP ใบอื่นแล้ว")}>{money.format(d.deposit.usedByOthers)}</Descriptions.Item>
          <Descriptions.Item label={t("หักกับ AP ใบนี้")}>
            <Typography.Text strong>{money.format(d.deposit.thisDeduct)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t("มัดจำคงเหลือ (เก็บไว้หักใบถัดไป)")}>{money.format(d.deposit.remainingAfterThis)}</Descriptions.Item>
          <Descriptions.Item label={t("ภาษีหัก ณ ที่จ่ายที่หักไปแล้วตอนจ่ายมัดจำ")} span={2}>
            {money.format(d.deposit.whtWithheld)} {t("(การหักมัดจำใช้ยอดเต็ม ไม่หักภาษีซ้ำ)")}
          </Descriptions.Item>
        </Descriptions>
        <Table size="small" rowKey="voucherId" columns={depositColumns} dataSource={d.deposit.sources} pagination={false} locale={{ emptyText: t("ยังไม่มีมัดจำที่บันทึกจ่ายจริงของรายการจ่ายเงินนี้") }} />
      </Card>

      <Card title={t("6. เงื่อนไขการชำระ")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label={t("เงื่อนไข (จาก PO / รายการจ่ายเงิน)")}>{termText(d.paymentTerm)}</Descriptions.Item>
          <Descriptions.Item label={t("วันครบกำหนดชำระ")}>{formatThaiDate(d.dueDate)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("7. ประวัติการปรับหนี้")} size="small">
        <Table size="small" rowKey="id" columns={adjustColumns} dataSource={d.adjustments} pagination={false} locale={{ emptyText: t("ยังไม่มีการปรับหนี้") }} />
      </Card>

      <Card title={t("8. ใบวางบิลที่เกี่ยวข้อง")} size="small">
        <Table size="small" rowKey="id" columns={billingColumns} dataSource={d.billingNotes} pagination={false} locale={{ emptyText: t("ยังไม่ได้นำไปวางบิล") }} />
      </Card>

      <Card title={t("9. เอกสารการจ่ายเงินที่เกี่ยวข้อง")} size="small">
        <Table
          size="small"
          rowKey={(r) => r.voucherId ?? r.queueItemId ?? r.docDate}
          columns={voucherColumns}
          dataSource={d.vouchers}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: t("ยังไม่มีใบสำคัญจ่ายหรือรายการรอสร้างใบสำคัญจ่าย") }}
        />
      </Card>

      <Card title={t("10. หมายเหตุและเอกสารแนบ")} size="small">
        <Typography.Paragraph>{d.remark || "—"}</Typography.Paragraph>
        <DocumentAttachmentsPanel documentType="AP_INVOICE" documentId={d.id} canEdit={editable} emptyText={t("ไม่มีเอกสารแนบ")} />
      </Card>

      <ESignatureHistoryCard documentId={d.id} />
      <Card title={t("11. ผู้ดำเนินการและประวัติการอนุมัติ")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label={t("ผู้จัดทำ / วันที่สร้าง")}>{d.createdByName ?? "—"} · {dt(d.createdAt)}</Descriptions.Item>
          <Descriptions.Item label={t("ผู้ส่งอนุมัติ")}>{d.submittedByName ? `${d.submittedByName} · ${dt(d.submittedAt)}` : "—"}</Descriptions.Item>
          <Descriptions.Item label={t("ผู้อนุมัติ / วันที่อนุมัติ")}>{d.approvedByName ? `${d.approvedByName} · ${dt(d.approvedAt)}` : "—"}</Descriptions.Item>
          {d.rejectedByName ? <Descriptions.Item label={t("ไม่อนุมัติโดย")}>{d.rejectedByName} · {dt(d.rejectedAt)}</Descriptions.Item> : null}
        </Descriptions>
        {d.events.length === 0 ? (
          <Typography.Text type="secondary">{t("ยังไม่มีประวัติ")}</Typography.Text>
        ) : (
          <Timeline
            items={d.events.map((e) => ({
              key: e.id,
              content: (
                <span>
                  <Tag>{apEventLabel(e.action)}</Tag>
                  {e.performedByName ?? "—"} · {dt(e.performedAt)}
                  {e.note ? <div style={{ color: "#8a94a6" }}>{e.note}</div> : null}
                </span>
              ),
            }))}
          />
        )}
      </Card>

      <AdjustDebtModal open={adjustOpen} detail={d} onClose={() => setAdjustOpen(false)} />

      <Modal
        open={reasonFor !== null}
        title={reasonFor === "reject" ? t("ไม่อนุมัติใบตั้งหนี้") : t("ยกเลิกใบตั้งหนี้")}
        okText={reasonFor === "reject" ? t("ไม่อนุมัติ") : t("ยกเลิกใบตั้งหนี้")}
        okButtonProps={{
          danger: true,
          disabled: reasonFor === "reject" ? reason.trim().length < 5 : status === "APPROVED" && reason.trim().length < 5,
        }}
        cancelText={t("ปิด")}
        confirmLoading={action.isPending}
        onOk={() => void submitReason()}
        onCancel={() => {
          setReasonFor(null);
          setReason("");
        }}
        destroyOnHidden
      >
        <Input.TextArea
          rows={3}
          maxLength={2000}
          placeholder={reasonFor === "cancel" && status !== "APPROVED" ? t("เหตุผล (ไม่บังคับสำหรับใบที่ยังไม่อนุมัติ)") : t("เหตุผล (อย่างน้อย 5 ตัวอักษร)")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {reasonFor === "cancel" ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("ยกเลิกแล้วคืนมัดจำที่จองไว้ และปล่อยใบเพิ่มหนี้/ลดหนี้ที่เคยนำมาปรับให้ใช้ได้อีก · ยกเลิกไม่ได้ถ้าถูกนำไปวางบิลหรือมีการจ่ายแล้ว")}
          </Typography.Text>
        ) : null}
      </Modal>

      <CancelReasonModal
        open={Boolean(cancelQueueId)}
        title={t("ยกเลิกรายการรอสร้างใบสำคัญจ่าย")}
        okText={t("ยกเลิกรายการ")}
        confirmLoading={cancelQueue.isPending}
        onClose={() => setCancelQueueId(null)}
        onConfirm={async (reason) => {
          if (!cancelQueueId) return;
          try {
            await cancelQueue.mutateAsync({ queueItemId: cancelQueueId, reason });
            message.success(t("ยกเลิกรายการรอสร้างใบสำคัญจ่ายแล้ว"));
            setCancelQueueId(null);
          } catch (e) {
            message.error(e instanceof Error ? e.message : t("ยกเลิกรายการไม่สำเร็จ"));
          }
        }}
      >
        <Typography.Paragraph type="secondary">
          {t("ยอดจะกลับมาออกใบสำคัญจ่ายได้อีกครั้ง")}
        </Typography.Paragraph>
      </CancelReasonModal>
    </Space>
  );
}
