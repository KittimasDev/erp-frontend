"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useHrDashboardQuery } from "@/hooks/dashboards/useDashboards";
import { useT } from "@/lib/i18n/useT";
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
  const t = useT();
  const [params, range, setRange] = useDashboardRange();
  const q = useHrDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow={t("HR Dashboard")}
      title={t("แดชบอร์ดบุคคล (HR)")}
      subtitle={t("กำลังคน · การลงเวลา · การลา · โอที")}
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="HRM_DASHBOARD" build={() => (d ? buildHrReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? t("กำลังโหลดข้อมูล…") : t("ยังไม่มีข้อมูล")} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label={t("พนักงานที่ใช้งาน")} value={fmt(d.headcount, 0)} />
            <KpiCard label={t("มาทำงานวันนี้")} value={fmt(d.today.present + d.today.late, 0)} note={t("สาย {late} · ลา {leave} · ขาด {absent}", { late: d.today.late, leave: d.today.onLeave, absent: d.today.absent })} />
            <KpiCard label={t("ยังไม่ลงเวลาวันนี้")} value={fmt(d.today.notRecorded, 0)} note={t("อาจไม่ได้อยู่กะวันนี้ ไม่ได้แปลว่าขาด")} />
            <KpiCard label={t("คำขอลารออนุมัติ")} value={fmt(d.leave.pending, 0)} tone={d.leave.pending > 0 ? "warn" : "good"} note={t("ลาที่จะเริ่มใน 7 วัน {n} ราย", { n: d.leave.upcoming7Days })} />
            <KpiCard label={t("โอทีรออนุมัติ")} value={fmt(d.overtime.pending, 0)} tone={d.overtime.pending > 0 ? "warn" : "good"} />
            <KpiCard label={t("โอทีอนุมัติ (ช่วงนี้)")} value={t("{v} ชม.", { v: fmt(d.overtime.approvedHours, 1) })} note={fmtBaht(d.overtime.approvedAmount)} />
            <KpiCard label={t("สายเฉลี่ย")} value={d.avgLateMinutes != null ? t("{v} นาที", { v: fmt(d.avgLateMinutes, 1) }) : "—"} note={t("เฉพาะคนที่สาย")} />
            {d.nextShutdown ? (
              <KpiCard
                label={t("แผน Shutdown ถัดไป")}
                value={t("อีก {n} วัน", { n: d.nextShutdown.daysUntil })}
                note={`${d.nextShutdown.name} (${formatThaiDate(d.nextShutdown.dateFrom)} – ${formatThaiDate(d.nextShutdown.dateTo)})`}
              />
            ) : null}
          </KpiGrid>

          <Panel title={t("การมาทำงานรายวัน")}>
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name={t("มาทำงาน")} fill={DASH_COLORS.green} />
                  <Bar dataKey="late" name={t("สาย")} fill={DASH_COLORS.amber} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title={t("การลาที่อนุมัติ (ช่วงนี้ รวม {n} วัน)", { n: fmt(d.leave.approvedDays, 0) })}>
              {d.leave.byType.length === 0 ? <Empty text={t("ไม่มีการลาในช่วงนี้")} /> : d.leave.byType.map((lt) => <ListRow key={lt.key} label={lt.label} value={t("{n} ใบ", { n: lt.count })} />)}
            </Panel>
            <Panel title={t("โอทีสูงสุด (5 อันดับ)")}>
              {d.overtime.topEmployees.length === 0 ? (
                <Empty text={t("ไม่มีโอทีที่อนุมัติในช่วงนี้")} />
              ) : (
                d.overtime.topEmployees.map((e) => <ListRow key={e.name} label={e.name} value={t("{v} ชม.", { v: fmt(e.hours, 1) })} />)
              )}
            </Panel>
          </Grid2>
        </>
      )}
    </DashboardShell>
  );
}
