"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useHrDashboardQuery } from "@/hooks/dashboards/useDashboards";
import { buildHrReport } from "@/utils/dashboardExport";

import {
  ChartBox,
  DASH_COLORS,
  DashboardExportButtons,
  DashboardShell,
  Empty,
  fmt,
  fmtBaht,
  Grid2,
  KpiCard,
  KpiGrid,
  ListRow,
  Panel,
  shortDate,
  useDashboardRange,
} from "./DashboardKit";

/** แดชบอร์ด HR (M15.7): กำลังคน การลงเวลาวันนี้ การลา โอที แผน Shutdown */
export default function HrDashboardPage() {
  const [params, range, setRange] = useDashboardRange();
  const q = useHrDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow="HR Dashboard"
      title="แดชบอร์ดบุคคล (HR)"
      subtitle="กำลังคน · การลงเวลา · การลา · โอที"
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="HRM_DASHBOARD" build={() => (d ? buildHrReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? "กำลังโหลดข้อมูล…" : "ยังไม่มีข้อมูล"} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label="พนักงานที่ใช้งาน" value={fmt(d.headcount, 0)} />
            <KpiCard label="มาทำงานวันนี้" value={fmt(d.today.present + d.today.late, 0)} note={`สาย ${d.today.late} · ลา ${d.today.onLeave} · ขาด ${d.today.absent}`} />
            <KpiCard label="ยังไม่ลงเวลาวันนี้" value={fmt(d.today.notRecorded, 0)} note="อาจไม่ได้อยู่กะวันนี้ ไม่ได้แปลว่าขาด" />
            <KpiCard label="คำขอลารออนุมัติ" value={fmt(d.leave.pending, 0)} tone={d.leave.pending > 0 ? "warn" : "good"} note={`ลาที่จะเริ่มใน 7 วัน ${d.leave.upcoming7Days} ราย`} />
            <KpiCard label="โอทีรออนุมัติ" value={fmt(d.overtime.pending, 0)} tone={d.overtime.pending > 0 ? "warn" : "good"} />
            <KpiCard label="โอทีอนุมัติ (ช่วงนี้)" value={`${fmt(d.overtime.approvedHours, 1)} ชม.`} note={fmtBaht(d.overtime.approvedAmount)} />
            <KpiCard label="สายเฉลี่ย" value={d.avgLateMinutes != null ? `${fmt(d.avgLateMinutes, 1)} นาที` : "—"} note="เฉพาะคนที่สาย" />
            {d.nextShutdown ? (
              <KpiCard
                label="แผน Shutdown ถัดไป"
                value={`อีก ${d.nextShutdown.daysUntil} วัน`}
                note={`${d.nextShutdown.name} (${formatThaiDate(d.nextShutdown.dateFrom)} – ${formatThaiDate(d.nextShutdown.dateTo)})`}
              />
            ) : null}
          </KpiGrid>

          <Panel title="การมาทำงานรายวัน">
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="มาทำงาน" fill={DASH_COLORS.green} />
                  <Bar dataKey="late" name="สาย" fill={DASH_COLORS.amber} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title={`การลาที่อนุมัติ (ช่วงนี้ รวม ${fmt(d.leave.approvedDays, 0)} วัน)`}>
              {d.leave.byType.length === 0 ? <Empty text="ไม่มีการลาในช่วงนี้" /> : d.leave.byType.map((t) => <ListRow key={t.key} label={t.label} value={`${t.count} ใบ`} />)}
            </Panel>
            <Panel title="โอทีสูงสุด (5 อันดับ)">
              {d.overtime.topEmployees.length === 0 ? (
                <Empty text="ไม่มีโอทีที่อนุมัติในช่วงนี้" />
              ) : (
                d.overtime.topEmployees.map((e) => <ListRow key={e.name} label={e.name} value={`${fmt(e.hours, 1)} ชม.`} />)
              )}
            </Panel>
          </Grid2>
        </>
      )}
    </DashboardShell>
  );
}
