"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DollarOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePurchasePaymentsQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import type { SupplierPaymentVoucher } from "@/types/purchase-payments";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL,
} from "@/types/purchase-payments";
import { DocNoWithFlowBadge } from "@/components/procurement/ProcurementFlowBadge";
import styles from "./PurchasePaymentsListPage.module.css";

function statusColor(status: string) {
  switch (status) {
    case "PAID":
      return "success";
    case "DRAFT":
      return "processing";
    case "CANCELLED":
      return "default";
    default:
      return "default";
  }
}

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

export default function PurchasePaymentsListPage() {
  const router = useRouter();
  const [voucherNo, setVoucherNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [voucherDate, setVoucherDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    voucherNo?: string;
    status?: string;
    voucherDateFrom?: string;
    voucherDateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const query = usePurchasePaymentsQuery({ ...applied, page, limit });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const columns: ColumnsType<SupplierPaymentVoucher> = useMemo(
    () => [
      {
        title: "#",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบสำคัญ",
        dataIndex: "voucherNo",
        render: (value: string, row) => (
          <DocNoWithFlowBadge
            no={<span className={styles.prNo}>{value}</span>}
            source={{ kind: "payment", status: row.status }}
          />
        ),
      },
      {
        title: "วันที่",
        dataIndex: "voucherDate",
        render: (value: string) => formatDate(value),
      },
      {
        title: "อ้างอิง PO",
        key: "po",
        render: (_v, row) => row.purchaseOrder?.poNo ?? "—",
      },
      {
        title: "ผู้ขาย",
        key: "creditor",
        render: (_v, row) => row.creditor?.nameTh ?? "—",
      },
      {
        title: "วิธีจ่าย",
        dataIndex: "paymentMethod",
        render: (value: string) =>
          SUPPLIER_PAYMENT_METHOD_LABEL[value] ?? value,
      },
      {
        title: "ยอดจ่าย",
        dataIndex: "totalAmount",
        align: "right",
        render: (value: string) => formatMoney(value),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {SUPPLIER_PAYMENT_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "จัดการ",
        width: 80,
        render: (_v, row) => (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/purchase-payments/${row.id}`)}
          />
        ),
      },
    ],
    [limit, page, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <DollarOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Payments</p>
          <h1 className={styles.pageTitle}>ประวัติการจ่ายเงิน</h1>
          <p className={styles.pageSubtitle}>
            ใบสำคัญจ่าย Supplier จากใบสั่งซื้อ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/purchase-payments/pending">
            <Button type="primary">PO รอจ่าย</Button>
          </Link>
        </div>
      </header>

      <section className={styles.listCard}>
        <div className={styles.filterBar}>
          <Input
            allowClear
            placeholder="เลขที่ใบสำคัญ"
            value={voucherNo}
            onChange={(e) => setVoucherNo(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <Select
            allowClear
            placeholder="สถานะ"
            value={status}
            onChange={setStatus}
            style={{ minWidth: 140 }}
            options={[
              { value: "DRAFT", label: "ร่าง" },
              { value: "PAID", label: "จ่ายแล้ว" },
              { value: "CANCELLED", label: "ยกเลิก" },
            ]}
          />
          <DatePicker
            value={voucherDate}
            onChange={setVoucherDate}
            format="DD/MM/YYYY"
            placeholder="วันที่"
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => {
              setPage(1);
              setApplied({
                voucherNo: voucherNo.trim() || undefined,
                status,
                voucherDateFrom: voucherDate
                  ? voucherDate.format("YYYY-MM-DD")
                  : undefined,
                voucherDateTo: voucherDate
                  ? voucherDate.format("YYYY-MM-DD")
                  : undefined,
              });
            }}
          >
            ค้นหา
          </Button>
        </div>

        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: "ยังไม่มีใบสำคัญจ่าย" }}
        />
        <div className={styles.paginationBar}>
          <Pagination
            current={page}
            pageSize={limit}
            total={total}
            showSizeChanger
            onChange={(p, ps) => {
              setPage(p);
              setLimit(ps);
            }}
          />
        </div>
      </section>
    </div>
  );
}
