"use client";

import { useLanguage } from "@/lib/i18n/language";
import { tStatus } from "@/types/purchase-orders";
import { useT } from "@/lib/i18n/useT";
import { useMemo, useState } from "react";
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
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import MasterPageGate from "@/components/common/MasterPageGate";
import CollapsibleItemList from "@/components/common/CollapsibleItemList";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useProcurementSummaryQuery } from "@/hooks/procurement-dashboard/useProcurementSummaryQuery";
import { useProcurementTrackingQuery } from "@/hooks/procurement-dashboard/useProcurementTrackingQuery";
import { PURCHASE_ORDER_STATUS_LABEL, purchaseOrderStatusColor } from "@/types/purchase-orders";
import type {
  ProcurementTrackingRow,
} from "@/types/procurement-dashboard";

import styles from "./ProcurementDashboardPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const MUTED = "#77777C";

const STATUS_BAR_COLOR: Record<string, string> = {
  // โทนตามสีสถานะมาตรฐาน: ร่าง=เทา · รออนุมัติ=ส้ม · อนุมัติ=เขียว · ไม่อนุมัติ=แดง · กำลังดำเนินการ=ฟ้า · ยกเลิก=เทา
  DRAFT: "#8c8c8c",
  PENDING_APPROVAL: "#fa8c16",
  REVISING: "#faad14",
  CONFIRMED: GREEN,
  PARTIALLY_RECEIVED: "#1677ff",
  COMPLETED: GREEN_DARK,
  CLOSED_PARTIAL: GREEN_DARK,
  RECEIVE_CANCELLED: "#bfbfbf",
  REJECTED: "#f5222d",
  CANCELLED: "#bfbfbf",
};

const MONTH_BAR_COLORS = [
  GREEN,
  "#3b82f6",
  "#F9BB0C",
  "#f97316",
  GREEN_DARK,
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#6366f1",
  "#64748b",
];

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "รอจ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายแล้ว",
  NOT_REQUIRED: "ไม่ต้องชำระ",
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
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMonthLabel(month: string) {
  return dayjs(`${month}-01`).format("MM/BBBB");
}

function paymentStatusColor(status: string) {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "processing";
  if (status === "NOT_REQUIRED") return "default";
  return "warning";
}

function rangeForYear(year: number, today: Dayjs): [Dayjs, Dayjs] {
  const start = dayjs(`${year}-01-01`).startOf("day");
  const yearEnd = dayjs(`${year}-12-31`).startOf("day");
  const end = yearEnd.isAfter(today, "day") ? today.startOf("day") : yearEnd;
  return [start, end];
}

type TrackingFilters = {
  poNo?: string;
  prNo?: string;
  status?: string;
  paymentStatus?: string;
  itemIds?: string[];
};

