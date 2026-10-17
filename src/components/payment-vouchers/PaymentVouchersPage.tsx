"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useCreatedPaymentVouchersQuery,
  usePaymentVoucherQueueQuery,
} from "@/hooks/payment-vouchers/usePaymentVouchers";
import {
  PV_KIND_LABEL,
  PV_QUEUE_STATUS_LABEL,
  PV_SOURCE_LABEL,
  VOUCHER_STATUS_COLOR,
  VOUCHER_STATUS_LABEL,
  type PaymentVoucherQueueItem,
} from "@/types/payment-vouchers";
import type { SupplierPaymentVoucher } from "@/types/purchase-payments";
import { PV_BASE_PATH, sourceHref } from "./paymentVoucherUtils";

export const PAYMENT_VOUCHER_SCREEN = "FINANCE_PAYMENT_VOUCHERS";
const QUEUE_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 20;

const SOURCE_OPTIONS = [
  { value: "ADVANCE_REQUEST", label: PV_SOURCE_LABEL.ADVANCE_REQUEST },
  { value: "BILLING_NOTE", label: PV_SOURCE_LABEL.BILLING_NOTE },
  { value: "AP_INVOICE", label: PV_SOURCE_LABEL.AP_INVOICE },
];

function SourceDocLink({
  sourceType,
  sourceId,
  sourceNo,
  purchaseOrderId,
}: {
  sourceType: string;
  sourceId?: string;
  sourceNo?: string;
  purchaseOrderId?: string;
}) {
  const href = sourceId || purchaseOrderId ? sourceHref(sourceType, sourceId ?? "", purchaseOrderId) : undefined;
  if (!sourceNo) return <>—</>;
  return href ? <Link href={href}>{sourceNo}</Link> : <>{sourceNo}</>;
}

