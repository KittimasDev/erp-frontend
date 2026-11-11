"use client";

import { useMemo, useState } from "react";
import { Button, DatePicker, Select } from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  FireOutlined,
  InboxOutlined,
  TagsOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import MasterPageGate from "@/components/common/MasterPageGate";
import PageHeader from "@/components/common/PageHeader";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import { useWeighbridgeAnalyticsQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeAnalyticsQuery";
import type { WeighbridgeAnalyticsSource } from "@/types/weighbridge-tickets";

import styles from "./ReceivingAnalyticsDashboardPage.module.css";

const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const GREEN_SOFT = "#A9C46C";
const AMBER = "#F9BB0C";
const MUTED = "#77777C";
const GRAY = "#B8BCC2";

const SOURCE_OPTIONS: Array<{
  value: WeighbridgeAnalyticsSource;
  label: string;
}> = [
  { value: "ALL", label: "ทั้งหมด (ตั๋วรับซื้อ + T2900)" },
  { value: "PURCHASE", label: "เฉพาะตั๋วรับซื้อ (/receiving)" },
  { value: "T2900", label: "เฉพาะบัตร T2900 ที่ยังไม่เปิดตั๋ว" },
];

/** locale ตัวเลขตามภาษาปัจจุบัน — เรียกตอน render เท่านั้น */
const numberLocale = () => (getStoredLanguage() === "en" ? "en-GB" : "th-TH");

function formatMoney(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString(numberLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString(numberLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDayLabel(date: string) {
  return dayjs(date).format("D/M");
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default function ReceivingAnalyticsDashboardPage() {
  const t = useT();
  const router = useRouter();
  const today = dayjs();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    today.subtract(13, "day"),
    today,
  ]);
  const [hourlyDate, setHourlyDate] = useState<Dayjs>(today);
  const [tireClassificationId, setTireClassificationId] = useState<
    string | undefined
  >();
  const [source, setSource] = useState<WeighbridgeAnalyticsSource>("ALL");
  const [hourlyAutoPicked, setHourlyAutoPicked] = useState(false);

  const from = range[0].format("YYYY-MM-DD");
  const to = range[1].format("YYYY-MM-DD");
  const date = hourlyDate.format("YYYY-MM-DD");

  const classificationsQuery = useTireClassificationsQuery({ isActive: true });
  const analyticsQuery = useWeighbridgeAnalyticsQuery({
    from,
    to,
    date,
    tireClassificationId,
    source,
  });
  const data = analyticsQuery.data?.data;
  const summary = data?.summary;

  // วันนี้ยังไม่มีรถ → กราฟรายชั่วโมงว่างตั้งแต่เปิดหน้า: เลือกวันล่าสุดที่มีรถในช่วงให้ครั้งแรกครั้งเดียว
  if (!hourlyAutoPicked && data) {
    setHourlyAutoPicked(true);
    if ((data.hourly ?? []).every((point) => point.tickets === 0)) {
      const latest = [...(data.daily ?? [])]
        .reverse()
        .find((point) => point.tickets > 0);
      if (latest && latest.date !== date) {
        setHourlyDate(dayjs(latest.date));
      }
    }
  }

  const classificationOptions = useMemo(
    () =>
      (classificationsQuery.data?.data ?? []).map((item) => ({
        value: item.id,
        label: `${item.classificationCode} — ${item.classificationName}`,
      })),
    [classificationsQuery.data?.data],
  );

  const selectedClassificationLabel = useMemo(() => {
    if (!tireClassificationId) {
      return null;
    }
    return (
      classificationOptions.find((opt) => opt.value === tireClassificationId)
        ?.label ?? null
    );
  }, [classificationOptions, tireClassificationId]);

  const dailyChartData = useMemo(
    () =>
      (data?.daily ?? []).map((point) => ({
        ...point,
        label: formatDayLabel(point.date),
        netWeight: Number(point.netWeightKg) || 0,
        amountNum: Number(point.amount) || 0,
      })),
    [data?.daily],
  );

  const hourlyChartData = useMemo(
    () =>
      (data?.hourly ?? []).map((point) => ({
        ...point,
        label: formatHourLabel(point.hour),
        netWeight: Number(point.netWeightKg) || 0,
      })),
    [data?.hourly],
  );

  const paymentChartData = useMemo(() => {
    const paid = summary?.paid ?? 0;
    const waiting = summary?.waitingPayment ?? 0;
    const unreceipted = summary?.unreceipted ?? 0;
    return [
      { name: t("จ่ายแล้ว"), value: paid, color: GREEN },
      { name: t("รอจ่าย"), value: waiting, color: AMBER },
      { name: t("ยังไม่เปิดใบรับซื้อ"), value: unreceipted, color: GRAY },
    ].filter((item) => item.value > 0);
  }, [summary?.paid, summary?.waitingPayment, summary?.unreceipted, t]);

  const classificationChartData = useMemo(
    () =>
      (data?.byClassification ?? []).map((point) => ({
        ...point,
        label: point.classificationName || point.classificationCode,
        netWeight: Number(point.netWeightKg) || 0,
        amountNum: Number(point.amount) || 0,
      })),
    [data?.byClassification],
  );

  const waitingCount = summary?.waitingPayment ?? 0;
  const unreceiptedCount = summary?.unreceipted ?? 0;
  const needsAction = waitingCount > 0 || unreceiptedCount > 0;

  /** ตัวเลขสรุปที่คำนวณจากข้อมูลเดิมของ API — ไม่มีการเรียก API เพิ่ม */
  const insights = useMemo(() => {
    const tickets = summary?.tickets ?? 0;
    const net = Number(summary?.totalNetWeightKg) || 0;
    const amount = Number(summary?.totalAmount) || 0;
    const paid = summary?.paid ?? 0;
    const receipted = paid + (summary?.waitingPayment ?? 0);
    const days = Math.max(1, dailyChartData.length);

    const peakDay = dailyChartData.reduce<
      (typeof dailyChartData)[number] | null
    >((best, p) => (p.tickets > (best?.tickets ?? 0) ? p : best), null);
    const peakHour = hourlyChartData.reduce<
      (typeof hourlyChartData)[number] | null
    >((best, p) => (p.tickets > (best?.tickets ?? 0) ? p : best), null);

    const totalClassWeight = classificationChartData.reduce(
      (a, c) => a + c.netWeight,
      0,
    );
    const top = [...classificationChartData].sort(
      (a, b) => b.netWeight - a.netWeight,
    )[0];

    return {
      avgTicketsPerDay: tickets / days,
      avgWeightPerTicket: tickets > 0 ? net / tickets : 0,
      avgPricePerKg: net > 0 ? amount / net : 0,
      receipted,
      paidPct: receipted > 0 ? Math.round((paid / receipted) * 100) : 0,
      peakDay,
      peakHour,
      topClass:
        top && top.netWeight > 0
          ? {
              label: top.label,
              sharePct:
                totalClassWeight > 0
                  ? Math.round((top.netWeight / totalClassWeight) * 100)
                  : 0,
            }
          : null,
    };
  }, [summary, dailyChartData, hourlyChartData, classificationChartData]);

  return (
    <MasterPageGate isLoading={analyticsQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="Raw Tire · Receiving"
          title={t("ภาพรวมรับซื้อยาง")}
          subtitle={
            <>
              {dayjs(from).format("D MMM BBBB")} –{" "}
              {dayjs(to).format("D MMM BBBB")}
              {selectedClassificationLabel
                ? ` · ${selectedClassificationLabel}`
                : ""}
              {analyticsQuery.isFetching ? ` · ${t("กำลังอัปเดต…")}` : ""}
            </>
          }
        />

        <div className={styles.toolbar}>
          <div className={styles.toolbarFilters}>
            <label className={styles.filterField}>
              <span>{t("ช่วงรายวัน")}</span>
              <DatePicker.RangePicker
                allowClear={false}
                value={range}
                format="DD/MM/BBBB"
                disabledDate={(current) =>
                  Boolean(current && current.isAfter(today, "day"))
                }
                onChange={(values) => {
                  if (!values?.[0] || !values[1]) {
                    return;
                  }
                  let nextFrom = values[0].startOf("day");
                  let nextTo = values[1].startOf("day");
                  if (nextTo.diff(nextFrom, "day") > 89) {
                    nextFrom = nextTo.subtract(89, "day");
                  }
                  setRange([nextFrom, nextTo]);
                  if (
                    hourlyDate.isBefore(nextFrom, "day") ||
                    hourlyDate.isAfter(nextTo, "day")
                  ) {
                    setHourlyDate(nextTo);
                  }
                }}
              />
            </label>
            <label className={styles.filterField}>
              <span>{t("วันรายชั่วโมง")}</span>
              <DatePicker
                allowClear={false}
                value={hourlyDate}
                format="DD/MM/BBBB"
                disabledDate={(current) => {
                  if (!current) {
                    return false;
                  }
                  return (
                    current.isAfter(today, "day") ||
                    current.isBefore(range[0], "day") ||
                    current.isAfter(range[1], "day")
                  );
                }}
                onChange={(value) => {
                  if (value) {
                    setHourlyDate(value);
                  }
                }}
              />
            </label>
            <label className={styles.filterField}>
              <span>{t("แหล่งตั๋ว")}</span>
              <Select
                className={styles.productSelect}
                options={SOURCE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                value={source}
                onChange={(value) => setSource(value)}
              />
            </label>
            <label className={styles.filterField}>
              <span>{t("ประเภท/กลุ่มยาง")}</span>
              <Select
                allowClear
                showSearch
                placeholder={t("ทั้งหมด")}
                className={styles.productSelect}
                options={classificationOptions}
                value={tireClassificationId}
                loading={classificationsQuery.isLoading}
                optionFilterProp="label"
                onChange={(value) =>
                  setTireClassificationId(value ?? undefined)
                }
              />
            </label>
          </div>

          <div className={styles.toolbarActions}>
            <Button
              icon={<ArrowLeftOutlined />}
              className={styles.backButton}
              onClick={() => router.push("/receiving")}
            >
              {t("กลับรายการ")}
            </Button>
          </div>
        </div>

        {needsAction ? (
          <div className={styles.actionBanner} role="status">
            <WarningOutlined className={styles.actionIcon} />
            <div className={styles.actionText}>
              <strong>{t("มีรายการที่ต้องดำเนินการ")}</strong>
              <span>
                {waitingCount > 0
                  ? t("รอจ่ายเงิน {n} ใบ", { n: waitingCount })
                  : null}
                {waitingCount > 0 && unreceiptedCount > 0 ? " · " : null}
                {unreceiptedCount > 0
                  ? t("ยังไม่เปิดใบรับซื้อ {n} ใบ", { n: unreceiptedCount })
                  : null}
                {" "}{t("ในช่วงที่เลือก")}
              </span>
            </div>
            <Button
              type="primary"
              className={styles.actionButton}
              onClick={() => router.push("/receiving")}
            >
              {t("ไปที่รายการรับซื้อ")}
            </Button>
          </div>
        ) : null}

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <div className={styles.kpiHead}>
              <span className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
                <CarOutlined />
              </span>
              <span className={styles.kpiLabel}>{t("รถเข้า")}</span>
            </div>
            <strong>{summary?.tickets ?? 0}</strong>
            <small>{t("เฉลี่ย {value} คัน/วัน", { value: formatWeight(insights.avgTicketsPerDay) })}</small>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.kpiHead}>
              <span className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
                <InboxOutlined />
              </span>
              <span className={styles.kpiLabel}>{t("น้ำหนักสุทธิ")}</span>
            </div>
            <strong>
              {formatWeight(summary?.totalNetWeightKg ?? "0")}
              <em>{t("กก.")}</em>
            </strong>
            <small>{t("เฉลี่ย {value} กก./คัน", { value: formatWeight(insights.avgWeightPerTicket) })}</small>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.kpiHead}>
              <span className={`${styles.kpiIcon} ${styles.kpiIconBlue}`}>
                <WalletOutlined />
              </span>
              <span className={styles.kpiLabel}>{t("ยอดเงิน")}</span>
            </div>
            <strong>
              {formatMoney(summary?.totalAmount ?? "0")}
              <em>{t("บาท")}</em>
            </strong>
            <small>{t("เฉลี่ย {value} บาท/กก.", { value: formatMoney(insights.avgPricePerKg) })}</small>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.kpiHead}>
              <span className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
                <CheckCircleOutlined />
              </span>
              <span className={styles.kpiLabel}>{t("จ่ายแล้ว")}</span>
            </div>
            <strong>{summary?.paid ?? 0}</strong>
            <small>
              {insights.receipted > 0
                ? t("{pct}% ของใบรับซื้อทั้งหมด", { pct: insights.paidPct })
                : t("ยังไม่มีใบรับซื้อ")}
            </small>
          </div>
          <div
            className={`${styles.summaryCard} ${
              waitingCount > 0 ? styles.summaryCardWarn : ""
            }`}
          >
            <div className={styles.kpiHead}>
              <span className={`${styles.kpiIcon} ${styles.kpiIconAmber}`}>
                <ClockCircleOutlined />
              </span>
              <span className={styles.kpiLabel}>{t("รอจ่าย")}</span>
            </div>
            <strong>{waitingCount}</strong>
            <small>{t("ใบรับซื้อที่ยังไม่จ่ายเงิน")}</small>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.kpiHead}>
              <span className={`${styles.kpiIcon} ${styles.kpiIconGray}`}>
                <FileSearchOutlined />
              </span>
              <span className={styles.kpiLabel}>{t("ยังไม่เปิดใบรับซื้อ")}</span>
            </div>
            <strong>{unreceiptedCount}</strong>
            <small>{t("รวมบัตร T2900 ที่ยังไม่เปิดตั๋ว {n} ใบ", { n: summary?.t2900Only ?? 0 })}</small>
          </div>
        </div>

        <div className={styles.insightRow}>
          <div className={styles.insightItem}>
            <CalendarOutlined />
            <div>
              <span>{t("วันที่รถเข้ามากที่สุด")}</span>
              <strong>
                {insights.peakDay
                  ? `${dayjs(insights.peakDay.date).format("D MMM")} · ${t("{n} คัน", { n: insights.peakDay.tickets })}`
                  : "—"}
              </strong>
            </div>
          </div>
          <div className={styles.insightItem}>
            <FireOutlined />
            <div>
              <span>
                {t("ชั่วโมงเร่งด่วน ({date})", {
                  date: dayjs(data?.hourlyDate ?? date).format("D MMM"),
                })}
              </span>
              <strong>
                {insights.peakHour
                  ? `${formatHourLabel(insights.peakHour.hour)} · ${t("{n} คัน", { n: insights.peakHour.tickets })}`
                  : "—"}
              </strong>
            </div>
          </div>
          <div className={styles.insightItem}>
            <TagsOutlined />
            <div>
              <span>{t("ประเภทยางที่รับมากที่สุด")}</span>
              <strong>
                {insights.topClass
                  ? `${insights.topClass.label} · ${insights.topClass.sharePct}%`
                  : "—"}
              </strong>
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <div className={styles.chartHeader}>
              <h3>{t("แนวโน้มรายวัน")}</h3>
              <p>
                {t("จำนวนรถและน้ำหนักสุทธิ")} · {formatDayLabel(from)} –{" "}
                {formatDayLabel(to)}
                {selectedClassificationLabel
                  ? ` · ${selectedClassificationLabel}`
                  : ""}
              </p>
            </div>
            <div className={`${styles.chartBody} ${styles.chartBodyTall}`}>
              {dailyChartData.every((point) => point.tickets === 0) ? (
                <div className={styles.emptyState}>{t("ไม่มีข้อมูลในช่วงนี้")}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyChartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="ticketsFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={GREEN}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={GREEN}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={{ stroke: "#e4e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="tickets"
                      allowDecimals={false}
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <YAxis
                      yAxisId="weight"
                      orientation="right"
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(value: number) =>
                        Number(value).toLocaleString(numberLocale())
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value, name) => {
                        const n = Number(value ?? 0);
                        if (name === t("น้ำหนัก (กก.)")) {
                          return [formatWeight(n), name];
                        }
                        if (name === t("ยอดเงิน (บาท)")) {
                          return [formatMoney(n), name];
                        }
                        return [n, name];
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="tickets"
                      type="monotone"
                      dataKey="tickets"
                      name={t("จำนวนรถ")}
                      stroke={GREEN_DARK}
                      fill="url(#ticketsFill)"
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="weight"
                      type="monotone"
                      dataKey="netWeight"
                      name={t("น้ำหนัก (กก.)")}
                      stroke={GREEN_SOFT}
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <div className={styles.chartHeader}>
              <h3>{t("แยกตามประเภท/กลุ่มยาง")}</h3>
              <p>{t("น้ำหนักและยอดเงินจากรายการคัดแยกในช่วงที่เลือก")}</p>
            </div>
            {classificationChartData.length === 0 ? (
              <div className={styles.chartBody}>
                <div className={styles.emptyState}>
                  {t("ยังไม่มีรายการคัดแยกในช่วงนี้")}
                </div>
              </div>
            ) : (
              <div className={styles.classificationLayout}>
                <div
                  className={styles.classificationCharts}
                  style={{
                    minHeight: Math.max(
                      220,
                      classificationChartData.length * 52,
                    ),
                  }}
                >
                  <div className={styles.classificationChartPane}>
                    <h4>{t("น้ำหนัก (กก.)")}</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={classificationChartData}
                        margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#eef0f3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: MUTED, fontSize: 11 }}
                          axisLine={{ stroke: "#e4e7eb" }}
                          tickLine={false}
                          tickFormatter={(value: number) =>
                            Number(value).toLocaleString(numberLocale())
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={120}
                          tick={{ fill: MUTED, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #e4e7eb",
                          }}
                          formatter={(value) => [
                            formatWeight(Number(value ?? 0)),
                            t("น้ำหนัก (กก.)"),
                          ]}
                        />
                        <Bar
                          dataKey="netWeight"
                          fill={GREEN}
                          radius={[0, 4, 4, 0]}
                          minPointSize={4}
                        >
                          <LabelList
                            dataKey="netWeight"
                            position="right"
                            formatter={(value) =>
                              formatWeight(Number(value ?? 0))
                            }
                            style={{ fill: MUTED, fontSize: 11 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.classificationChartPane}>
                    <h4>{t("ยอดเงิน (บาท)")}</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={classificationChartData}
                        margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#eef0f3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: MUTED, fontSize: 11 }}
                          axisLine={{ stroke: "#e4e7eb" }}
                          tickLine={false}
                          tickFormatter={(value: number) =>
                            Number(value).toLocaleString(numberLocale())
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={120}
                          tick={{ fill: MUTED, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #e4e7eb",
                          }}
                          formatter={(value) => [
                            formatMoney(Number(value ?? 0)),
                            t("ยอดเงิน (บาท)"),
                          ]}
                        />
                        <Bar
                          dataKey="amountNum"
                          fill={GREEN_DARK}
                          radius={[0, 4, 4, 0]}
                          minPointSize={4}
                        >
                          <LabelList
                            dataKey="amountNum"
                            position="right"
                            formatter={(value) =>
                              formatMoney(Number(value ?? 0))
                            }
                            style={{ fill: MUTED, fontSize: 11 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.classificationTableWrap}>
                  <table className={styles.classificationTable}>
                    <thead>
                      <tr>
                        <th>{t("ประเภท/กลุ่มยาง")}</th>
                        <th>{t("รถเข้า")}</th>
                        <th>{t("น้ำหนัก (กก.)")}</th>
                        <th>{t("ยอดเงิน (บาท)")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classificationChartData.map((row) => (
                        <tr key={row.tireClassificationId}>
                          <td>
                            <span className={styles.classCode}>
                              {row.classificationCode}
                            </span>
                            {row.classificationName}
                          </td>
                          <td>{row.tickets}</td>
                          <td>{formatWeight(row.netWeightKg)}</td>
                          <td>{formatMoney(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("รายชั่วโมง")}</h3>
              <p>
                {t("จำนวนรถตามชั่วโมง")} ·{" "}
                {dayjs(data?.hourlyDate ?? date).format("DD/MM/BBBB")}
              </p>
            </div>
            <div className={styles.chartBody}>
              {hourlyChartData.every((point) => point.tickets === 0) ? (
                <div className={styles.emptyState}>{t("ไม่มีข้อมูลในวันนี้")}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hourlyChartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                    <XAxis
                      dataKey="label"
                      interval={2}
                      tick={{ fill: MUTED, fontSize: 11 }}
                      axisLine={{ stroke: "#e4e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value, name) => {
                        const n = Number(value ?? 0);
                        if (name === t("น้ำหนัก (กก.)")) {
                          return [formatWeight(n), name];
                        }
                        return [n, name];
                      }}
                    />
                    <Bar
                      dataKey="tickets"
                      name={t("จำนวนรถ")}
                      fill={GREEN}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("สถานะการจ่ายเงิน")}</h3>
              <p>
                {t("จ่ายแล้ว · รอจ่าย · ยังไม่เปิดใบรับซื้อ (รวมบัตร T2900 ที่ยังไม่เปิดตั๋ว {n} ใบ)", { n: summary?.t2900Only ?? 0 })}
              </p>
            </div>
            <div className={`${styles.chartBody} ${styles.chartBodyRel}`}>
              {paymentChartData.length > 0 ? (
                <div className={styles.donutCenter}>
                  <strong>{insights.paidPct}%</strong>
                  <span>{t("จ่ายแล้ว")}</span>
                </div>
              ) : null}
              {paymentChartData.length === 0 ? (
                <div className={styles.emptyState}>
                  {t("ไม่มีตั๋วในช่วงที่เลือก")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {paymentChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