export default function ProcurementDashboardPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const today = dayjs();
  const [year, setYear] = useState(today.year());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() =>
    rangeForYear(today.year(), today),
  );

  const dateFrom = dateRange[0].format("YYYY-MM-DD");
  const dateTo = dateRange[1].format("YYYY-MM-DD");

  const summaryQuery = useProcurementSummaryQuery({ dateFrom, dateTo });
  const summary = summaryQuery.data?.data;

  const [poNo, setPoNo] = useState("");
  const [prNo, setPrNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [applied, setApplied] = useState<TrackingFilters>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const itemsQuery = useItemsQuery({ isActive: true, isPurchaseItem: true });
  const catalogItems = itemsQuery.data?.data ?? [];
  const itemOptions = catalogItems.map((item) => ({
    value: item.id,
    label: `${item.itemCode} — ${item.itemNameTh}`,
  }));

  const trackingQuery = useProcurementTrackingQuery({
    ...applied,
    dateFrom,
    dateTo,
    page,
    limit,
  });
  const rows = trackingQuery.data?.data.items ?? [];
  const total = trackingQuery.data?.data.total ?? 0;

  const statusChartData = useMemo(
    () =>
      (summary?.statusBreakdown ?? []).map((row) => ({
        ...row,
        label: tStatus(
          PURCHASE_ORDER_STATUS_LABEL[row.status] ?? row.status,
          lang,
        ),
        fill: STATUS_BAR_COLOR[row.status] ?? GREEN,
      })),
    [summary?.statusBreakdown, lang],
  );

  const trendChartData = useMemo(
    () =>
      (summary?.monthlyTrend ?? []).map((row, index) => ({
        ...row,
        label: formatMonthLabel(row.month),
        totalAmountNum: Number(row.totalAmount) || 0,
        fill: MONTH_BAR_COLORS[index % MONTH_BAR_COLORS.length],
      })),
    [summary?.monthlyTrend],
  );

  const columns: ColumnsType<ProcurementTrackingRow> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "no",
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ใบสั่งซื้อ"),
        dataIndex: "poNo",
        key: "poNo",
        width: 180,
        ellipsis: true,
        onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
        render: (value: string) => <span className={styles.poNo}>{value}</span>,
      },
      {
        title: t("วันที่"),
        dataIndex: "poDate",
        key: "poDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("อ้างอิง PR"),
        dataIndex: "prNo",
        key: "prNo",
        width: 150,
        render: (value?: string) => value ?? "—",
      },
      {
        title: t("ผู้ขาย"),
        dataIndex: "creditorName",
        key: "creditorName",
        ellipsis: true,
      },
      {
        title: t("สินค้า"),
        key: "items",
        width: 240,
        className: styles.itemColumn,
        render: (_v, row) => (
          <CollapsibleItemList items={row.items ?? []} />
        ),
      },
      {
        title: t("ยอดรวม"),
        dataIndex: "totalAmount",
        key: "totalAmount",
        align: "right",
        width: 120,
        render: (value: string) => formatMoney(value),
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => (
          <Tag color={purchaseOrderStatusColor(value)}>
            {tStatus(PURCHASE_ORDER_STATUS_LABEL[value] ?? value)}
          </Tag>
        ),
      },
      {
        title: t("จ่ายเงิน"),
        dataIndex: "paymentStatus",
        key: "paymentStatus",
        width: 100,
        render: (value: string) => (
          <Tag color={paymentStatusColor(value)}>
            {t(PAYMENT_STATUS_LABEL[value] ?? value)}
          </Tag>
        ),
      },
      {
        title: t("ใบรับของ"),
        dataIndex: "grCount",
        key: "grCount",
        width: 90,
        align: "center",
      },
      {
        title: t("จัดการ"),
        key: "action",
        width: 70,
        align: "center",
        render: (_v, row) => (
          <button
            className={styles.actionBtn}
            type="button"
            title={t("ดูรายละเอียด")}
            onClick={() => router.push(`/purchase-orders/${row.id}`)}
          >
            <EyeOutlined />
          </button>
        ),
      },
    ],
    [limit, page, router, t],
  );

  return (
    <MasterPageGate isLoading={summaryQuery.isLoading}>
      <div className={styles.page}>
        <PageHeader
          eyebrow="Procurement"
          icon={<FileTextOutlined />}
          title={t("ติดตามจัดซื้อ")}
          subtitle={t("สรุปสถานะสายงาน ใบขอซื้อ → ใบสั่งซื้อ → ใบรับของ → จ่ายเงิน ในหน้าเดียว")}
        />

        <div className={styles.toolbar}>
          <label className={styles.filterField}>
            <span>{t("ปี")}</span>
            <DatePicker
              picker="year"
              allowClear={false}
              value={dayjs(`${year}-01-01`)}
              format="BBBB"
              disabledDate={(current) =>
                Boolean(current && current.year() > today.year())
              }
              onChange={(value) => {
                if (!value) return;
                const nextYear = value.year();
                setYear(nextYear);
                setDateRange(rangeForYear(nextYear, today));
                setPage(1);
              }}
            />
          </label>
          <label className={styles.filterField}>
            <span>{t("ช่วงวันที่")}</span>
            <DatePicker.RangePicker
              allowClear={false}
              value={dateRange}
              format="DD/MM/BBBB"
              disabledDate={(current) =>
                Boolean(
                  current &&
                    (current.year() !== year || current.isAfter(today, "day")),
                )
              }
              onChange={(values) => {
                if (!values?.[0] || !values[1]) return;
                setDateRange([
                  values[0].startOf("day"),
                  values[1].startOf("day"),
                ]);
                setPage(1);
              }}
            />
          </label>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>{t("ใบสั่งซื้อทั้งหมด")}</span>
            <strong>{summary?.totalPOs ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("ยอดเงินรวม")}</span>
            <strong>
              {formatMoney(summary?.totalAmount ?? "0")} {t("บาท")}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("รอรับของ")}</span>
            <strong>{summary?.awaitingGrCount ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("รอจ่ายเงิน")}</span>
            <strong>{summary?.awaitingPaymentCount ?? 0}</strong>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("ภาพรวมสถานะการจัดซื้อ")}</h3>
              <p>{t("จำนวนใบสั่งซื้อแยกตามสถานะในช่วงที่เลือก")}</p>
            </div>
            <div className={styles.chartBody}>
              {statusChartData.length === 0 ? (
                <div className={styles.emptyState}>{t("ไม่มีข้อมูลในช่วงนี้")}</div>
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
                      width={140}
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value) => [value, t("จำนวน")]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} minPointSize={4}>
                      {statusChartData.map((row) => (
                        <Cell key={row.status} fill={row.fill} />
                      ))}
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
              <h3>{t("ยอดจัดซื้อรายเดือน")}</h3>
              <p>{t("ยอดเงินใบสั่งซื้อย้อนหลังตามช่วงที่เลือก")}</p>
            </div>
            <div className={styles.chartBody}>
              {trendChartData.every((point) => point.poCount === 0) ? (
                <div className={styles.emptyState}>{t("ไม่มีข้อมูลในช่วงนี้")}</div>
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
                    <ChartTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value) => [
                        formatMoney(Number(value ?? 0)),
                        t("ยอดเงิน"),
                      ]}
                    />
                    <Bar
                      dataKey="totalAmountNum"
                      name={t("ยอดเงิน")}
                      radius={[4, 4, 0, 0]}
                    >
                      {trendChartData.map((row) => (
                        <Cell key={row.month} fill={row.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <section className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <label>{t("เลขที่ใบสั่งซื้อ")}</label>
              <Input
                allowClear
                placeholder={t("เช่น PO-20260718-001")}
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("เลขที่ใบขอซื้อ")}</label>
              <Input
                allowClear
                placeholder={t("เช่น PR-20260701-001")}
                value={prNo}
                onChange={(e) => setPrNo(e.target.value)}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สินค้า")}</label>
              <Select
                allowClear
                showSearch
                mode="multiple"
                maxTagCount="responsive"
                optionFilterProp="label"
                style={{ width: "100%" }}
                placeholder={t("เลือกสินค้า — ต้องมีครบทุกชิ้นที่เลือก")}
                aria-label={t("สินค้าในใบสั่งซื้อ")}
                value={itemIds}
                onChange={(value) => setItemIds(value)}
                options={itemOptions}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ")}</label>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder={t("ทั้งหมด")}
                value={status}
                onChange={setStatus}
                options={Object.entries(PURCHASE_ORDER_STATUS_LABEL).map(
                  ([value, label]) => ({ value, label: tStatus(label) }),
                )}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะจ่ายเงิน")}</label>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder={t("ทั้งหมด")}
                value={paymentStatus}
                onChange={setPaymentStatus}
                options={[
                  { value: "UNPAID", label: t("รอจ่าย") },
                  { value: "PARTIAL", label: t("จ่ายบางส่วน") },
                  { value: "PAID", label: t("จ่ายแล้ว") },
                  { value: "NOT_REQUIRED", label: t("ไม่ต้องชำระ") },
                ]}
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
                setItemIds([]);
                setApplied({});
                setPage(1);
              }}
            >
              {t("เคลียร์")}
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
                  itemIds: itemIds.length ? itemIds : undefined,
                });
              }}
            >
              {t("ค้นหา")}
            </Button>
          </div>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.toolbarLeft}>
              {t("ใบสั่งซื้อทั้งหมด")} <strong>{total}</strong> {t("รายการ")}
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
            columns={columns}
            dataSource={rows}
            loading={trackingQuery.isLoading}
            pagination={false}
            scroll={{ x: 1280 }}
            className={styles.table}
            locale={{ emptyText: t("ยังไม่มีใบสั่งซื้อ") }}
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
    </MasterPageGate>
  );
}
