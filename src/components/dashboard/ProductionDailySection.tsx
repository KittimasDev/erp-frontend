"use client";

import { Alert, Progress, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useProductionDailyQuery } from "@/hooks/dashboards/useDashboards";
import { buildProductionDailyReport } from "@/utils/dashboardExport";
import type {
  DashboardRange,
  MassBalanceStatus,
  ProductionCycleBalance,
  ProductionDailyDay,
} from "@/types/dashboards";

import {
  ChartBox,
  DASH_COLORS,
  DashboardExportButtons,
  Empty,
  fmt,
  fmtKg,
  fmtPercent,
  Grid2,
  KpiCard,
  KpiGrid,
  ListRow,
  Panel,
  shortDate,
} from "./DashboardKit";

const axis = { fontSize: 11 };
const KIND_COLORS: Record<string, string> = {
  OIL: "#2F6FDE",
  RCB: "#434343",
  STEEL: "#8C8C8C",
  SYNGAS: "#F9BB0C",
  OTHER: "#B7EB8F",
};
const STATUS_TAG: Record<MassBalanceStatus, { color: string; text: string }> = {
  OK: { color: "green", text: "ปกติ" },
  NO_DATA: { color: "default", text: "ไม่มีข้อมูลเทียบ" },
  NOT_COMPARABLE: { color: "default", text: "เทียบไม่ได้" },
  EXCEEDS_INPUT: { color: "red", text: "ผลผลิตเกินยางป้อน" },
};

/** เตือนเมื่อผลผลิตมากกว่าวัตถุดิบ (เป็นไปไม่ได้ทางกายภาพ — มักกรอกผิด) หรือยังไม่มีข้อมูลเทียบ */
export function MassBalanceNote({ status }: { status: MassBalanceStatus }) {
  if (status === "EXCEEDS_INPUT") {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 8 }}
        title="ผลผลิตรับเข้าคลังมากกว่ายางที่ป้อน — ตรวจบันทึกกะ/ใบรับผลผลิตว่ากรอกครบหรือผิดหรือไม่"
      />
    );
  }
  if (status === "NO_DATA") {
    return <div style={{ marginBottom: 8, color: "#8a9199", fontSize: 13 }}>ยังไม่มีข้อมูลยางป้อน (บันทึกกะ) หรือผลผลิตให้เทียบ Mass Balance</div>;
  }
  return null;
}

const PHASE_TEXT: Record<string, string> = {
  RUNNING: "กำลังผลิต",
  NOT_STARTED: "ยังไม่เริ่มรอบ",
  SHUTDOWN: "อยู่ในช่วง Shutdown",
  OVERDUE: "เลยกำหนดสิ้นรอบ ยังไม่ปิดรอบ",
};

/** รอบผลิตปัจจุบัน: วันที่ N จาก 45 · เหลือกี่วันถึง Shutdown · Mass Balance และผลผลิตสะสมรายรอบ */
export function CycleSummary({ cycle }: { cycle: ProductionCycleBalance }) {
  const b = cycle.balance;
  return (
    <div>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>
        {cycle.phase === "NOT_STARTED" ? "ยังไม่เริ่มรอบ" : `วันที่ ${cycle.runDay} จาก ${cycle.runDays}`}
        <span style={{ fontSize: 13, fontWeight: 400, color: "#8a9199" }}> · {cycle.cycleNo}</span>
      </div>
      <Progress percent={Math.round(cycle.progressPercent)} status={cycle.phase === "OVERDUE" ? "exception" : "active"} />
      <div style={{ marginBottom: 8 }}>
        <Tag>{PHASE_TEXT[cycle.phase] ?? cycle.phase}</Tag>
        {cycle.daysToShutdown !== undefined
          ? `เหลืออีก ${cycle.daysToShutdown} วันถึง Shutdown (เริ่ม ${formatThaiDate(cycle.shutdownStartDate)})`
          : cycle.phase === "SHUTDOWN"
            ? `Shutdown ถึง ${formatThaiDate(cycle.shutdownEndDate)}`
            : ""}
      </div>
      <ListRow label="ยางป้อนสะสมรอบ" value={fmtKg(b.inputKg)} />
      <ListRow label="ผลผลิตสะสมรอบ (kg)" value={fmtKg(b.outputKg)} />
      <ListRow
        label="Mass Balance รายรอบ (ส่วนต่าง)"
        value={b.status === "NO_DATA" ? "ไม่มีข้อมูลเทียบ" : `${fmtKg(b.lossKg)} (${fmtPercent(b.lossPercent)})`}
      />
      {b.status === "EXCEEDS_INPUT" ? <MassBalanceNote status={b.status} /> : null}
      {cycle.outputKinds.map((k) => (
        <ListRow key={k.kind} label={`· ${k.label}`} value={`${fmtKg(k.quantityKg)}${k.yieldPercentOfInput != null ? ` (${fmtPercent(k.yieldPercentOfInput)})` : ""}`} />
      ))}
    </div>
  );
}

/**
 * ส่วนเสริมของ Production Dashboard (M15.2): Input Tire, ผลผลิต 4 ชนิด, Mass Balance รายวัน/รายรอบ, Efficiency, วันที่ N จาก 45
 */