/** ใบสำคัญจ่าย — ตารางบน: รายการรอสร้างใบสำคัญจ่าย · ตารางล่าง: ใบสำคัญจ่ายที่สร้างแล้ว (ค้นหา/กรอง/แบ่งหน้าแยกกัน) */
export default function PaymentVouchersPage() {
  const router = useRouter();
  const { canAdd } = useScreenActionPermissions(PAYMENT_VOUCHER_SCREEN);

  // ── ตาราง 1: รอสร้างใบสำคัญจ่าย ──
  const [qPage, setQPage] = useState(1);
  const [qSearch, setQSearch] = useState("");
  const [qKeyword, setQKeyword] = useState("");
  const [qSource, setQSource] = useState<string | undefined>();
  const queue = usePaymentVoucherQueueQuery({
    page: qPage,
    limit: QUEUE_PAGE_SIZE,
    search: qKeyword,
    sourceType: qSource,
  });

  // ── ตาราง 2: ที่สร้างแล้ว ──
  const [cPage, setCPage] = useState(1);
  const [cSearch, setCSearch] = useState("");
  const [cKeyword, setCKeyword] = useState("");
  const [cSource, setCSource] = useState<string | undefined>();
  const [cStatus, setCStatus] = useState<string | undefined>();
  const created = useCreatedPaymentVouchersQuery({
    page: cPage,
    limit: CREATED_PAGE_SIZE,
    search: cKeyword,
    sourceType: cSource,
    status: cStatus,
  });

  const queueColumns: ColumnsType<PaymentVoucherQueueItem> = [
    {
      title: "วันที่รายการ",
      dataIndex: "queuedAt",
      width: 150,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "ประเภทเอกสาร",
      dataIndex: "sourceType",
      width: 170,
      render: (v: string) => PV_SOURCE_LABEL[v] ?? v,
    },
    {
      title: "เลขที่เอกสารอ้างอิง",
      key: "sourceNo",
      render: (_v, r) => (
        <span>
          <SourceDocLink sourceType={r.sourceType} sourceId={r.sourceId} sourceNo={r.sourceNo} purchaseOrderId={r.purchaseOrderId} />
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            คิว {r.queueNo}
          </Typography.Text>
        </span>
      ),
    },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) =>
        r.creditor ? (
          <span>
            <Typography.Text type="secondary">{r.creditor.creditorCode}</Typography.Text> {r.creditor.nameTh}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "ประเภทการจ่าย",
      dataIndex: "paymentKind",
      width: 130,
      render: (v: string) => PV_KIND_LABEL[v] ?? v,
    },
    {
      title: "ยอดที่ต้องการจ่าย",
      dataIndex: "amount",
      align: "right",
      width: 150,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 170,
      render: (v: string) => <Tag color="gold">{PV_QUEUE_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) =>
        canAdd ? (
          <Button type="primary" size="small" onClick={() => router.push(`${PV_BASE_PATH}/create?queueItemId=${r.id}`)}>
            สร้างใบสำคัญจ่าย
          </Button>
        ) : null,
    },
  ];

  const createdColumns: ColumnsType<SupplierPaymentVoucher> = [
    {
      title: "เลขที่ PV",
      dataIndex: "voucherNo",
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: "วันที่ PV", dataIndex: "voucherDate", width: 120, render: (v: string) => formatThaiDate(v) },
    {
      title: "ประเภทเอกสารต้นทาง",
      key: "sourceType",
      width: 170,
      render: (_v, r) => PV_SOURCE_LABEL[r.sourceType ?? "PURCHASE_ORDER"] ?? r.sourceType,
    },
    {
      title: "เลขที่เอกสารอ้างอิง",
      key: "sourceNo",
      render: (_v, r) => (
        <SourceDocLink
          sourceType={r.sourceType ?? "PURCHASE_ORDER"}
          sourceId={r.sourceId}
          sourceNo={r.sourceNo}
          purchaseOrderId={r.purchaseOrderId}
        />
      ),
    },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) =>
        r.creditor ? (
          <span>
            <Typography.Text type="secondary">{r.creditor.creditorCode}</Typography.Text> {r.creditor.nameTh}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "ยอดสุทธิ",
      dataIndex: "netAmount",
      align: "right",
      width: 140,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: "สถานะ PV",
      dataIndex: "status",
      width: 130,
      render: (v: string) => <Tag color={VOUCHER_STATUS_COLOR[v]}>{VOUCHER_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) => (
        // PV จากคิวใช้ฟอร์มกลาง · PV แบบเดิมจากใบสั่งซื้อใช้หน้ารายละเอียดเดิม
        <Link href={r.queueItemId ? `${PV_BASE_PATH}/${r.id}` : `/purchase-payments/${r.id}`}>
          <Button size="small">{r.status === "DRAFT" || r.status === "REJECTED" ? "ดู / แก้ไข" : "ดูรายละเอียด"}</Button>
        </Link>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card title="รายการรอสร้างใบสำคัญจ่าย" extra={<Typography.Text type="secondary">รายการที่ยืนยันแล้วและพร้อมออกใบสำคัญจ่าย</Typography.Text>}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            style={{ width: 320 }}
            placeholder="ค้นเลขที่เอกสารอ้างอิง / ชื่อผู้ขาย"
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            onSearch={(v) => {
              setQKeyword(v);
              setQPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="ประเภทเอกสาร"
            style={{ width: 220 }}
            value={qSource}
            onChange={(v) => {
              setQSource(v);
              setQPage(1);
            }}
            options={SOURCE_OPTIONS}
          />
        </Space>
        <Table
          rowKey="id"
          loading={queue.isLoading}
          columns={queueColumns}
          dataSource={queue.data?.data.items ?? []}
          pagination={{
            current: qPage,
            pageSize: QUEUE_PAGE_SIZE,
            total: queue.data?.data.total ?? 0,
            onChange: setQPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ไม่มีรายการรอสร้างใบสำคัญจ่าย" }}
        />
      </Card>

      <Card title="รายการใบสำคัญจ่ายที่สร้างแล้ว">
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            style={{ width: 320 }}
            placeholder="ค้นเลขที่ PV / เลขที่เอกสารอ้างอิง / ชื่อผู้ขาย"
            value={cSearch}
            onChange={(e) => setCSearch(e.target.value)}
            onSearch={(v) => {
              setCKeyword(v);
              setCPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="ประเภทเอกสารต้นทาง"
            style={{ width: 220 }}
            value={cSource}
            onChange={(v) => {
              setCSource(v);
              setCPage(1);
            }}
            options={SOURCE_OPTIONS}
          />
          <Select
            allowClear
            placeholder="สถานะ PV"
            style={{ width: 180 }}
            value={cStatus}
            onChange={(v) => {
              setCStatus(v);
              setCPage(1);
            }}
            options={Object.entries(VOUCHER_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          />
        </Space>
        <Table
          rowKey="id"
          loading={created.isLoading}
          columns={createdColumns}
          dataSource={created.data?.data.items ?? []}
          pagination={{
            current: cPage,
            pageSize: CREATED_PAGE_SIZE,
            total: created.data?.data.total ?? 0,
            onChange: setCPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ยังไม่มีใบสำคัญจ่าย" }}
        />
      </Card>

    </Space>
  );
}
