"use client";

import { useMemo } from "react";
import { Alert, Progress, Table, Tooltip } from "antd";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ProductionOrderSummary } from "@/types/production-order";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionOrderYieldCard.module.css";

/**
 * สรุป Yield / Mass Balance ของใบสั่งผลิต
 *
 * แยกออกมาจาก `ProductionOrderDetailPage.tsx` ซึ่งยาว 1366 บรรทัดและมี Modal
 * อยู่แล้ว 4 ตัว — ย้ายบล็อกนี้ออกทำให้หน้านั้น **สั้นลง** ทั้งที่เพิ่มกราฟเข้ามา
 */

/** สีชุดเดียวกับ dashboard อื่นในระบบ (ProcurementDashboardPage) */
const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const GREEN_SOFT = "#A9C46C";
const AMBER = "#F9BB0C";
const MUTED = "#77777C";

function fmt(value?: string | number) {
  if (value === undefined || value === null || value === "") return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

export default function ProductionOrderYieldCard({
  summary,
}: {
  summary: ProductionOrderSummary;
}) {
  /*
    recharts ไม่รับ decimal string จาก API — ส่งเข้าไปตรง ๆ กราฟจะว่างเปล่า
    โดยไม่มี error ต้องแปลงเป็น number ก่อนเสมอ
  */
  const compareRows = useMemo(
    () =>
      summary.yieldCompareByItem.map((line) => ({
        label: line.itemCode ?? line.itemNameTh ?? line.itemId,
        unitCode: line.unitCode ?? "",
        plannedQty: Number(line.plannedQty) || 0,
        actualQty: Number(line.actualQty) || 0,
      })),
    [summary.yieldCompareByItem],
  );

  const hasOutput = Number(summary.totalOutputQty) > 0;
  const gaugeColor =
    summary.yieldPercent >= summary.plannedYieldPercent ? GREEN : AMBER;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>เปรียบเทียบ Yield / Mass Balance</h3>
      </div>

      {/*
        ข้อมูลจริงทุกใบในระบบตอนนี้ผสมหน่วย (น้ำมันเป็นลิตร ผงคาร์บอนเป็นกิโล)
        การบวกข้ามหน่วยทำให้เคยเห็น yield 333% มาแล้ว — ต้องบอกตรง ๆ ว่าเทียบไม่ได้
        ไม่ใช่แปลงหน่วยให้แบบมั่ว ๆ เพราะมันเป็นคนละมิติ ไม่ใช่แค่คนละหน่วย
      */}
      {summary.quantitiesComparable ? null : (
        <Alert
          type="warning"
          showIcon
          className={styles.unitWarning}
          message="ตัวเลข Yield เทียบไม่ได้ — ใบนี้มีหลายหน่วย"
          description={
            `พบหน่วย ${summary.unitCodes.join(" · ")} ในใบเดียวกัน ` +
            "ยอดรวมและเปอร์เซ็นต์ด้านล่างเกิดจากการบวกข้ามหน่วย ใช้ดูแนวโน้มได้แต่อย่าใช้ตัดสินใจ " +
            "ให้ดูตัวเลขรายสินค้าในตารางแทน"
          }
        />
      )}

      <div className={styles.yieldTop}>
        <div className={styles.gauge}>
          <Tooltip
            title={
              hasOutput
                ? "ผลผลิตที่รับเข้าคลังแล้ว ÷ วัตถุดิบที่ตัดเข้าผลิตจริง"
                : "ยังไม่มีผลผลิตเข้าคลัง — ไม่ใช่ yield 0% แต่คือของยังอยู่หน้างาน"
            }
          >
            <Progress
              type="dashboard"
              size={150}
              percent={Math.min(100, summary.yieldPercent)}
              strokeColor={gaugeColor}
              format={() =>
                hasOutput ? (
                  <span className={styles.gaugeValue}>
                    {summary.yieldPercent}%
                  </span>
                ) : (
                  <span className={styles.gaugeEmpty}>ยังไม่มีผลผลิต</span>
                )
              }
            />
          </Tooltip>
          <div className={styles.gaugeCaption}>
            Yield จริง · แผน {summary.plannedYieldPercent}%
          </div>
        </div>

        <div className={styles.yieldGrid}>
          <Metric label="วัตถุดิบ (แผน)" value={fmt(summary.totalPlannedInputQty)} />
          <Metric label="วัตถุดิบ (ตัดจริง)" value={fmt(summary.totalInputQty)} />
          <Metric label="ผลผลิต (แผน)" value={fmt(summary.totalPlannedOutputQty)} />
          <Metric
            label="ผลผลิต (เข้าคลังแล้ว)"
            value={fmt(summary.totalOutputQty)}
          />
          <Metric label="ของเสีย (แผน)" value={fmt(summary.totalPlannedWasteQty)} />
          <Metric
            label="ของเสีย (จริง · ไม่เข้าคลัง)"
            value={fmt(summary.totalActualWasteQty)}
          />
          <Metric label="Mass balance" value={fmt(summary.massBalanceDiff)} />
          <Metric
            label="Downtime รวม"
            value={`${summary.totalDowntimeHours} ชม.`}
            hint={
              summary.openDowntimeCount > 0
                ? `กำลังหยุดอยู่ ${summary.openDowntimeHours} ชม.`
                : undefined
            }
          />
        </div>
      </div>

      {compareRows.length > 0 ? (
        <div className={styles.chartBody} style={{ height: chartHeight(compareRows.length) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={compareRows}
              margin={{ top: 8, right: 56, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: MUTED, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={130}
                tick={{ fill: MUTED, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e4e7eb" }}
                formatter={(value, name) => [fmt(Number(value ?? 0)), name]}
              />
              <Legend />
              <Bar
                dataKey="plannedQty"
                name="แผน"
                fill={GREEN_SOFT}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="actualQty"
                name="จริง (เข้าคลัง)"
                fill={GREEN_DARK}
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey="actualQty"
                  position="right"
                  formatter={(v) => fmt(Number(v ?? 0))}
                  style={{ fill: MUTED, fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* กราฟไว้ดูรูป ตารางไว้กระทบยอด — ห้ามตัดตารางทิ้ง */}
      {summary.yieldCompareByItem.length > 0 ? (
        <Table
          className={masterStyles.dataTable}
          rowKey="itemId"
          size="small"
          pagination={false}
          style={{ marginTop: 16 }}
          dataSource={summary.yieldCompareByItem}
          columns={[
            {
              title: "ผลผลิต",
              key: "item",
              render: (_, row) =>
                row.itemCode
                  ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
                  : row.itemId,
            },
            {
              title: "แผน",
              key: "planned",
              align: "right",
              render: (_, row) => `${fmt(row.plannedQty)} ${row.unitCode ?? ""}`,
            },
            {
              title: "จริง (เข้าคลัง)",
              key: "actual",
              align: "right",
              render: (_, row) => `${fmt(row.actualQty)} ${row.unitCode ?? ""}`,
            },
            {
              title: "Yield แผน",
              dataIndex: "plannedYieldPercent",
              key: "plannedYieldPercent",
              align: "right",
              render: (v: number) => `${v}%`,
            },
            {
              title: "Yield จริง",
              dataIndex: "actualYieldPercent",
              key: "actualYieldPercent",
              align: "right",
              render: (v: number) => `${v}%`,
            },
          ]}
        />
      ) : null}
    </div>
  );
}

/** สูงพอให้แท่งไม่เบียดกันเมื่อผลผลิตมีหลายรายการ */
function chartHeight(rowCount: number) {
  return Math.max(180, rowCount * 56 + 60);
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
      {hint ? <span className={styles.infoHint}>{hint}</span> : null}
    </div>
  );
}