export default function ProductionDailySection({ params }: { params: DashboardRange }) {
  const q = useProductionDailyQuery(params);
  const d = q.data;
  if (!d) {
    return q.error ? (
      <Alert type="error" showIcon title="โหลดข้อมูลการผลิตรายวันไม่สำเร็จ" />
    ) : (
      <Empty text="กำลังโหลดข้อมูลการผลิตรายวัน…" />
    );
  }

  const columns: ColumnsType<ProductionDailyDay> = [
    { title: "วันที่", dataIndex: "date", width: 110, render: (v: string) => formatThaiDate(v) },
    { title: "ยางป้อน (kg)", dataIndex: "inputKg", align: "right", render: (v: number) => fmt(v, 0) },
    { title: "ผลผลิต (kg)", dataIndex: "outputKg", align: "right", render: (v: number) => fmt(v, 0) },
    {
      title: "ส่วนต่าง (kg)",
      dataIndex: "lossKg",
      align: "right",
      render: (v: number, r) => (r.massBalanceStatus === "NO_DATA" ? "—" : `${fmt(v, 0)} (${fmtPercent(r.lossPercent)})`),
    },
    {
      title: "Efficiency",
      dataIndex: "efficiencyPercent",
      align: "right",
      render: (v?: number | null) => fmtPercent(v),
    },
    {
      title: "Mass Balance",
      dataIndex: "massBalanceStatus",
      render: (v: MassBalanceStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].text}</Tag>,
    },
  ];

  const chartDays = d.days.map((day) => ({ date: day.date, ...day.outputByKind }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <DashboardExportButtons screenCode="PRODUCTION_DASHBOARD" build={() => buildProductionDailyReport(d)} />
      </div>
      <KpiGrid>
        <KpiCard label="Input Tire (ยางป้อน)" value={fmtKg(d.totals.inputKg)} note={`จากบันทึกกะ ${d.totals.recordedDays} วัน`} />
        <KpiCard label="ผลผลิตรับเข้าคลัง (kg)" value={fmtKg(d.totals.outputKg)} note="นับเฉพาะหน่วย kg ที่อนุมัติแล้ว" />
        <KpiCard
          label="Mass Balance (ส่วนต่าง)"
          value={d.totals.status === "NO_DATA" ? "—" : fmtPercent(d.totals.lossPercent)}
          tone={d.totals.status === "EXCEEDS_INPUT" ? "bad" : "default"}
          note={d.totals.status === "NO_DATA" ? "ยังไม่มีข้อมูลเทียบ" : `${fmtKg(d.totals.lossKg)} ของยางป้อน`}
        />
        <KpiCard label="Efficiency เฉลี่ย" value={fmtPercent(d.totals.averageEfficiencyPercent)} note="ชั่วโมงเดินเครื่อง ÷ 24 (เฉพาะวันที่มีบันทึกกะ)" />
      </KpiGrid>

      <Grid2>
        <Panel title="รอบผลิต (วันที่ N จาก 45)">
          {d.cycle ? <CycleSummary cycle={d.cycle} /> : <Empty text="ไม่มีรอบผลิตที่เปิดอยู่" />}
        </Panel>
        <Panel title="ผลผลิตช่วงที่เลือก แยก 4 ชนิด">
          {d.outputKinds.map((k) => (
            <ListRow
              key={k.kind}
              label={k.label}
              value={`${fmtKg(k.quantityKg)}${k.yieldPercentOfInput != null ? ` (${fmtPercent(k.yieldPercentOfInput)} ของยางป้อน)` : ""}`}
            />
          ))}
          {d.nonKgOutputs.length > 0 ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "#8a9199" }}>
              ไม่นับใน Mass Balance (คนละหน่วย): {d.nonKgOutputs.map((o) => `${o.itemName} ${fmt(o.quantity, 0)} ${o.unit}`).join(", ")}
            </div>
          ) : null}
          <div style={{ marginTop: 8, fontSize: 12, color: "#8a9199" }}>
            ชนิดผลผลิตจัดจากรหัส/ชื่อสินค้า (Oil / rCB / Steel / Syngas) — สินค้าที่ไม่เข้าเกณฑ์อยู่ใน “อื่น ๆ”
          </div>
        </Panel>
      </Grid2>

      <Panel title="ผลผลิตรายวัน แยกชนิด (kg)">
        <ChartBox>
          <ResponsiveContainer>
            <ComposedChart data={chartDays}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={axis} />
              <YAxis tick={axis} />
              <Tooltip formatter={(v) => fmtKg(Number(v))} />
              <Legend />
              {d.outputKinds.map((k) => (
                <Bar key={k.kind} dataKey={k.kind} name={k.label} stackId="out" fill={KIND_COLORS[k.kind]} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartBox>
      </Panel>

      <Panel title="Input Tire เทียบผลผลิต และ Efficiency รายวัน">
        <ChartBox>
          <ResponsiveContainer>
            <ComposedChart data={d.days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={axis} />
              <YAxis yAxisId="kg" tick={axis} />
              <YAxis yAxisId="eff" orientation="right" domain={[0, 100]} tick={axis} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="kg" dataKey="inputKg" name="ยางป้อน (kg)" fill={DASH_COLORS.muted} />
              <Bar yAxisId="kg" dataKey="outputKg" name="ผลผลิต (kg)" fill={DASH_COLORS.green} />
              <Line yAxisId="eff" dataKey="efficiencyPercent" name="Efficiency %" stroke={DASH_COLORS.amber} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartBox>
      </Panel>

      <Panel title="Mass Balance รายวัน">
        <MassBalanceNote status={d.totals.status} />
        <Table<ProductionDailyDay>
          rowKey="date"
          size="small"
          columns={columns}
          dataSource={[...d.days].reverse().filter((r) => r.inputKg > 0 || r.outputKg > 0 || r.operatingHours > 0)}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 640 }}
          locale={{ emptyText: "ไม่มีบันทึกกะหรือผลผลิตในช่วงนี้" }}
        />
      </Panel>
    </>
  );
}
