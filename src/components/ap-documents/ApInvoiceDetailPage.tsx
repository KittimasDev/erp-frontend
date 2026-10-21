"use client";

import { useState } from "react";
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
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  MoreOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import {
  useApInvoiceActionMutation,
  useApInvoiceDetailQuery,
  useApInvoicePvMutation,
} from "@/hooks/ap-documents/useApDocuments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  purchaseJournalQueryKey,
  usePurchaseJournalByDocQuery,
} from "@/hooks/purchase-journal/usePurchaseJournal";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { VOUCHER_STATUS_COLOR, VOUCHER_STATUS_LABEL } from "@/types/payment-vouchers";
import { PO_CHARGE_TYPE_LABEL } from "@/types/purchase-orders";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  AP_EVENT_LABEL,
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
import ApJournalVoucher from "./ApJournalVoucher";
import { buildVoucherDescription, pickVoucherReference } from "./apJournalVoucher.utils";
import { AP_DOCUMENT_CONFIG, formatThaiDate, money, termText } from "./apDocumentConfig";

const config = AP_DOCUMENT_CONFIG.invoice;
const BILLING_CREATE_PATH = "/finance/payables/billing-notes/create";
const BILLING_PATH = "/finance/payables/billing-notes";
const PV_PATH = "/finance/payables/payment-vouchers";

/** 11/10/2569 10:30 — พ.ศ. เหมือนวันที่อื่นในหน้า */
const dt = (value?: string | null) => {
  if (!value) return "—";
  const d = dayjs(value);
  return `${d.format("DD/MM/")}${d.year() + 543} ${d.format("HH:mm")}`;
};

/**
 * รายละเอียดใบตั้งหนี้ (read-only ตามสถานะ) 11 section
 * หลังอนุมัติ: ปุ่ม "ปรับหนี้" (ซ่อนถ้าวางบิลแล้ว) / "ออกใบวางบิล" (primary)
 */
