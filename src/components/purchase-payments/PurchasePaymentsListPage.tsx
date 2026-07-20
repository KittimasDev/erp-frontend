"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Pagination, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DollarOutlined,
  EyeOutlined,
  HourglassOutlined,
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

function statusClass(status: string) {
  switch (status) {
    case "PAID":
      return styles.statusPaid;
    case "DRAFT":
      return styles.statusDraft;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusCancelled;
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
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

  const pageAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0),
    [rows],
  );

  const paidOnPage = useMemo(
    () => rows.filter((row) => row.status === "PAID").length,
    [rows],
  );

  const draftOnPage = useMemo(
    () => rows.filter((row) => row.status === "DRAFT").length,
    [rows],
  );

  const hasActiveFilters = Boolean(
    applied.voucherNo ||
      applied.status ||
      applied.voucherDateFrom ||
      applied.voucherDateTo,
  );

  const applySearch = () => {
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
  };

  const clearFilters = () => {
    setVoucherNo("");
    setStatus(undefined);
    setVoucherDate(null);
    setApplied({});
    setPage(1);
  };

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
            no={<span className={styles.voucherNo}>{value}</span>}
            source={{ kind: "payment", status: row.status }}
          />
        ),
      },
      {
        title: "วันที่",
        dataIndex: "voucherDate",
        width: 110,
        render: (value: string) => (
          <span className={styles.dateCell}>{formatDate(value)}</span>
        ),
      },
      {
        title: "อ้างอิง PO",
        key: "po",
        render: (_v, row) => (
          <span className={styles.poRef}>
            {row.purchaseOrder?.poNo ?? "—"}
          </span>
        ),
      },
      {
        title: "ผู้ขาย",
        key: "creditor",
        render: (_v, row) =>
          row.creditor ? (
            <div className={styles.creditorCell}>
              <span className={styles.creditorName}>{row.creditor.nameTh}</span>
              <span className={styles.creditorCode}>
                {row.creditor.creditorCode}
              </span>
            </div>
          ) : (
            "—"
          ),
      },
      {
        title: "วิธีจ่าย",
        dataIndex: "paymentMethod",
        width: 110,
        render: (value: string) => (
          <span className={styles.methodCell}>
            {SUPPLIER_PAYMENT_METHOD_LABEL[value] ?? value}
          </span>
        ),
      },
      {
        title: "ยอดจ่าย",
        dataIndex: "totalAmount",
        align: "right",
        render: (value: string) => (
          <span className={styles.amountCell}>{formatMoney(value)}</span>
        ),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 120,
        render: (value: string) => (
          <span className={`${styles.statusPill} ${statusClass(value)}`}>
            <span className={styles.statusDot} aria-hidden />
            {SUPPLIER_PAYMENT_STATUS_LABEL[value] ?? value}
          </span>
        ),
      },
      {
        title: "",
        key: "actions",
        width: 56,
        render: (_v, row) => (
          <button
            type="button"
            className={styles.actionBtn}
            title="ดูรายละเอียด"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/purchase-payments/${row.id}`);
            }}
          >
            <EyeOutlined />
          </button>
        ),
      },
    ],
    [limit, page, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeIcon} aria-hidden>
              <DollarOutlined />
            </span>
            Accounting · Payment History
          </div>
          <h1 className={styles.pageTitle}>ประวัติการจ่ายเงิน</h1>
          <p className={styles.pageSubtitle}>
            ใบสำคัญจ่าย Supplier จากใบสั่งซื้อ — ค้นหา ติดตามสถานะ
            และเปิดดูรายละเอียดการจ่ายได้จากที่นี่
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/purchase-payments/pending">
            <Button
              className={styles.primaryBtn}
              type="primary"
              icon={<HourglassOutlined />}
            >
              PO รอจ่าย
            </Button>
          </Link>
        </div>
      </header>

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ทั้งหมด</span>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statHint}>ใบสำคัญตามเงื่อนไขค้นหา</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยอดในหน้านี้</span>
          <span className={`${styles.statValue} ${styles.statValuePaid}`}>
            {formatMoney(pageAmount)}
          </span>
          <span className={styles.statHint}>
            บาท · จ่ายแล้ว {paidOnPage} · ร่าง {draftOnPage}
          </span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>สถานะในหน้านี้</span>
          <span className={`${styles.statValue} ${styles.statValueDraft}`}>
            {paidOnPage}/{rows.length || 0}
          </span>
          <span className={styles.statHint}>จ่ายแล้ว / รายการที่แสดง</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่ใบสำคัญ</label>
            <Input
              allowClear
              placeholder="เช่น PV-20260718-001"
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={[
                { value: "DRAFT", label: "ร่าง" },
                { value: "PAID", label: "จ่ายแล้ว" },
                { value: "CANCELLED", label: "ยกเลิก" },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่จ่าย</label>
            <DatePicker
              value={voucherDate}
              onChange={setVoucherDate}
              format="DD/MM/YYYY"
              placeholder="เลือกวันที่"
              style={{ width: "100%" }}
            />
          </div>
          <div className={styles.filterActions}>
            <Button onClick={clearFilters}>เคลียร์</Button>
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<SearchOutlined />}
              onClick={applySearch}
            >
              ค้นหา
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{total}</strong> รายการ
            {hasActiveFilters ? (
              <>
                {" "}
                · แสดงในหน้านี้ <strong>{rows.length}</strong>
              </>
            ) : null}
          </div>
          <div className={styles.entriesBox}>
            <span>แสดง</span>
            <Select
              size="small"
              value={limit}
              style={{ width: 72 }}
              options={[
                { label: "10", value: 10 },
                { label: "25", value: 25 },
                { label: "50", value: 50 },
              ]}
              onChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
            <span>รายการ/หน้า</span>
          </div>
        </div>

        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          className={styles.table}
          onRow={(row) => ({
            onClick: () => router.push(`/purchase-payments/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ยังไม่มีใบสำคัญจ่าย</strong>
                เมื่อจ่ายเงินจาก PO แล้ว ประวัติจะแสดงที่นี่
              </div>
            ),
          }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            แสดง {total === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, total)} จาก {total}
          </div>
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={limit}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </section>
    </div>
  );
}
