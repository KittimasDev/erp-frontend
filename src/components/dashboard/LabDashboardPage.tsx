"use client";

import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useLabDashboardQuery } from "@/hooks/dashboards/useDashboards";
import { buildLabReport } from "@/utils/dashboardExport";

import {
  ChartBox,
  DASH_COLORS,
  DashboardExportButtons,
  DashboardShell,
  Empty,
  fmt,
  fmtPercent,
  Grid2,
  KpiCard,
  KpiGrid,
  ListRow,
  Panel,
  shortDate,
  useDashboardRange,
} from "./DashboardKit";

/** แดชบอร์ดห้องแล็บ (M15.7): ตัวอย่างค้าง สถานะ ผลผ่าน/ไม่ผ่าน COA เวลาเฉลี่ย */
export default function LabDashboardPage() {
  const [params, range, setRange] = useDashboardRange();
  const q = useLabDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow="Laboratory Dashboard"
      title="แดชบอร์ดห้องแล็บ"
      subtitle="ตัวอย่างที่ค้างตรวจ · ผลผ่าน/ไม่ผ่าน · COA"
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="LAB_DASHBOARD" build={() => (d ? buildLabReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? "กำลังโหลดข้อมูล…" : "ยังไม่มีข้อมูล"} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label="ลงทะเบียน รอตรวจ" value={fmt(d.pending.registered, 0)} note="ค้างทั้งระบบ" />
            <KpiCard label="กำลังตรวจ" value={fmt(d.pending.testing, 0)} note="ค้างทั้งระบบ" />
            <KpiCard label="รออนุมัติ (ตรวจทานแล้ว)" value={fmt(d.pending.awaitingApproval, 0)} tone={d.pending.awaitingApproval > 0 ? "warn" : "default"} />
            <KpiCard label="ค้างนานเกิน 3 วัน" value={fmt(d.pending.overdue, 0)} tone={d.pending.overdue > 0 ? "bad" : "good"} note="นับจากวันเก็บตัวอย่าง" />
            <KpiCard
              label="อัตราผ่าน (ช่วงนี้)"
              value={fmtPercent(d.results.passRatePercent)}
              tone={d.results.fail > 0 ? "warn" : "default"}
              note={`ผ่าน ${d.results.pass} · ไม่ผ่าน ${d.results.fail} · ไม่มีเกณฑ์ ${d.results.na}`}
            />
            <KpiCard label="COA ที่ออก" value={fmt(d.coa.issued, 0)} note={`ยกเลิก ${d.coa.voided}`} />
            <KpiCard label="เวลาเฉลี่ยถึงตรวจทาน" value={d.avgTurnaroundHours != null ? `${fmt(d.avgTurnaroundHours, 1)} ชม.` : "—"} note="ลงทะเบียน → ตรวจทาน" />
          </KpiGrid>

          <Panel title="ตัวอย่างที่เก็บรายวัน">
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="samples" name="ตัวอย่าง" fill={DASH_COLORS.green} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title="สถานะตัวอย่าง (ช่วงนี้)">
              {d.byStatus.length === 0 ? <Empty text="ไม่มีตัวอย่างในช่วงนี้" /> : d.byStatus.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
            <Panel title="ประเภทตัวอย่าง (ช่วงนี้)">
              {d.byType.length === 0 ? <Empty text="ไม่มีตัวอย่างในช่วงนี้" /> : d.byType.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
          </Grid2>

          <Panel title="พารามิเตอร์ที่ไม่ผ่านบ่อย (5 อันดับ)">
            {d.topFailParameters.length === 0 ? (
              <Empty text="ไม่มีผลไม่ผ่านในช่วงนี้" />
            ) : (
              d.topFailParameters.map((p) => <ListRow key={p.parameter} label={p.parameter} value={`${p.failCount} ครั้ง`} />)
            )}
          </Panel>
        </>
      )}
    </DashboardShell>
  );
}
