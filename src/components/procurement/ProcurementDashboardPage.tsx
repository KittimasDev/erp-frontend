"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Pagination, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DollarOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useProcurementSummaryQuery } from "@/hooks/procurement-dashboard/useProcurementSummaryQuery";
import { useProcurementTrackingQuery } from "@/hooks/procurement-dashboard/useProcurementTrackingQuery";
import { PURCHASE_ORDER_STATUS_LABEL } from "@/types/purchase-orders";
import type { ProcurementTrackingRow } from "@/types/procurement-dashboard";

import styles from "./ProcurementDashboardPage.module.css";

const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const MUTED = "#77777C";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "รอจ่าย",
  PAID: "จ่ายแล้ว",
};

function formatMoney(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMonthLabel(month: string) {
  return dayjs(`${month}-01`).format("MM/YYYY");
}

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
      return "success";
    case "REVISING":
      return "orange";
    case "DRAFT":
    case "PENDING_APPROVAL":
      return "processing";
    case "PARTIALLY_RECEIVED":
      return "warning";
    case "CANCELLED":
    case "REJECTED":
      return "default";
    default:
      return "default";
  }
}

function paymentStatusColor(status: string) {
  return status === "PAID" ? "success" : "warning";
}

type TrackingFilters = {
  poNo?: string;
  prNo?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default function ProcurementDashboardPage() {
  const router = useRouter();
  const today = dayjs();
  const canPay = useScreenActionPermissions("PURCHASE_PAYMENTS_PENDING").canEdit;

  const [summaryRange, setSummaryRange] = useState<[Dayjs, Dayjs]>([
    today.subtract(5, "month").startOf("month"),
    today,
  ]);

  const summaryQuery = useProcurementSummaryQuery({
    dateFrom: summaryRange[0].format("YYYY-MM-DD"),
    dateTo: summaryRange[1].format("YYYY-MM-DD"),
  });
  const summary = summaryQuery.data?.data;

  const [poNo, setPoNo] = useState("");
  const [prNo, setPrNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [applied, setApplied] = useState<TrackingFilters>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const trackingQuery = useProcurementTrackingQuery({
    ...applied,
    page,
    limit,
  });
  const rows = trackingQuery.data?.data.items ?? [];
  const total = trackingQuery.data?.data.total ?? 0;

  const statusChartData = useMemo(
    () =>
      (summary?.statusBreakdown ?? []).map((row) => ({
        ...row,
        label: PURCHASE_ORDER_STATUS_LABEL[row.status] ?? row.status,
      })),
    [summary?.statusBreakdown],
  );

  const trendChartData = useMemo(
    () =>
      (summary?.monthlyTrend ?? []).map((row) => ({
        ...row,
        label: formatMonthLabel(row.month),
        totalAmountNum: Number(row.totalAmount) || 0,
      })),
    [summary?.monthlyTrend],
  );

  const columns: ColumnsType<ProcurementTrackingRow> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "no",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบสั่งซื้อ",
        dataIndex: "poNo",
        key: "poNo",
        render: (value: string) => <span className={styles.poNo}>{value}</span>,
      },
      {
        title: "วันที่",
        dataIndex: "poDate",
        key: "poDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: "อ้างอิง PR",
        dataIndex: "prNo",
        key: "prNo",
        width: 150,
        render: (value?: string) => value ?? "—",
      },
      {
        title: "ผู้ขาย",
        dataIndex: "creditorName",
        key: "creditorName",
        ellipsis: true,
      },
      {
        title: "ยอดรวม",
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        width: 120,
        render: (value: string) => formatMoney(value),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {PURCHASE_ORDER_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "จ่ายเงิน",
        dataIndex: "paymentStatus",
        key: "paymentStatus",
        width: 100,
        render: (value: string) => (
          <Tag color={paymentStatusColor(value)}>
            {PAYMENT_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "ใบรับของ",
        dataIndex: "grCount",
        key: "grCount",
        width: 90,
        align: "center",
      },
      {
        title: "จัดการ",
        key: "action",
        width: canPay ? 168 : 70,
        align: "center",
        render: (_v, row) => {
          const payable =
            canPay &&
            row.status === "COMPLETED" &&
            row.paymentStatus !== "PAID";
          return (
            <div style={{ display: "inline-flex", gap: 6 }}>
              <button
                className={styles.actionBtn}
                type="button"
                title="ดูรายละเอียด"
                onClick={() => router.push(`/purchase-orders/${row.id}`)}
              >
                <EyeOutlined />
              </button>
              {payable ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() =>
                    router.push(
                      `/purchase-payments/create-from-po/${row.id}`,
                    )
                  }
                >
                  จ่ายเงิน
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canPay, limit, page, router],
  );

  return (
    <MasterPageGate isLoading={summaryQuery.isLoading}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <FileTextOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>Procurement</p>
            <h1 className={styles.pageTitle}>ติดตามจัดซื้อ</h1>
            <p className={styles.pageSubtitle}>
              สรุปสถานะสายงาน ใบขอซื้อ → ใบสั่งซื้อ → ใบรับของ → จ่ายเงิน
              ในหน้าเดียว
            </p>
          </div>
        </header>

        <div className={styles.toolbar}>
          <label className={styles.filterField}>
            <span>ช่วงข้อมูลสรุป</span>
            <DatePicker.RangePicker
              allowClear={false}
              value={summaryRange}
              format="DD/MM/YYYY"
              disabledDate={(current) =>
                Boolean(current && current.isAfter(today, "day"))
              }
              onChange={(values) => {
                if (!values?.[0] || !values[1]) return;
                setSummaryRange([
                  values[0].startOf("day"),
                  values[1].startOf("day"),
                ]);
              }}
            />
          </label>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>ใบสั่งซื้อทั้งหมด</span>
            <strong>{summary?.totalPOs ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ยอดเงินรวม</span>
            <strong>{formatMoney(summary?.totalAmount ?? "0")} บาท</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>รอรับของ</span>
            <strong>{summary?.awaitingGrCount ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>รอจ่ายเงิน</span>
            <strong>{summary?.awaitingPaymentCount ?? 0}</strong>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>แยกตามสถานะ</h3>
              <p>จำนวนใบสั่งซื้อแยกตามสถานะในช่วงที่เลือก</p>
            </div>
            <div className={styles.chartBody}>
              {statusChartData.length === 0 ? (
                <div className={styles.emptyState}>ไม่มีข้อมูลในช่วงนี้</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={statusChartData}
                    margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0f3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: MUTED, fontSize: 11 }}
                      axisLine={{ stroke: "#e4e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={110}
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value) => [value, "จำนวน"]}
                    />
                    <Bar
                      dataKey="count"
                      fill={GREEN}
                      radius={[0, 4, 4, 0]}
                      minPointSize={4}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        style={{ fill: MUTED, fontSize: 11 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>แนวโน้มยอดเงินรายเดือน</h3>
              <p>ยอดเงินใบสั่งซื้อย้อนหลังตามช่วงที่เลือก</p>
            </div>
            <div className={styles.chartBody}>
              {trendChartData.every((point) => point.poCount === 0) ? (
                <div className={styles.emptyState}>ไม่มีข้อมูลในช่วงนี้</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trendChartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={{ stroke: "#e4e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(value: number) =>
                        Number(value).toLocaleString("th-TH")
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value) => [
                        formatMoney(Number(value ?? 0)),
                        "ยอดเงิน",
                      ]}
                    />
                    <Bar
                      dataKey="totalAmountNum"
                      name="ยอดเงิน"
                      fill={GREEN_DARK}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <section className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <label>เลขที่ใบสั่งซื้อ</label>
              <Input
                allowClear
                placeholder="เช่น PO-20260718-001"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
              />
            </div>
            <div className={styles.filterItem}>
              <label>เลขที่ใบขอซื้อ</label>
              <Input
                allowClear
                placeholder="เช่น PR-20260701-001"
                value={prNo}
                onChange={(e) => setPrNo(e.target.value)}
              />
            </div>
            <div className={styles.filterItem}>
              <label>สถานะ</label>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="ทั้งหมด"
                value={status}
                onChange={setStatus}
                options={Object.entries(PURCHASE_ORDER_STATUS_LABEL).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </div>
            <div className={styles.filterItem}>
              <label>สถานะจ่ายเงิน</label>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="ทั้งหมด"
                value={paymentStatus}
                onChange={setPaymentStatus}
                options={[
                  { value: "UNPAID", label: "รอจ่าย" },
                  { value: "PAID", label: "จ่ายแล้ว" },
                ]}
              />
            </div>
            <div className={styles.filterItem}>
              <label>ช่วงวันที่</label>
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                value={dateRange}
                format="DD/MM/YYYY"
                onChange={(values) => {
                  if (!values?.[0] || !values[1]) {
                    setDateRange(null);
                    return;
                  }
                  setDateRange([values[0], values[1]]);
                }}
              />
            </div>
          </div>
          <div className={styles.filterActions}>
            <Button
              onClick={() => {
                setPoNo("");
                setPrNo("");
                setStatus(undefined);
                setPaymentStatus(undefined);
                setDateRange(null);
                setApplied({});
                setPage(1);
              }}
            >
              เคลียร์
            </Button>
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<SearchOutlined />}
              onClick={() => {
                setPage(1);
                setApplied({
                  poNo: poNo.trim() || undefined,
                  prNo: prNo.trim() || undefined,
                  status,
                  paymentStatus,
                  dateFrom: dateRange
                    ? dateRange[0].format("YYYY-MM-DD")
                    : undefined,
                  dateTo: dateRange
                    ? dateRange[1].format("YYYY-MM-DD")
                    : undefined,
                });
              }}
            >
              ค้นหา
            </Button>
          </div>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.toolbarLeft}>
              ใบสั่งซื้อทั้งหมด <strong>{total}</strong> รายการ
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
            columns={columns}
            dataSource={rows}
            loading={trackingQuery.isLoading}
            pagination={false}
            className={styles.table}
            locale={{ emptyText: "ยังไม่มีใบสั่งซื้อ" }}
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
    </MasterPageGate>
  );
}
