"use client";

import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useLabDashboardQuery } from "@/hooks/dashboards/useDashboards";
import { useT } from "@/lib/i18n/useT";
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
  const t = useT();
  const [params, range, setRange] = useDashboardRange();
  const q = useLabDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow={t("Laboratory Dashboard")}
      title={t("แดชบอร์ดห้องแล็บ")}
      subtitle={t("ตัวอย่างที่ค้างตรวจ · ผลผ่าน/ไม่ผ่าน · COA")}
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="LAB_DASHBOARD" build={() => (d ? buildLabReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? t("กำลังโหลดข้อมูล…") : t("ยังไม่มีข้อมูล")} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label={t("ลงทะเบียน รอตรวจ")} value={fmt(d.pending.registered, 0)} note={t("ค้างทั้งระบบ")} />
            <KpiCard label={t("กำลังตรวจ")} value={fmt(d.pending.testing, 0)} note={t("ค้างทั้งระบบ")} />
            <KpiCard label={t("รออนุมัติ (ตรวจทานแล้ว)")} value={fmt(d.pending.awaitingApproval, 0)} tone={d.pending.awaitingApproval > 0 ? "warn" : "default"} />
            <KpiCard label={t("ค้างนานเกิน 3 วัน")} value={fmt(d.pending.overdue, 0)} tone={d.pending.overdue > 0 ? "bad" : "good"} note={t("นับจากวันเก็บตัวอย่าง")} />
            <KpiCard
              label={t("อัตราผ่าน (ช่วงนี้)")}
              value={fmtPercent(d.results.passRatePercent)}
              tone={d.results.fail > 0 ? "warn" : "default"}
              note={t("ผ่าน {pass} · ไม่ผ่าน {fail} · ไม่มีเกณฑ์ {na}", { pass: d.results.pass, fail: d.results.fail, na: d.results.na })}
            />
            <KpiCard label={t("COA ที่ออก")} value={fmt(d.coa.issued, 0)} note={t("ยกเลิก {n}", { n: d.coa.voided })} />
            <KpiCard label={t("เวลาเฉลี่ยถึงตรวจทาน")} value={d.avgTurnaroundHours != null ? t("{v} ชม.", { v: fmt(d.avgTurnaroundHours, 1) }) : "—"} note={t("ลงทะเบียน → ตรวจทาน")} />
          </KpiGrid>

          <Panel title={t("ตัวอย่างที่เก็บรายวัน")}>
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="samples" name={t("ตัวอย่าง")} fill={DASH_COLORS.green} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title={t("สถานะตัวอย่าง (ช่วงนี้)")}>
              {d.byStatus.length === 0 ? <Empty text={t("ไม่มีตัวอย่างในช่วงนี้")} /> : d.byStatus.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
            <Panel title={t("ประเภทตัวอย่าง (ช่วงนี้)")}>
              {d.byType.length === 0 ? <Empty text={t("ไม่มีตัวอย่างในช่วงนี้")} /> : d.byType.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
          </Grid2>

          <Panel title={t("พารามิเตอร์ที่ไม่ผ่านบ่อย (5 อันดับ)")}>
            {d.topFailParameters.length === 0 ? (
              <Empty text={t("ไม่มีผลไม่ผ่านในช่วงนี้")} />
            ) : (
              d.topFailParameters.map((p) => <ListRow key={p.parameter} label={p.parameter} value={t("{n} ครั้ง", { n: p.failCount })} />)
            )}
          </Panel>
        </>
      )}
    </DashboardShell>
  );
}
