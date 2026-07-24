"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Pagination, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EyeOutlined,
  FileTextOutlined,
  HourglassOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  usePendingSalesInvoicesQuery,
  useSalesInvoicesQuery,
} from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import type { SalesInvoice } from "@/types/sales-invoices";
import {
  SALES_INVOICE_PAYMENT_STATUS_LABEL,
  SALES_INVOICE_STATUS_LABEL,
} from "@/types/sales-invoices";
import styles from "./SalesInvoicesListPage.module.css";

function statusClass(status: string) {
  switch (status) {
    case "POSTED":
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

export default function SalesInvoicesListPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [invoiceDate, setInvoiceDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    keyword?: string;
    status?: string;
    paymentStatus?: string;
    invoiceDateFrom?: string;
    invoiceDateTo?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const query = useSalesInvoicesQuery({ ...applied, page, limit });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const pendingQuery = usePendingSalesInvoicesQuery({ page: 1, limit: 1 });
  const pendingCount = pendingQuery.data?.data.total ?? 0;

  const pageAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0),
    [rows],
  );

  const postedOnPage = useMemo(
    () => rows.filter((row) => row.status === "POSTED").length,
    [rows],
  );

  const draftOnPage = useMemo(
    () => rows.filter((row) => row.status === "DRAFT").length,
    [rows],
  );

  const hasActiveFilters = Boolean(
    applied.keyword ||
      applied.status ||
      applied.paymentStatus ||
      applied.invoiceDateFrom ||
      applied.invoiceDateTo,
  );

  const applySearch = () => {
    setPage(1);
    setApplied({
      keyword: keyword.trim() || undefined,
      status,
      paymentStatus,
      invoiceDateFrom: invoiceDate
        ? invoiceDate.format("YYYY-MM-DD")
        : undefined,
      invoiceDateTo: invoiceDate
        ? invoiceDate.format("YYYY-MM-DD")
        : undefined,
    });
  };

  const clearFilters = () => {
    setKeyword("");
    setStatus(undefined);
    setPaymentStatus(undefined);
    setInvoiceDate(null);
    setApplied({});
    setPage(1);
  };

  const columns: ColumnsType<SalesInvoice> = useMemo(
    () => [
      {
        title: "#",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบแจ้งหนี้",
        dataIndex: "invoiceNo",
        render: (value: string) => (
          <span className={styles.voucherNo}>{value}</span>
        ),
      },
      {
        title: "วันที่",
        dataIndex: "invoiceDate",
        width: 110,
        render: (value: string) => (
          <span className={styles.dateCell}>{formatDate(value)}</span>
        ),
      },
      {
        title: "อ้างอิง DO",
        key: "delivery",
        render: (_v, row) => (
          <span className={styles.poRef}>
            {row.deliveryOrder?.deliveryOrderNo ?? "—"}
          </span>
        ),
      },
      {
        title: "ลูกค้า",
        key: "customer",
        render: (_v, row) =>
          row.customer ? (
            <div className={styles.creditorCell}>
              <span className={styles.creditorName}>{row.customer.nameTh}</span>
              <span className={styles.creditorCode}>
                {row.customer.customerCode}
              </span>
            </div>
          ) : (
            "—"
          ),
      },
      {
        title: "ยอดรวม",
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
            {SALES_INVOICE_STATUS_LABEL[value] ?? value}
          </span>
        ),
      },
      {
        title: "ชำระ",
        dataIndex: "paymentStatus",
        width: 110,
        render: (value?: string) =>
          value ? (
            <span className={styles.methodCell}>
              {SALES_INVOICE_PAYMENT_STATUS_LABEL[value] ?? value}
            </span>
          ) : (
            "—"
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
              router.push(`/sales-invoices/${row.id}`);
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
              <FileTextOutlined />
            </span>
            Sales · Accounts Receivable
          </div>
          <h1 className={styles.pageTitle}>ใบแจ้งหนี้ขาย</h1>
          <p className={styles.pageSubtitle}>
            ออกบิลจากใบส่งสินค้าที่ส่งมอบแล้ว — ยืนยันโพสต์ และรับชำระเต็มจำนวน
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/sales-invoices/pending">
            <Button
              className={styles.primaryBtn}
              type="primary"
              icon={<HourglassOutlined />}
            >
              DO รอออกบิล
              {pendingCount > 0 ? (
                <span
                  className={styles.pendingCountBadge}
                  aria-label={`${pendingCount} ใบค้าง`}
                >
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              ) : null}
            </Button>
          </Link>
        </div>
      </header>

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ทั้งหมด</span>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statHint}>ใบตามเงื่อนไขค้นหา</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยอดในหน้านี้</span>
          <span className={`${styles.statValue} ${styles.statValuePaid}`}>
            {formatMoney(pageAmount)}
          </span>
          <span className={styles.statHint}>
            บาท · โพสต์ {postedOnPage} · ร่าง {draftOnPage}
          </span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>สถานะในหน้านี้</span>
          <span className={`${styles.statValue} ${styles.statValueDraft}`}>
            {postedOnPage}/{rows.length || 0}
          </span>
          <span className={styles.statHint}>โพสต์แล้ว / รายการที่แสดง</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>ค้นหา</label>
            <Input
              allowClear
              placeholder="เลขที่ SI / DO / SO / ลูกค้า"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะเอกสาร</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={[
                { value: "DRAFT", label: "ร่าง" },
                { value: "POSTED", label: "โพสต์แล้ว" },
                { value: "CANCELLED", label: "ยกเลิก" },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะชำระ</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={paymentStatus}
              onChange={setPaymentStatus}
              style={{ width: "100%" }}
              options={[
                { value: "UNPAID", label: "ยังไม่ชำระ" },
                { value: "PAID", label: "ชำระแล้ว" },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่ใบแจ้งหนี้</label>
            <DatePicker
              value={invoiceDate}
              onChange={setInvoiceDate}
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
            onClick: () => router.push(`/sales-invoices/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ยังไม่มีใบแจ้งหนี้</strong>
                สร้างจาก Delivery ที่ส่งมอบแล้วได้ที่หน้ารอออกบิล
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
