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
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { SalesInvoice } from "@/types/sales-invoices";
import {
  salesInvoicePaymentStatusLabel,
  salesInvoiceStatusLabel,
} from "@/types/sales-invoices";
import styles from "./SalesInvoicesListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

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
  const t = useT();
  const lang = useLanguage();
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
        title: t("ลำดับ"),
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ใบแจ้งหนี้"),
        dataIndex: "invoiceNo",
        render: (value: string) => (
          <span className={styles.voucherNo}>{value}</span>
        ),
      },
      {
        title: t("วันที่"),
        dataIndex: "invoiceDate",
        width: 110,
        render: (value: string) => (
          <span className={styles.dateCell}>{formatDate(value)}</span>
        ),
      },
      {
        title: t("อ้างอิง DO"),
        key: "delivery",
        render: (_v, row) => (
          <span className={styles.poRef}>
            {row.deliveryOrder?.deliveryOrderNo ?? "—"}
          </span>
        ),
      },
      {
        title: t("ลูกค้า"),
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
        title: t("ยอดรวม"),
        dataIndex: "totalAmount",
        align: "right",
        render: (value: string) => (
          <span className={styles.amountCell}>{formatMoney(value)}</span>
        ),
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        width: 120,
        render: (value: string) => (
          <span className={`${styles.statusPill} ${statusClass(value)}`}>
            <span className={styles.statusDot} aria-hidden />
            {salesInvoiceStatusLabel(value, lang)}
          </span>
        ),
      },
      {
        title: t("ชำระ"),
        dataIndex: "paymentStatus",
        width: 110,
        render: (value?: string) =>
          value ? (
            <span className={styles.methodCell}>
              {salesInvoicePaymentStatusLabel(value, lang)}
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
            title={t("ดูรายละเอียด")}
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
    [lang, limit, page, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Accounts Receivable"
        icon={<FileTextOutlined />}
        title={t("ใบแจ้งหนี้ขาย")}
        subtitle={t("ออกบิลจากใบส่งสินค้าที่ส่งมอบแล้ว — ยืนยันโพสต์ และรับชำระเต็มจำนวน")}
        actions={
          <>
<Link href="/sales-invoices/pending">
            <Button
              className={styles.primaryBtn}
              type="primary"
              icon={<HourglassOutlined />}
            >
              {t("DO รอออกบิล")}
              {pendingCount > 0 ? (
                <span
                  className={styles.pendingCountBadge}
                  aria-label={t("{n} ใบค้าง", { n: pendingCount })}
                >
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              ) : null}
            </Button>
          </Link>
          </>
        }
      />

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ทั้งหมด")}</span>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statHint}>{t("ใบตามเงื่อนไขค้นหา")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ยอดในหน้านี้")}</span>
          <span className={`${styles.statValue} ${styles.statValuePaid}`}>
            {formatMoney(pageAmount)}
          </span>
          <span className={styles.statHint}>
            {t("บาท · โพสต์ {posted} · ร่าง {draft}", { posted: postedOnPage, draft: draftOnPage })}
          </span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("สถานะในหน้านี้")}</span>
          <span className={`${styles.statValue} ${styles.statValueDraft}`}>
            {postedOnPage}/{rows.length || 0}
          </span>
          <span className={styles.statHint}>{t("โพสต์แล้ว / รายการที่แสดง")}</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ค้นหา")}</label>
            <Input
              allowClear
              placeholder={t("เลขที่ SI / DO / SO / ลูกค้า")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะเอกสาร")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={[
                { value: "DRAFT", label: salesInvoiceStatusLabel("DRAFT", lang) },
                { value: "POSTED", label: salesInvoiceStatusLabel("POSTED", lang) },
                { value: "CANCELLED", label: salesInvoiceStatusLabel("CANCELLED", lang) },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะชำระ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={paymentStatus}
              onChange={setPaymentStatus}
              style={{ width: "100%" }}
              options={[
                { value: "UNPAID", label: salesInvoicePaymentStatusLabel("UNPAID", lang) },
                { value: "PARTIALLY_PAID", label: salesInvoicePaymentStatusLabel("PARTIALLY_PAID", lang) },
                { value: "PAID", label: salesInvoicePaymentStatusLabel("PAID", lang) },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่ใบแจ้งหนี้")}</label>
            <DatePicker
              value={invoiceDate}
              onChange={setInvoiceDate}
              format="DD/MM/YYYY"
              placeholder={t("เลือกวันที่")}
              style={{ width: "100%" }}
            />
          </div>
          <div className={styles.filterActions}>
            <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<SearchOutlined />}
              onClick={applySearch}
            >
              {t("ค้นหา")}
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {t("พบทั้งหมด")} <strong>{total}</strong> {t("รายการ")}
            {hasActiveFilters ? (
              <>
                {" "}
                · {t("แสดงในหน้านี้")} <strong>{rows.length}</strong>
              </>
            ) : null}
          </div>
          <div className={styles.entriesBox}>
            <span>{t("แสดง")}</span>
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
            <span>{t("รายการ/หน้า")}</span>
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
                <strong>{t("ยังไม่มีใบแจ้งหนี้")}</strong>
                {t("สร้างจาก Delivery ที่ส่งมอบแล้วได้ที่หน้ารอออกบิล")}
              </div>
            ),
          }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("แสดง {from}–{to} จาก {total}", {
              from: total === 0 ? 0 : (page - 1) * limit + 1,
              to: Math.min(page * limit, total),
              total,
            })}
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
