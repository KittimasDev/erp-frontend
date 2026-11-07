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
import ProductionDailySection from "@/components/dashboard/ProductionDailySection";
import {
  useProductionDashboardSummaryQuery,
  useProductionDowntimeQuery,
  useProductionStageProgressQuery,
  useProductionWorkInProgressQuery,
} from "@/hooks/production-dashboard/useProductionDashboardQueries";
import type {
  ProductionDashboardBucket,
  ProductionDashboardKpi,
  ProductionDashboardOutputLine,
  ProductionWorkInProgressRow,
} from "@/types/production-dashboard";
import styles from "./ProductionDashboardPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { getStoredLanguage } from "@/lib/i18n/language";
import { tProductionStatus } from "@/types/production-request";
import { tNow, useT } from "@/lib/i18n/useT";

/** ชุดสีเดียวกับ ProcurementDashboardPage ซึ่งเป็น dashboard ที่ทำเสร็จจริงหน้าเดียวในโปรเจกต */
const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const AMBER = "#F9BB0C";
const RED = "#CF1322";
const MUTED = "#77777C";

const { RangePicker } = DatePicker;
const OUTPUT_BAR_COLORS = [GREEN, "#2F6FDE", AMBER, "#595959", "#95DE64", "#13C2C2"];

function yieldLabel(kpi?: ProductionDashboardKpi) {
  if (!kpi || kpi.completedOrders === 0) return "—";
  if (kpi.averageYieldPercent === null || kpi.averageYieldPercent === undefined) {
    return tNow("ไม่สามารถเปรียบเทียบได้");
  }
  return `${fmt(kpi.averageYieldPercent)}%`;
}

function fmt(value?: number | null, digits = 2) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(getStoredLanguage() === "en" ? "en-GB" : "th-TH", { maximumFractionDigits: digits });
}

