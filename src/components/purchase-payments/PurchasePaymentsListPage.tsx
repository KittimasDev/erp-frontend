"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Pagination, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DollarOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";
import { tStatus } from "@/types/purchase-orders";
import { usePurchasePaymentsQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import type { SupplierPaymentVoucher } from "@/types/purchase-payments";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL,
} from "@/types/purchase-payments";
import { DocNoWithFlowBadge } from "@/components/procurement/ProcurementFlowBadge";
import styles from "./PurchasePaymentsListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

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

type Props = {
  /** path รายการ — ค่าเริ่มต้น /purchase-payments */
  basePath?: string;
  /** ปุ่มด้านขวาบน (เช่น ใบสำคัญจ่าย / PO รอจ่าย) */
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function PurchasePaymentsListPage({
  basePath = "/purchase-payments",
  secondaryHref = "/finance/payables/payment-vouchers",
  secondaryLabel = "ใบสำคัญจ่าย",
}: Props) {
  const router = useRouter();
  const t = useT();
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
        title: t("ลำดับ"),
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ใบสำคัญ"),
        dataIndex: "voucherNo",
        render: (value: string, row) => (
          <DocNoWithFlowBadge
            no={<span className={styles.voucherNo}>{value}</span>}
            source={{ kind: "payment", status: row.status }}
          />
        ),
      },
      {
        title: t("วันที่"),
        dataIndex: "voucherDate",
        width: 110,
        render: (value: string) => (
          <span className={styles.dateCell}>{formatDate(value)}</span>
        ),
      },
      {
        title: t("อ้างอิง PO"),
        key: "po",
        render: (_v, row) => (
          <span className={styles.poRef}>
            {row.purchaseOrder?.poNo ?? "—"}
          </span>
        ),
      },
      {
        title: t("ผู้ขาย"),
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
        title: t("วิธีจ่าย"),
        dataIndex: "paymentMethod",
        width: 110,
        render: (value: string) => (
          <span className={styles.methodCell}>
            {t(SUPPLIER_PAYMENT_METHOD_LABEL[value] ?? value)}
          </span>
        ),
      },
      {
        title: t("ยอดจ่าย"),
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
            {tStatus(SUPPLIER_PAYMENT_STATUS_LABEL[value] ?? value)}
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
            title={t("ดูรายละเอียด")}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`${basePath}/${row.id}`);
            }}
          >
            <EyeOutlined />
          </button>
        ),
      },
    ],
    [basePath, limit, page, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Accounting · Payment History"
        icon={<DollarOutlined />}
        title={t("ประวัติการจ่ายเงิน")}
        subtitle={t(
          "ใบสำคัญจ่าย Supplier จากใบสั่งซื้อ — ค้นหา ติดตามสถานะ และเปิดดูรายละเอียดการจ่ายได้จากที่นี่",
        )}
        actions={
          <>
<Link href={secondaryHref}>
            <Button className={styles.primaryBtn} type="primary" icon={<DollarOutlined />}>
              {t(secondaryLabel)}
            </Button>
          </Link>
          </>
        }
      />

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ทั้งหมด")}</span>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statHint}>{t("ใบสำคัญตามเงื่อนไขค้นหา")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ยอดในหน้านี้")}</span>
          <span className={`${styles.statValue} ${styles.statValuePaid}`}>
            {formatMoney(pageAmount)}
          </span>
          <span className={styles.statHint}>
            {t("บาท · จ่ายแล้ว {paid} · ร่าง {draft}", { paid: paidOnPage, draft: draftOnPage })}
          </span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("สถานะในหน้านี้")}</span>
          <span className={`${styles.statValue} ${styles.statValueDraft}`}>
            {paidOnPage}/{rows.length || 0}
          </span>
          <span className={styles.statHint}>{t("จ่ายแล้ว / รายการที่แสดง")}</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("เลขที่ใบสำคัญ")}</label>
            <Input
              allowClear
              placeholder={t("เช่น PV-20260718-001")}
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={[
                { value: "DRAFT", label: tStatus("แบบร่างเอกสาร") },
                { value: "PAID", label: tStatus("จ่ายแล้ว") },
                { value: "CANCELLED", label: tStatus("ยกเลิก") },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่จ่าย")}</label>
            <DatePicker
              value={voucherDate}
              onChange={setVoucherDate}
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
            onClick: () => router.push(`${basePath}/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ยังไม่มีใบสำคัญจ่าย")}</strong>
                {t("เมื่อบันทึกจ่ายเงินแล้ว ประวัติจะแสดงที่นี่")}
              </div>
            ),
          }}
        />

        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("แสดง")} {total === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, total)} {t("จาก")} {total}
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