export default function ApInvoiceDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const perms = useScreenActionPermissions(config.screenCode);
  const query = useApInvoiceDetailQuery(id);
  const action = useApInvoiceActionMutation(id);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const { cancelQueue } = useApInvoicePvMutation(id);
  const [reasonFor, setReasonFor] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const d = query.data;
  // ใบสำคัญบัญชี: ใบที่ยกเลิกไม่มีรายการบัญชี จึงไม่ต้องดึง
  const journalQuery = usePurchaseJournalByDocQuery(id, !!d && d.status !== "CANCELLED");

  if (query.isLoading) return <Spin />;
  if (!d) {
    return (
      <Result
        status="404"
        title={`ไม่พบ${config.shortLabel}`}
        extra={<Button onClick={() => router.push(config.basePath)}>กลับรายการ</Button>}
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
      message.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };
  const confirmApprove = () =>
    modal.confirm({
      title: `อนุมัติใบตั้งหนี้ ${d.docNo}?`,
      content: `ยอดตั้งหนี้ ${money.format(d.totalAmount)} บาท${d.deposit.thisDeduct > 0 ? ` · หักมัดจำ ${money.format(d.deposit.thisDeduct)} บาท` : ""} · อนุมัติแล้วแก้ไขยอดโดยตรงไม่ได้`,
      okText: "อนุมัติ",
      onOk: () => run("approve", "อนุมัติแล้ว"),
    });
  const submitReason = async () => {
    if (!reasonFor) return;
    try {
      await action.mutateAsync({ action: reasonFor, reason: reason.trim() });
      void queryClient.invalidateQueries({ queryKey: purchaseJournalQueryKey });
      message.success(reasonFor === "reject" ? "บันทึกการไม่อนุมัติแล้ว" : "ยกเลิกแล้ว");
      setReasonFor(null);
      setReason("");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };
  const handlePrint = async () => {
    const { generateApDocumentPdf } = await import("@/utils/generateApDocumentPdf");
    void generateApDocumentPdf(d);
  };

  const editable = (status === "DRAFT" || status === "REJECTED") && perms.canEdit;

  // ── ใบสำคัญบัญชี (template ตามแบบ) ──
  const journal = journalQuery.data;
  const voucherInput = journal
    ? {
        docNo: d.docNo,
        docTypeLabel: "ใบตั้งหนี้",
        docDateText: formatThaiDate(d.docDate),
        creditorText: `${d.creditorCode} ${d.creditorName}`,
        reference: pickVoucherReference(d),
        description: buildVoucherDescription({ ...d, hasItems: d.items.length > 0 }),
        remark: d.remark,
        internalNote: d.internalNote,
        entry: journal.entry,
      }
    : null;
  // ตัวอย่างของใบที่ยังไม่อนุมัติพิมพ์/ดาวน์โหลดไม่ได้ · ปุ่มพิมพ์ผูกสิทธิ์ PRINT ของหน้า
  const canPrintVoucher =
    status === "APPROVED" &&
    !!voucherInput &&
    (!isMatrixPermissionMode() || hasPermission(`${config.screenCode}.PRINT`));
  const printVoucher = async () => {
    if (!voucherInput) return;
    try {
      const { printApJournalVoucherPdf } = await import("@/utils/generateApJournalVoucherPdf");
      await printApJournalVoucherPdf(voucherInput);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "พิมพ์ใบสำคัญไม่สำเร็จ");
    }
  };
  const downloadVoucher = async () => {
    if (!voucherInput) return;
    try {
      const { downloadApJournalVoucherPdf } = await import("@/utils/generateApJournalVoucherPdf");
      await downloadApJournalVoucherPdf(voucherInput);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "ดาวน์โหลดใบสำคัญไม่สำเร็จ");
    }
  };
  const moreItems: MenuProps["items"] = [
    { key: "print-invoice", label: "พิมพ์ใบตั้งหนี้ (PDF)", onClick: () => void handlePrint() },
    status === "APPROVED" && perms.canEdit && d.billedAmount <= 0
      ? { key: "adjust", label: "ปรับหนี้", onClick: () => setAdjustOpen(true) }
      : null,
    { key: "back", label: "กลับรายการ", onClick: () => router.push(config.basePath) },
    status !== "CANCELLED" && perms.canEdit
      ? { type: "divider" as const, key: "divider" }
      : null,
    status !== "CANCELLED" && perms.canEdit
      ? { key: "cancel", label: "ยกเลิกใบตั้งหนี้", danger: true, onClick: () => setReasonFor("cancel") }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const voucherToolbar = (
    <>
      <Tooltip title={canPrintVoucher ? undefined : status === "APPROVED" ? "ไม่มีสิทธิ์พิมพ์ หรือยังโหลดรายการบัญชีไม่ได้" : "พิมพ์ได้เมื่ออนุมัติแล้ว"}>
        <span>
          <Button icon={<PrinterOutlined />} disabled={!canPrintVoucher} onClick={() => void printVoucher()}>
            พิมพ์เอกสาร
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={canPrintVoucher ? undefined : "ดาวน์โหลดได้เมื่ออนุมัติแล้ว"}>
        <span>
          <Button icon={<DownloadOutlined />} disabled={!canPrintVoucher} onClick={() => void downloadVoucher()}>
            ดาวน์โหลด
          </Button>
        </span>
      </Tooltip>
      <Dropdown menu={{ items: moreItems }} trigger={["click"]} placement="bottomRight">
        <Button icon={<MoreOutlined />}>เพิ่มเติม</Button>
      </Dropdown>
    </>
  );

  const itemColumns: ColumnsType<ApDocumentItem> = [
    { title: "#", key: "no", width: 48, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "รหัสสินค้า", dataIndex: "itemCode", width: 130, render: (v: string | null) => v || "—" },
    { title: "รายละเอียด", dataIndex: "description" },
    {
      title: "จำนวนรับจริง",
      dataIndex: "quantity",
      align: "right",
      width: 120,
      render: (v: number) => v.toLocaleString("th-TH", { maximumFractionDigits: 3 }),
    },
    { title: "หน่วย", dataIndex: "unitLabel", width: 80, render: (v: string | null) => v || "—" },
    { title: "ราคา/หน่วย", dataIndex: "unitPrice", align: "right", width: 120, render: (v: number) => money.format(v) },
    { title: "ส่วนลด", dataIndex: "discountAmount", align: "right", width: 100, render: (v?: number) => money.format(v ?? 0) },
    { title: "มูลค่า", dataIndex: "amount", align: "right", width: 130, render: (v: number) => money.format(v) },
  ];
  const depositColumns: ColumnsType<DepositSource> = [
    { title: "ใบสำคัญจ่าย (มัดจำ)", dataIndex: "voucherNo", render: (v: string, r) => <Link href={`/finance/payables/payment-vouchers/${r.voucherId}`}>{v}</Link> },
    { title: "เลขที่รายการจ่าย", dataIndex: "paymentNo", render: (v?: string) => v ?? "—" },
    { title: "วันที่จ่ายจริง", dataIndex: "paymentDate", render: (v?: string) => formatThaiDate(v) },
    { title: "ยอดมัดจำ", dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    { title: "ภาษีที่หักไปแล้ว", dataIndex: "whtAmount", align: "right", render: (v: number) => money.format(v) },
  ];
  const adjustColumns: ColumnsType<ApAdjustmentHistory> = [
    { title: "เลขที่เอกสาร", dataIndex: "docNo", render: (v: string, r) => <Link href={`${AP_DOCUMENT_CONFIG.debitNote.basePath}/${r.id}`}>{v}</Link> },
    { title: "ประเภท", dataIndex: "docType", render: (v: string) => (v === "CREDIT_NOTE" ? "ใบลดหนี้" : "ใบเพิ่มหนี้") },
    { title: "วันที่เอกสาร", dataIndex: "docDate", render: (v: string) => formatThaiDate(v) },
    { title: "เหตุผลการปรับหนี้", dataIndex: "reason", render: (v?: string) => v ?? "—" },
    {
      title: "จำนวนเงิน",
      dataIndex: "signedAmount",
      align: "right",
      render: (v: number) => `${v >= 0 ? "+" : "−"}${money.format(Math.abs(v))}`,
    },
    { title: "สถานะ", key: "used", render: () => <Tag color="green">ใช้ปรับหนี้แล้ว</Tag> },
    { title: "ปรับเมื่อ / โดย", key: "when", render: (_v, r) => `${dt(r.appliedAt)} · ${r.appliedByName ?? "—"}` },
    {
      title: "",
      key: "a",
      width: 130,
      render: (_v, r) => (
        <Link href={`${AP_DOCUMENT_CONFIG.debitNote.basePath}/${r.id}`}>
          <Button size="small">ดูรายละเอียด</Button>
        </Link>
      ),
    },
  ];
  const billingColumns: ColumnsType<ApBillingLink> = [
    { title: "เลขที่ใบวางบิล", dataIndex: "billingNoteNo", render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: "วันที่เอกสาร", dataIndex: "billingNoteDate", render: (v?: string) => formatThaiDate(v) },
    { title: "ยอดที่นำ AP นี้ไปวางบิล", dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    { title: "สถานะใบวางบิล", key: "bs", render: (_v, r) => (r.status === "CANCELLED" ? <Tag>ยกเลิก</Tag> : <Tag color="blue">{r.billingNoteStatus ?? "ยืนยันแล้ว"}</Tag>) },
    { title: "สถานะการออก PV", dataIndex: "pvStatus", render: (v?: string) => v ?? "ยังไม่ออก PV" },
    {
      title: "",
      key: "a",
      width: 130,
      render: (_v, r) => (
        <Link href={`${BILLING_PATH}/${r.billingNoteId}`}>
          <Button size="small">ดูรายละเอียด</Button>
        </Link>
      ),
    },
  ];
  const voucherColumns: ColumnsType<ApVoucherRef> = [
    {
      title: "เลขที่ PV",
      key: "no",
      render: (_v, r) =>
        r.voucherId ? (
          <Link href={`${PV_PATH}/${r.voucherId}`}>{r.voucherNo}</Link>
        ) : (
          <Typography.Text type="secondary">รอสร้างใบสำคัญจ่าย ({r.queueNo})</Typography.Text>
        ),
    },
    { title: "วันที่เอกสาร", dataIndex: "docDate", width: 120, render: (v: string) => formatThaiDate(v) },
    { title: "จำนวนเงิน", dataIndex: "amount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: "สถานะ PV",
      dataIndex: "status",
      width: 190,
      render: (v: string) =>
        v === "WAITING_PV" ? (
          <Tag color="gold">รอสร้างใบสำคัญจ่าย</Tag>
        ) : (
          <Tag color={VOUCHER_STATUS_COLOR[v] ?? "default"}>{VOUCHER_STATUS_LABEL[v] ?? v}</Tag>
        ),
    },
    {
      title: "สถานะการจ่ายเงินจริง",
      key: "pay",
      width: 200,
      render: (_v, r) =>
        r.paymentStatus === "PAID" ? (
          <span>
            <Tag color="green">จ่ายแล้ว</Tag>
            {r.paymentId && r.paymentNo ? (
              <Link href={`/finance/payables/payment-records/${r.paymentId}`}>{r.paymentNo}</Link>
            ) : null}
            {r.paymentDate ? ` · ${formatThaiDate(r.paymentDate)}` : ""}
          </span>
        ) : (
          <Tag>ยังไม่จ่าย</Tag>
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
              <Button size="small">ดูรายละเอียด</Button>
            </Link>
          ) : (
            <Link href={PV_PATH}>
              <Button size="small">ไปสร้างใบสำคัญจ่าย</Button>
            </Link>
          )}
          {r.canCancelQueue && r.queueItemId && perms.canEdit ? (
            <Popconfirm
              title="ยกเลิกรายการรอสร้างใบสำคัญจ่าย?"
              description="ยอดจะกลับมาออกใบสำคัญจ่ายได้อีกครั้ง"
              okText="ยกเลิกรายการ"
              cancelText="ปิด"
              onConfirm={async () => {
                try {
                  await cancelQueue.mutateAsync(r.queueItemId as string);
                  message.success("ยกเลิกรายการรอสร้างใบสำคัญจ่ายแล้ว");
                } catch (e) {
                  message.error(e instanceof Error ? e.message : "ยกเลิกรายการไม่สำเร็จ");
                }
              }}
            >
              <Button size="small" danger loading={cancelQueue.isPending}>
                ยกเลิกรายการ
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const billingDisabledReason = d.billingBlockReason;

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title={
          <Space wrap>
            <span>
              ใบตั้งหนี้ {d.docNo}
            </span>
            <Tag color={AP_DOCUMENT_STATUS_COLOR[status]}>{AP_DOCUMENT_STATUS_LABEL[status] ?? status}</Tag>
            {status === "APPROVED" ? (
              <Tag color={AP_PAYMENT_STATUS_COLOR[d.paymentStatus]}>{AP_PAYMENT_STATUS_LABEL[d.paymentStatus] ?? d.paymentStatus}</Tag>
            ) : null}
          </Space>
        }
        extra={
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(config.basePath)}>
              กลับรายการ
            </Button>
            {editable ? (
              <>
                <Button onClick={() => router.push(`${config.basePath}/${id}/edit`)}>แก้ไข</Button>
                <Button type="primary" loading={action.isPending} onClick={() => void run("submit", status === "REJECTED" ? "ส่งอนุมัติใหม่แล้ว" : "ส่งอนุมัติแล้ว")}>
                  {status === "REJECTED" ? "ส่งอนุมัติใหม่" : "ส่งอนุมัติ"}
                </Button>
              </>
            ) : null}
            {status === "PENDING_APPROVAL" && perms.canApprove ? (
              <>
                <Button type="primary" loading={action.isPending} onClick={confirmApprove}>
                  อนุมัติ
                </Button>
                <Button danger onClick={() => setReasonFor("reject")}>
                  ไม่อนุมัติ
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
                    ออกใบวางบิล
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {/* ปรับหนี้ / ยกเลิก / พิมพ์ใบตั้งหนี้แบบเดิม อยู่ในเมนูนี้ เปิดได้จากทุกแท็บ */}
            <Dropdown menu={{ items: moreItems }} trigger={["click"]} placement="bottomRight">
              <Button icon={<MoreOutlined />}>เพิ่มเติม</Button>
            </Dropdown>
          </Space>
        }
      >
        {status === "REJECTED" && d.rejectReason ? (
          <Alert type="error" showIcon title="ไม่อนุมัติ — แก้ไขแล้วส่งอนุมัติใหม่ได้" description={d.rejectReason} />
        ) : null}
        {status === "CANCELLED" ? (
          <Alert type="warning" showIcon title={`ยกเลิกเมื่อ ${dt(d.cancelledAt)}${d.cancelledByName ? ` โดย ${d.cancelledByName}` : ""}`} description={d.cancelReason ?? undefined} />
        ) : null}
        {status === "APPROVED" && !d.canIssueBilling && billingDisabledReason ? (
          <Alert type="info" showIcon title={`ปุ่มออกใบวางบิลปิดอยู่: ${billingDisabledReason}`} />
        ) : null}
      </Card>

      <Tabs
        defaultActiveKey="voucher"
        items={[
          {
            key: "voucher",
            label: "ใบสำคัญบัญชี",
            children:
              status === "CANCELLED" ? (
                <Alert type="info" showIcon title="ใบตั้งหนี้นี้ถูกยกเลิก — ไม่มีรายการบัญชี" />
              ) : (
                <Card>
                  <ApJournalVoucher
                    entry={journal?.entry}
                    isLoading={journalQuery.isLoading}
                    error={journalQuery.error}
                    preview={journal ? journal.preview : status !== "APPROVED"}
                    docDate={d.docDate}
                    creditorId={d.creditorId}
                    creditorCode={d.creditorCode}
                    creditorName={d.creditorName}
                    reference={pickVoucherReference(d)}
                    description={buildVoucherDescription({ ...d, hasItems: d.items.length > 0 })}
                    remark={d.remark}
                    internalNote={d.internalNote}
                    toolbar={voucherToolbar}
                  />
                </Card>
              ),
          },
          {
            key: "detail",
            label: "รายละเอียดและการชำระเงิน",
            children: (
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card title="1. ข้อมูลเอกสาร" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="เลขที่ใบตั้งหนี้">{d.docNo}</Descriptions.Item>
          <Descriptions.Item label="วันที่ตั้งหนี้">{formatThaiDate(d.docDate)}</Descriptions.Item>
          <Descriptions.Item label="สถานะเอกสาร">
            <Tag color={AP_DOCUMENT_STATUS_COLOR[status]}>{AP_DOCUMENT_STATUS_LABEL[status] ?? status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="ผู้ขาย" span={2}>
            {d.creditorCode} {d.creditorName}
          </Descriptions.Item>
          <Descriptions.Item label="เลขประจำตัวผู้เสียภาษี">{d.creditorTaxId || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="2. เอกสารอ้างอิง" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="เลขที่รายการจ่ายเงิน">{d.paymentListNo ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="เลขที่ PO">
            {d.purchaseOrderId ? <Link href={`/purchase-orders/${d.purchaseOrderId}`}>{d.purchaseOrderNo}</Link> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="เลขที่ GRN">{d.goodsReceiptNo ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="เลขที่ใบแจ้งหนี้ Supplier">{d.supplierDocNo || "—"}</Descriptions.Item>
          <Descriptions.Item label="วันที่ใบแจ้งหนี้">{formatThaiDate(d.supplierDocDate)}</Descriptions.Item>
          <Descriptions.Item label="เลขที่ใบกำกับภาษี">{d.taxInvoiceNo || "—"}</Descriptions.Item>
          <Descriptions.Item label="วันที่ใบกำกับภาษี">{formatThaiDate(d.taxInvoiceDate)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="3. รายการสินค้า / บริการ" size="small">
        <Table
          size="small"
          rowKey="id"
          columns={itemColumns}
          dataSource={d.items}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "ไม่มีรายการสินค้า (ใบตั้งหนี้ค่าใช้จ่ายเพิ่มเติมจาก PO)" }}
        />
      </Card>

      {(d.charges?.length ?? 0) > 0 ? (
        <Card title="3.1 ค่าใช้จ่ายเพิ่มเติมจาก PO ที่ตั้งหนี้ในใบนี้" size="small">
          <Table
            size="small"
            rowKey="poChargeId"
            pagination={false}
            dataSource={d.charges}
            scroll={{ x: 800 }}
            columns={[
              {
                title: "ประเภท / รายละเอียด",
                key: "desc",
                render: (_v, c) => (
                  <span>
                    <Tag>{PO_CHARGE_TYPE_LABEL[c.chargeType] ?? c.chargeType}</Tag> {c.description}
                  </span>
                ),
              },
              { title: "ยอดก่อน VAT", dataIndex: "amountBeforeVat", align: "right", width: 140, render: (v: number) => money.format(v) },
              { title: "VAT", key: "rate", align: "right", width: 90, render: (_v, c) => `${c.vatRate}%` },
              { title: "VAT (บาท)", dataIndex: "vatAmount", align: "right", width: 120, render: (v: number) => money.format(v) },
              { title: "รวม", dataIndex: "totalAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
              {
                title: "หัก ณ ที่จ่าย",
                key: "wht",
                align: "right",
                width: 150,
                render: (_v, c) => (c.whtAmount > 0 ? `${money.format(c.whtAmount)} (${c.whtRate}%)` : "—"),
              },
            ]}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ค่าใช้จ่ายรวมอยู่ในยอดตั้งหนี้ด้านล่างแล้ว (ค่าสินค้ารวม VAT {money.format(d.goodsAmount ?? 0)}) · ยกเลิกใบนี้แล้ววงเงินค่าใช้จ่ายคืนให้ PO อัตโนมัติ
          </Typography.Text>
        </Card>
      ) : null}

      <Card title="4. สรุปยอดตั้งหนี้และยอดคงเหลือ (บาท)" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="มูลค่าก่อน VAT">{money.format(d.subtotalAmount)}</Descriptions.Item>
          <Descriptions.Item
            label={
              (d.charges?.length ?? 0) > 0
                ? "VAT (สินค้า + ค่าใช้จ่าย)"
                : `VAT ${d.vatRate}% (${AP_VAT_MODE_LABEL[d.vatMode] ?? d.vatMode})`
            }
          >
            {money.format(d.vatAmount)}
          </Descriptions.Item>
          <Descriptions.Item label="ยอดตั้งหนี้เดิม">
            <Typography.Text strong>{money.format(d.totalAmount)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="ยอดเพิ่มหนี้ (+)">{money.format(d.appliedDebits)}</Descriptions.Item>
          <Descriptions.Item label="ยอดลดหนี้ (−)">{money.format(d.appliedCredits)}</Descriptions.Item>
          <Descriptions.Item label="มัดจำที่หัก (−)">{money.format(d.deposit.thisDeduct)}</Descriptions.Item>
          <Descriptions.Item label="ยอดที่ต้องชำระ">{money.format(d.netPayableAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดชำระเงินจริง (−)">{money.format(d.paidAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดเจ้าหนี้คงเหลือ">
            <Typography.Text strong>{money.format(d.remainingAmount)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="ยอด PV ค้างดำเนินการ">{money.format(d.pvOpenAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดที่ออก PV เพิ่มได้">
            <Typography.Text strong>{money.format(d.issuablePvAmount)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="สถานะการชำระเงิน">
            <Tag color={AP_PAYMENT_STATUS_COLOR[d.paymentStatus]}>{AP_PAYMENT_STATUS_LABEL[d.paymentStatus] ?? d.paymentStatus}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="วางบิลไปแล้ว">{money.format(d.billedAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดพร้อมวางบิล" span={2}>
            {money.format(d.billableAmount)}
          </Descriptions.Item>
        </Descriptions>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          ยอดเจ้าหนี้คงเหลือ = ตั้งหนี้ + เพิ่มหนี้ − ลดหนี้ − มัดจำ − ยอดชำระจริง · สถานะชำระคิดจากยอดที่ชำระจริงเท่านั้น ไม่ใช่การออกใบวางบิลหรือสร้าง PV
        </Typography.Text>
      </Card>

      <Card title="5. การหักเงินล่วงหน้า / มัดจำ" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="มัดจำที่บันทึกจ่ายจริงแล้วทั้งหมด">{money.format(d.deposit.totalPaid)}</Descriptions.Item>
          <Descriptions.Item label="ใช้กับ AP ใบอื่นแล้ว">{money.format(d.deposit.usedByOthers)}</Descriptions.Item>
          <Descriptions.Item label="หักกับ AP ใบนี้">
            <Typography.Text strong>{money.format(d.deposit.thisDeduct)}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="มัดจำคงเหลือ (เก็บไว้หักใบถัดไป)">{money.format(d.deposit.remainingAfterThis)}</Descriptions.Item>
          <Descriptions.Item label="ภาษีหัก ณ ที่จ่ายที่หักไปแล้วตอนจ่ายมัดจำ" span={2}>
            {money.format(d.deposit.whtWithheld)} (การหักมัดจำใช้ยอดเต็ม ไม่หักภาษีซ้ำ)
          </Descriptions.Item>
        </Descriptions>
        <Table size="small" rowKey="voucherId" columns={depositColumns} dataSource={d.deposit.sources} pagination={false} locale={{ emptyText: "ยังไม่มีมัดจำที่บันทึกจ่ายจริงของรายการจ่ายเงินนี้" }} />
      </Card>

      <Card title="6. เงื่อนไขการชำระ" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label="เงื่อนไข (จาก PO / รายการจ่ายเงิน)">{termText(d.paymentTerm)}</Descriptions.Item>
          <Descriptions.Item label="วันครบกำหนดชำระ">{formatThaiDate(d.dueDate)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="7. ประวัติการปรับหนี้" size="small">
        <Table size="small" rowKey="id" columns={adjustColumns} dataSource={d.adjustments} pagination={false} locale={{ emptyText: "ยังไม่มีการปรับหนี้" }} />
      </Card>

      <Card title="8. ใบวางบิลที่เกี่ยวข้อง" size="small">
        <Table size="small" rowKey="id" columns={billingColumns} dataSource={d.billingNotes} pagination={false} locale={{ emptyText: "ยังไม่ได้นำไปวางบิล" }} />
      </Card>

      <Card title="9. เอกสารการจ่ายเงินที่เกี่ยวข้อง" size="small">
        <Table
          size="small"
          rowKey={(r) => r.voucherId ?? r.queueItemId ?? r.docDate}
          columns={voucherColumns}
          dataSource={d.vouchers}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "ยังไม่มีใบสำคัญจ่ายหรือรายการรอสร้างใบสำคัญจ่าย" }}
        />
      </Card>

      <Card title="10. หมายเหตุและเอกสารแนบ" size="small">
        <Typography.Paragraph>{d.remark || "—"}</Typography.Paragraph>
        <DocumentAttachmentsPanel documentType="AP_INVOICE" documentId={d.id} canEdit={editable} emptyText="ไม่มีเอกสารแนบ" />
      </Card>

      <Card title="11. ผู้ดำเนินการและประวัติการอนุมัติ" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="ผู้จัดทำ / วันที่สร้าง">{d.createdByName ?? "—"} · {dt(d.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="ผู้ส่งอนุมัติ">{d.submittedByName ? `${d.submittedByName} · ${dt(d.submittedAt)}` : "—"}</Descriptions.Item>
          <Descriptions.Item label="ผู้อนุมัติ / วันที่อนุมัติ">{d.approvedByName ? `${d.approvedByName} · ${dt(d.approvedAt)}` : "—"}</Descriptions.Item>
          {d.rejectedByName ? <Descriptions.Item label="ไม่อนุมัติโดย">{d.rejectedByName} · {dt(d.rejectedAt)}</Descriptions.Item> : null}
        </Descriptions>
        {d.events.length === 0 ? (
          <Typography.Text type="secondary">ยังไม่มีประวัติ</Typography.Text>
        ) : (
          <Timeline
            items={d.events.map((e) => ({
              key: e.id,
              content: (
                <span>
                  <Tag>{AP_EVENT_LABEL[e.action] ?? e.action}</Tag>
                  {e.performedByName ?? "—"} · {dt(e.performedAt)}
                  {e.note ? <div style={{ color: "#8a94a6" }}>{e.note}</div> : null}
                </span>
              ),
            }))}
          />
        )}
      </Card>
              </Space>
            ),
          },
        ]}
      />

      <AdjustDebtModal open={adjustOpen} detail={d} onClose={() => setAdjustOpen(false)} />

      <Modal
        open={reasonFor !== null}
        title={reasonFor === "reject" ? "ไม่อนุมัติใบตั้งหนี้" : "ยกเลิกใบตั้งหนี้"}
        okText={reasonFor === "reject" ? "ไม่อนุมัติ" : "ยกเลิกใบตั้งหนี้"}
        okButtonProps={{
          danger: true,
          disabled: reasonFor === "reject" ? reason.trim().length < 5 : status === "APPROVED" && reason.trim().length < 5,
        }}
        cancelText="ปิด"
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
          placeholder={reasonFor === "cancel" && status !== "APPROVED" ? "เหตุผล (ไม่บังคับสำหรับใบที่ยังไม่อนุมัติ)" : "เหตุผล (อย่างน้อย 5 ตัวอักษร)"}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {reasonFor === "cancel" ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ยกเลิกแล้วคืนมัดจำที่จองไว้ และปล่อยใบเพิ่มหนี้/ลดหนี้ที่เคยนำมาปรับให้ใช้ได้อีก · ยกเลิกไม่ได้ถ้าถูกนำไปวางบิลหรือมีการจ่ายแล้ว
          </Typography.Text>
        ) : null}
      </Modal>
    </Space>
  );
}