function fmtHours(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${fmt(value, 1)} ${tNow("ชม.")}`;
}

export default function ProductionDashboardPage() {
  const router = useRouter();
  const t = useT();
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

  const outputLines = summary?.outputLines ?? [];
  const outputUnits = useMemo(
    () => [
      ...new Set(
        outputLines
          .map((line) => line.unitCode || line.unitId)
          .filter((unit): unit is string => Boolean(unit)),
      ),
    ],
    [outputLines],
  );
  const singleOutputUnit = outputUnits.length === 1;
  const outputSeries = useMemo(() => {
    if (!singleOutputUnit) return [] as ProductionDashboardOutputLine[];
    const seen = new Map<string, ProductionDashboardOutputLine>();
    for (const line of outputLines) {
      if (!seen.has(line.itemId)) seen.set(line.itemId, line);
    }
    return [...seen.values()];
  }, [outputLines, singleOutputUnit]);

  const trendData = useMemo(
    () =>
      (summary?.trend ?? []).map((point) => {
        const row: Record<string, string | number | null> = {
          label:
            bucket === "MONTH"
              ? dayjs(point.bucket).format("MM/YYYY")
              : dayjs(point.bucket).format("DD/MM"),
          yieldPercent: point.yieldPercent,
          plannedYieldPercent: point.plannedYieldPercent,
        };
        if (singleOutputUnit) {
          for (const series of outputSeries) row[series.itemId] = 0;
          for (const line of point.outputLines ?? []) {
            row[line.itemId] = Number(line.quantity) || 0;
          }
        }
        return row;
      }),
    [summary?.trend, bucket, singleOutputUnit, outputSeries],
  );

  const chartNote = !outputLines.length
    ? t("ยังไม่มีผลผลิตที่รับเข้าคลังในช่วงนี้")
    : outputUnits.length > 1
      ? t("ไม่สามารถเปรียบเทียบได้ — ผลผลิตคนละหน่วย ไม่รวมเป็นยอดเดียว")
      : outputSeries.length > 1
        ? t("แยกตามสินค้า หน่วย {unit} · ไม่คิด Yield รวมข้ามสินค้า", { unit: outputUnits[0] })
        : t("แท่ง = ผลผลิต ({unit}) · เส้น = Yield", { unit: outputUnits[0] ?? "" });

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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ใบสั่งผลิต"),
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
      title: t("สถานะ"),
      dataIndex: "status",
      key: "status",
      render: (_v, row) =>
        row.isPaused ? (
          <Tag color="warning">{t("หยุดชั่วคราว")}</Tag>
        ) : (
          <Tag color="processing">{tProductionStatus("กำลังผลิต")}</Tag>
        ),
    },
    {
      title: t("เวลาที่ใช้ / เป้าหมาย"),
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
                ? `${fmt(row.elapsedHours, 1)}/${row.cycleTargetHours} ${t("ชม.")}`
                : fmtHours(row.elapsedHours)
            }
          />
          {row.isOverdue ? (
            <span className={styles.overdueText}>{t("เลยเป้าหมายแล้ว")}</span>
          ) : null}
        </div>
      ),
    },
    {
      title: t("เดินเครื่องจริง"),
      dataIndex: "netRunHours",
      key: "netRunHours",
      align: "right",
      render: (value: number) => fmtHours(value),
    },
    {
      title: t("หยุดสะสม"),
      dataIndex: "downtimeHours",
      key: "downtimeHours",
      align: "right",
      render: (value: number) => fmtHours(value),
    },
    {
      title: t("กำลังหยุดเพราะ"),
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
        <PageHeader
          eyebrow="Production Dashboard"
          title={t("แดชบอร์ดการผลิต")}
          subtitle={t("ผลผลิตจริง · Yield · เวลาหยุดเดินเครื่อง · งานอยู่ขั้นไหน")}
        />

        <div className={styles.toolbar}>
          <div className={styles.filterField}>
            <span>{t("ช่วงวันที่ (กว้างสุด 90 วัน)")}</span>
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
            <span>{t("ความละเอียด")}</span>
            <Segmented
              value={bucket}
              onChange={(value) =>
                setBucket(value as ProductionDashboardBucket)
              }
              options={[
                { label: t("รายวัน"), value: "DAY" },
                { label: t("รายสัปดาห์"), value: "WEEK" },
                { label: t("รายเดือน"), value: "MONTH" },
              ]}
            />
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>{t("ปิดงานในช่วงนี้")}</span>
            <strong>{fmt(kpi?.completedOrders, 0)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("กำลังผลิตอยู่")}</span>
            <strong>{fmt(kpi?.inProgressOrders, 0)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("หยุดชั่วคราวอยู่")}</span>
            <strong className={kpi?.pausedOrders ? styles.warnValue : undefined}>
              {fmt(kpi?.pausedOrders, 0)}
            </strong>
          </div>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>{t("Yield เฉลี่ย")}</span>
            <strong
              className={
                kpi && kpi.completedOrders > 0 && kpi.averageYieldPercent == null
                  ? styles.summaryPhrase
                  : undefined
              }
            >
              {yieldLabel(kpi)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("เวลาหยุดรวม")}</span>
            <strong>{fmtHours(kpi?.totalDowntimeHours)}</strong>
          </div>
        </div>

        {/*
          ต้องบอกตรง ๆ ว่าค่าเฉลี่ยไม่ได้นับใบไหนบ้าง — ERP ที่โชว์ Yield ผิด
          อย่างมั่นใจ อันตรายกว่าตัวที่บอกว่าเทียบไม่ได้
        */}
        {kpi && kpi.yieldExcludedOrders > 0 ? (
          <Alert
            type={kpi.yieldImpossibleOrders > 0 ? "warning" : "info"}
            showIcon
            title={t("Yield เฉลี่ยไม่ได้นับใบสั่งผลิต {n} ใบ", { n: kpi.yieldExcludedOrders })}
            description={
              <>
                <p style={{ margin: 0 }}>
                  {t("ใบที่มีผลผลิตหลายสินค้า หรือวัตถุดิบกับผลผลิตคนละหน่วย ไม่ถูกบวกเป็นยอดเดียว และไม่ถูกเอาไปเฉลี่ย Yield")}
                </p>
                {/* ต่างจากผสมหน่วยตรงที่อันนี้แก้ได้ และต้องแก้ */}
                {kpi.yieldImpossibleOrders > 0 ? (
                  <p style={{ margin: "6px 0 0" }}>
                    <strong>
                      {t("ในจำนวนนี้ {n} ใบมีผลผลิตมากกว่าวัตถุดิบที่ใส่เข้าไป", { n: kpi.yieldImpossibleOrders })}
                    </strong>{" "}
                    {t("ซึ่งเป็นไปไม่ได้ทางกายภาพ — มีคนกรอกจำนวนผิด เปิดหน้ารายละเอียดใบนั้นจะเห็นคำเตือนพร้อมตัวเลขที่ขัดกัน")}
                  </p>
                ) : null}
              </>
            }
          />
        ) : null}

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>{t("ผลผลิตและ Yield ตามช่วงเวลา")}</h3>
            <p>{chartNote}</p>
          </div>
          {outputLines.length > 0 ? (
            <ul className={styles.reasonList}>
              {outputLines.map((line) => (
                <li key={`${line.itemId}-${line.unitId}`}>
                  <span>{line.itemNameTh || line.itemCode || t("สินค้า")}</span>
                  <strong>
                    {fmt(line.quantity)} {line.unitCode ?? ""}
                  </strong>
                </li>
              ))}
            </ul>
          ) : null}
          <div className={styles.chartBody}>
            {trendData.length === 0 ? (
              <div className={styles.emptyState}>
                {t("ยังไม่มีใบสั่งผลิตที่ปิดงานในช่วงนี้")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} />
                  {singleOutputUnit ? (
                    <YAxis
                      yAxisId="qty"
                      tick={{ fill: MUTED, fontSize: 12 }}
                      width={70}
                    />
                  ) : null}
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    tick={{ fill: MUTED, fontSize: 12 }}
                    width={50}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      value === null || value === undefined
                        ? t("ไม่สามารถเปรียบเทียบได้")
                        : fmt(Number(value)),
                      name,
                    ]}
                  />
                  <Legend />
                  {singleOutputUnit
                    ? outputSeries.map((series, index) => (
                        <Bar
                          key={series.itemId}
                          yAxisId="qty"
                          dataKey={series.itemId}
                          name={`${series.itemNameTh || series.itemCode || t("ผลผลิต")} (${outputUnits[0]})`}
                          fill={OUTPUT_BAR_COLORS[index % OUTPUT_BAR_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))
                    : null}
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="yieldPercent"
                    name={t("Yield จริง")}
                    stroke={GREEN_DARK}
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="plannedYieldPercent"
                    name={t("Yield ตามแผน")}
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
            <h3>{t("งานที่กำลังเดินอยู่")}</h3>
            <p>
              {t("อัปเดตอัตโนมัติทุก 30 วินาที")}
              {wip?.asOf
                ? ` · ${t("ข้อมูล ณ {time}", { time: dayjs(wip.asOf).format("HH:mm:ss") })}`
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
              emptyText: t(
                "ยังไม่มีใบสั่งผลิตที่กำลังเดินอยู่ — กระดานนี้จะว่างจนกว่าจะมีใบที่กดเริ่มผลิตจริง",
              ),
            }}
          />
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("สาเหตุการหยุดเดินเครื่อง")}</h3>
              <p>
                {t("รวม {hours} ในช่วงที่เลือก · เรียงจากกินเวลามากที่สุด", { hours: fmtHours(downtime?.totalHours) })}
              </p>
            </div>
            <div className={styles.chartBody}>
              {downtimeData.length === 0 ? (
                <div className={styles.emptyState}>
                  {t("ไม่มีการหยุดเดินเครื่องในช่วงนี้")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {/* แนวนอน ไม่ใช้ pie — เหตุผลเป็นข้อความไทยยาว legend ของ pie รับไม่ไหว */}
                  <BarChart data={downtimeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tick={{ fill: MUTED, fontSize: 12 }}
                      unit={` ${t("ชม.")}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={130}
                      tick={{ fill: MUTED, fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${fmt(Number(value), 1)} ${t("ชม.")}`, t("เวลาหยุด")]}
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
                      {fmt(reason.hours, 1)} {t("ชม.")} ({t("{n} ครั้ง", { n: reason.occurrences })})
                    </strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("Batch อยู่ขั้นไหน")}</h3>
              <p>{t("ขั้นตอนล่าสุดที่บันทึกไว้ของแต่ละ Batch")}</p>
            </div>
            <ul className={styles.batchList}>
              {(stageProgress?.batches ?? []).length === 0 ? (
                <li className={styles.emptyState}>
                  {t("ยังไม่มีรอบงานขั้นตอนย่อยในช่วงนี้")}
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
            <h3>{t("ความคืบหน้าตามขั้นตอน")}</h3>
            <p>
              {t("เฉพาะขั้นตอนที่เปิดใช้งานในเส้นทางแปรสภาพ — ขั้นที่ไม่มีงานเลยก็แสดงไว้ เพราะช่องว่างคือสัญญาณ")}
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
                  name={t("เสร็จแล้ว")}
                  stackId="runs"
                  fill={GREEN}
                />
                <Bar
                  dataKey="inProgressRuns"
                  name={t("กำลังทำ")}
                  stackId="runs"
                  fill={AMBER}
                />
                <Bar
                  dataKey="draftRuns"
                  name={t("รอเริ่ม")}
                  stackId="runs"
                  fill={MUTED}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* M15.2: Input Tire / ผลผลิต 4 ชนิด / Mass Balance / Efficiency / วันที่ N จาก 45 */}
        <ProductionDailySection params={params} />
      </section>
    </MasterPageGate>
  );
}
