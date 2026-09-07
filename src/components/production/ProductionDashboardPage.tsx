"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, DatePicker, Progress, Segmented, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useProductionDashboardSummaryQuery,
  useProductionDowntimeQuery,
  useProductionStageProgressQuery,
  useProductionWorkInProgressQuery,
} from "@/hooks/production-dashboard/useProductionDashboardQueries";
import type {
  ProductionDashboardBucket,
  ProductionWorkInProgressRow,
} from "@/types/production-dashboard";
import styles from "./ProductionDashboardPage.module.css";

/** ชุดสีเดียวกับ ProcurementDashboardPage ซึ่งเป็น dashboard ที่ทำเสร็จจริงหน้าเดียวในโปรเจกต */
const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const AMBER = "#F9BB0C";
const RED = "#CF1322";
const MUTED = "#77777C";

const { RangePicker } = DatePicker;

function fmt(value?: number | null, digits = 2) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("th-TH", { maximumFractionDigits: digits });
}

function fmtHours(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${fmt(value, 1)} ชม.`;
}

export default function ProductionDashboardPage() {
  const router = useRouter();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    // 30 วันไม่ใช่ 7 — รอบเตา 48 ชั่วโมง 7 วันได้แค่ ~3 จุดข้อมูล วาดแนวโน้มไม่ได้
    dayjs().subtract(30, "day"),
    dayjs(),
  ]);
  const [bucket, setBucket] = useState<ProductionDashboardBucket>("DAY");

  const params = useMemo(
    () => ({
      from: range[0].format("YYYY-MM-DD"),
      to: range[1].format("YYYY-MM-DD"),
    }),
    [range],
  );

  const summaryQuery = useProductionDashboardSummaryQuery({
    ...params,
    bucket,
  });
  const wipQuery = useProductionWorkInProgressQuery();
  const downtimeQuery = useProductionDowntimeQuery(params);
  const stageQuery = useProductionStageProgressQuery(params);

  const summary = summaryQuery.data?.data;
  const wip = wipQuery.data?.data;
  const downtime = downtimeQuery.data?.data;
  const stageProgress = stageQuery.data?.data;

  const trendData = useMemo(
    () =>
      (summary?.trend ?? []).map((point) => ({
        ...point,
        label:
          bucket === "MONTH"
            ? dayjs(point.bucket).format("MM/YYYY")
            : dayjs(point.bucket).format("DD/MM"),
      })),
    [summary?.trend, bucket],
  );

  const downtimeData = useMemo(
    () =>
      (downtime?.byCategory ?? []).map((row) => ({
        ...row,
        // recharts ไม่วาดอะไรเลยถ้าเป็น string ตัวเลข — ต้อง Number() ก่อนเสมอ
        hours: Number(row.hours),
      })),
    [downtime?.byCategory],
  );

  const stageData = useMemo(
    () =>
      (stageProgress?.stages ?? []).map((row) => ({
        ...row,
        completedRuns: Number(row.completedRuns),
        inProgressRuns: Number(row.inProgressRuns),
        draftRuns: Number(row.draftRuns),
      })),
    [stageProgress?.stages],
  );

  const wipColumns: ColumnsType<ProductionWorkInProgressRow> = [
    {
      title: "ใบสั่งผลิต",
      dataIndex: "orderNo",
      key: "orderNo",
      render: (value: string, row) => (
        <div className={styles.cellStack}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => router.push(`/production/production-orders/${row.id}`)}
          >
            {value}
          </button>
          {row.batchNo ? (
            <span className={styles.cellMuted}>Batch {row.batchNo}</span>
          ) : null}
        </div>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (_v, row) =>
        row.isPaused ? (
          <Tag color="warning">หยุดชั่วคราว</Tag>
        ) : (
          <Tag color="processing">กำลังผลิต</Tag>
        ),
    },
    {
      title: "เวลาที่ใช้ / เป้าหมาย",
      key: "progress",
      width: 220,
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <Progress
            percent={Math.min(100, row.cycleProgressPercent ?? 0)}
            size="small"
            strokeColor={row.isOverdue ? RED : row.isPaused ? AMBER : GREEN}
            format={() =>
              row.cycleTargetHours
                ? `${fmt(row.elapsedHours, 1)}/${row.cycleTargetHours} ชม.`
                : fmtHours(row.elapsedHours)
            }
          />
          {row.isOverdue ? (
            <span className={styles.overdueText}>เลยเป้าหมายแล้ว</span>
          ) : null}
        </div>
      ),
    },
    {
      title: "เดินเครื่องจริง",
      dataIndex: "netRunHours",
      key: "netRunHours",
      align: "right",
      render: (value: number) => fmtHours(value),
    },
    {
      title: "หยุดสะสม",
      dataIndex: "downtimeHours",
      key: "downtimeHours",
      align: "right",
      render: (value: number) => fmtHours(value),
    },
    {
      title: "กำลังหยุดเพราะ",
      dataIndex: "openDowntimeReason",
      key: "openDowntimeReason",
      render: (value?: string) =>
        value ?? <span className={styles.cellMuted}>—</span>,
    },
  ];

  const kpi = summary?.kpi;

  return (
    <MasterPageGate isLoading={summaryQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>ผลิต</div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>Production Dashboard</div>
            <h2 className={styles.pageTitle}>แดชบอร์ดการผลิต</h2>
            <span className={styles.pageSubtitle}>
              ผลผลิตจริง · Yield · เวลาหยุดเดินเครื่อง · งานอยู่ขั้นไหน
            </span>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterField}>
            <span>ช่วงวันที่ (กว้างสุด 90 วัน)</span>
            <RangePicker
              value={range}
              allowClear={false}
              format="DD/MM/YYYY"
              onChange={(value) => {
                if (value?.[0] && value[1]) setRange([value[0], value[1]]);
              }}
            />
          </div>
          <div className={styles.filterField}>
            <span>ความละเอียด</span>
            <Segmented
              value={bucket}
              onChange={(value) =>
                setBucket(value as ProductionDashboardBucket)
              }
              options={[
                { label: "รายวัน", value: "DAY" },
                { label: "รายสัปดาห์", value: "WEEK" },
                { label: "รายเดือน", value: "MONTH" },
              ]}
            />
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>ปิดงานในช่วงนี้</span>
            <strong>{fmt(kpi?.completedOrders, 0)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>กำลังผลิตอยู่</span>
            <strong>{fmt(kpi?.inProgressOrders, 0)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>หยุดชั่วคราวอยู่</span>
            <strong className={kpi?.pausedOrders ? styles.warnValue : undefined}>
              {fmt(kpi?.pausedOrders, 0)}
            </strong>
          </div>
          <div className={styles.summaryCardAccent}>
            <span>Yield เฉลี่ย</span>
            <strong>
              {kpi?.averageYieldPercent === null ||
              kpi?.averageYieldPercent === undefined
                ? "เทียบไม่ได้"
                : `${fmt(kpi.averageYieldPercent)}%`}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>เวลาหยุดรวม</span>
            <strong>{fmtHours(kpi?.totalDowntimeHours)}</strong>
          </div>
        </div>

        {/*
          ต้องบอกตรง ๆ ว่าค่าเฉลี่ยไม่ได้นับใบไหนบ้าง — ERP ที่โชว์ Yield ผิด
          อย่างมั่นใจ อันตรายกว่าตัวที่บอกว่าเทียบไม่ได้
        */}
        {kpi && kpi.yieldExcludedOrders > 0 ? (
          <Alert
            type="info"
            showIcon
            title={`Yield เฉลี่ยไม่ได้นับใบสั่งผลิต ${kpi.yieldExcludedOrders} ใบ`}
            description="ใบเหล่านั้นมีวัตถุดิบกับผลผลิตคนละหน่วย (เช่น น้ำมันเป็นลิตร ผงคาร์บอนเป็นกิโลกรัม) การหารข้ามหน่วยได้ตัวเลขที่ไม่มีความหมาย จึงตัดออกแทนที่จะเฉลี่ยของที่ผิด — ดู Yield รายใบได้ในหน้ารายละเอียดใบสั่งผลิต"
          />
        ) : null}

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>ผลผลิตและ Yield ตามช่วงเวลา</h3>
            <p>แท่ง = ผลผลิตที่รับเข้าคลังจริง · เส้น = Yield</p>
          </div>
          <div className={styles.chartBody}>
            {trendData.length === 0 ? (
              <div className={styles.emptyState}>
                ยังไม่มีใบสั่งผลิตที่ปิดงานในช่วงนี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} />
                  <YAxis
                    yAxisId="qty"
                    tick={{ fill: MUTED, fontSize: 12 }}
                    width={70}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    tick={{ fill: MUTED, fontSize: 12 }}
                    width={50}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      value === null ? "เทียบไม่ได้" : fmt(Number(value)),
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="qty"
                    dataKey="actualOutputQty"
                    name="ผลผลิตจริง"
                    fill={GREEN}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="yieldPercent"
                    name="Yield จริง"
                    stroke={GREEN_DARK}
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="plannedYieldPercent"
                    name="Yield ตามแผน"
                    stroke={MUTED}
                    strokeDasharray="5 4"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.chartHeader}>
            <h3>งานที่กำลังเดินอยู่</h3>
            <p>
              อัปเดตอัตโนมัติทุก 30 วินาที
              {wip?.asOf
                ? ` · ข้อมูล ณ ${dayjs(wip.asOf).format("HH:mm:ss")}`
                : ""}
            </p>
          </div>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            loading={wipQuery.isLoading}
            dataSource={wip?.rows ?? []}
            columns={wipColumns}
            // แถวที่หยุดอยู่ต้องอ่านออกโดยไม่ต้องไล่หาคอลัมน์สถานะ
            rowClassName={(row) => (row.isPaused ? styles.pausedRow : "")}
            locale={{
              emptyText:
                "ยังไม่มีใบสั่งผลิตที่กำลังเดินอยู่ — กระดานนี้จะว่างจนกว่าจะมีใบที่กดเริ่มผลิตจริง",
            }}
          />
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>สาเหตุการหยุดเดินเครื่อง</h3>
              <p>
                รวม {fmtHours(downtime?.totalHours)} ในช่วงที่เลือก · เรียงจาก
                กินเวลามากที่สุด
              </p>
            </div>
            <div className={styles.chartBody}>
              {downtimeData.length === 0 ? (
                <div className={styles.emptyState}>
                  ไม่มีการหยุดเดินเครื่องในช่วงนี้
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {/* แนวนอน ไม่ใช้ pie — เหตุผลเป็นข้อความไทยยาว legend ของ pie รับไม่ไหว */}
                  <BarChart data={downtimeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tick={{ fill: MUTED, fontSize: 12 }}
                      unit=" ชม."
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={130}
                      tick={{ fill: MUTED, fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${fmt(Number(value), 1)} ชม.`, "เวลาหยุด"]}
                    />
                    <Bar dataKey="hours" fill={AMBER} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {downtime && downtime.topReasons.length > 0 ? (
              <ul className={styles.reasonList}>
                {downtime.topReasons.map((reason) => (
                  <li key={reason.reason}>
                    <span>{reason.reason}</span>
                    <strong>
                      {fmt(reason.hours, 1)} ชม. ({reason.occurrences} ครั้ง)
                    </strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>Batch อยู่ขั้นไหน</h3>
              <p>ขั้นตอนล่าสุดที่บันทึกไว้ของแต่ละ Batch</p>
            </div>
            <ul className={styles.batchList}>
              {(stageProgress?.batches ?? []).length === 0 ? (
                <li className={styles.emptyState}>
                  ยังไม่มีรอบงานขั้นตอนย่อยในช่วงนี้
                </li>
              ) : (
                stageProgress?.batches.map((batch) => (
                  <li key={batch.label}>
                    <span>{batch.label}</span>
                    <strong>
                      {batch.latestSequenceNo}. {batch.latestStageLabel}
                    </strong>
                    <span className={styles.cellMuted}>
                      {dayjs(batch.latestRunDate).format("DD/MM/YYYY")}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>ความคืบหน้าตามขั้นตอน</h3>
            <p>
              เรียงตามลำดับกระบวนการจริง — เตรียมยาง 1–6 · ไพโรไลซิส 10 · rCB
              21–27 · ขั้นที่ไม่มีงานเลยก็แสดงไว้ เพราะช่องว่างคือสัญญาณ
            </p>
          </div>
          <div className={styles.stageChartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: MUTED, fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tick={{ fill: MUTED, fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="completedRuns"
                  name="เสร็จแล้ว"
                  stackId="runs"
                  fill={GREEN}
                />
                <Bar
                  dataKey="inProgressRuns"
                  name="กำลังทำ"
                  stackId="runs"
                  fill={AMBER}
                />
                <Bar
                  dataKey="draftRuns"
                  name="รอเริ่ม"
                  stackId="runs"
                  fill={MUTED}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
