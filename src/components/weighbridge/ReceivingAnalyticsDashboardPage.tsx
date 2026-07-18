"use client";

import { useMemo, useState } from "react";
import { Button, DatePicker } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useWeighbridgeAnalyticsQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeAnalyticsQuery";

import styles from "./ReceivingAnalyticsDashboardPage.module.css";

const GREEN = "#8ab933";
const GREEN_DARK = "#6f9720";
const GREEN_SOFT = "#c5df7a";
const AMBER = "#d4a017";
const MUTED = "#8a9199";

function formatMoney(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
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
  const router = useRouter();
  const today = dayjs();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    today.subtract(13, "day"),
    today,
  ]);
  const [hourlyDate, setHourlyDate] = useState<Dayjs>(today);

  const from = range[0].format("YYYY-MM-DD");
  const to = range[1].format("YYYY-MM-DD");
  const date = hourlyDate.format("YYYY-MM-DD");

  const analyticsQuery = useWeighbridgeAnalyticsQuery({ from, to, date });
  const data = analyticsQuery.data?.data;
  const summary = data?.summary;

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
    return [
      { name: "จ่ายแล้ว", value: paid, color: GREEN },
      { name: "รอจ่าย", value: waiting, color: AMBER },
    ].filter((item) => item.value > 0);
  }, [summary?.paid, summary?.waitingPayment]);

  return (
    <MasterPageGate isLoading={analyticsQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarFilters}>
            <label className={styles.filterField}>
              <span>ช่วงรายวัน</span>
              <DatePicker.RangePicker
                allowClear={false}
                value={range}
                format="DD/MM/YYYY"
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
              <span>วันรายชั่วโมง</span>
              <DatePicker
                allowClear={false}
                value={hourlyDate}
                format="DD/MM/YYYY"
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
          </div>

          <div className={styles.toolbarActions}>
            <Button
              icon={<ArrowLeftOutlined />}
              className={styles.backButton}
              onClick={() => router.push("/receiving")}
            >
              กลับรายการ
            </Button>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>รถเข้า</span>
            <strong>{summary?.tickets ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>น้ำหนักสุทธิ</span>
            <strong>
              {formatWeight(summary?.totalNetWeightKg ?? "0")} กก.
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ยอดเงิน</span>
            <strong>{formatMoney(summary?.totalAmount ?? "0")} บาท</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>จ่ายแล้ว</span>
            <strong>{summary?.paid ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>รอจ่าย</span>
            <strong>{summary?.waitingPayment ?? 0}</strong>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <div className={styles.chartHeader}>
              <h3>แนวโน้มรายวัน</h3>
              <p>
                จำนวนรถและน้ำหนักสุทธิ · {formatDayLabel(from)} –{" "}
                {formatDayLabel(to)}
              </p>
            </div>
            <div className={`${styles.chartBody} ${styles.chartBodyTall}`}>
              {dailyChartData.length === 0 ? (
                <div className={styles.emptyState}>ไม่มีข้อมูลในช่วงนี้</div>
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
                        Number(value).toLocaleString("th-TH")
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value, name) => {
                        const n = Number(value ?? 0);
                        if (name === "น้ำหนัก (กก.)") {
                          return [formatWeight(n), name];
                        }
                        if (name === "ยอดเงิน (บาท)") {
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
                      name="จำนวนรถ"
                      stroke={GREEN_DARK}
                      fill="url(#ticketsFill)"
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="weight"
                      type="monotone"
                      dataKey="netWeight"
                      name="น้ำหนัก (กก.)"
                      stroke={GREEN_SOFT}
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>รายชั่วโมง</h3>
              <p>
                จำนวนรถตามชั่วโมง · {dayjs(data?.hourlyDate ?? date).format("DD/MM/YYYY")}
              </p>
            </div>
            <div className={styles.chartBody}>
              {hourlyChartData.every((point) => point.tickets === 0) ? (
                <div className={styles.emptyState}>ไม่มีข้อมูลในวันนี้</div>
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
                        if (name === "น้ำหนัก (กก.)") {
                          return [formatWeight(n), name];
                        }
                        return [n, name];
                      }}
                    />
                    <Bar
                      dataKey="tickets"
                      name="จำนวนรถ"
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
              <h3>สถานะการจ่ายเงิน</h3>
              <p>จ่ายแล้ว vs รอจ่ายในช่วงที่เลือก</p>
            </div>
            <div className={styles.chartBody}>
              {paymentChartData.length === 0 ? (
                <div className={styles.emptyState}>
                  ยังไม่มีรายการรอจ่ายหรือจ่ายแล้ว
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
