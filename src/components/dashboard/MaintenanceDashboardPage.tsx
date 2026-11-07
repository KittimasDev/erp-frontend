"use client";

import { Tag } from "antd";
import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useMaintenanceDashboardQuery } from "@/hooks/dashboards/useDashboards";
import { useT } from "@/lib/i18n/useT";
import { buildMaintenanceReport } from "@/utils/dashboardExport";

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

/** แดชบอร์ดซ่อมบำรุง (M15.7): ใบสั่งงานค้าง/เลยกำหนด PM ถึงกำหนด Downtime เครื่องจักร */
export default function MaintenanceDashboardPage() {
  const t = useT();
  const [params, range, setRange] = useDashboardRange();
  const q = useMaintenanceDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow={t("Maintenance Dashboard")}
      title={t("แดชบอร์ดซ่อมบำรุง")}
      subtitle={t("ใบสั่งงาน · PM · Downtime เครื่องจักร")}
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="MAINTENANCE_DASHBOARD" build={() => (d ? buildMaintenanceReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? t("กำลังโหลดข้อมูล…") : t("ยังไม่มีข้อมูล")} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label={t("ใบสั่งงาน PM ที่เปิดอยู่")} value={fmt(d.openWorkOrders.pm, 0)} />
            <KpiCard label={t("ใบสั่งงาน CM (ซ่อม) ที่เปิดอยู่")} value={fmt(d.openWorkOrders.cm, 0)} tone={d.openWorkOrders.cm > 0 ? "warn" : "default"} />
            <KpiCard label={t("เลยกำหนด")} value={fmt(d.openWorkOrders.overdue, 0)} tone={d.openWorkOrders.overdue > 0 ? "bad" : "good"} note={t("PM เลยกำหนด {n} แผน", { n: d.pmOverdueCount })} />
            <KpiCard label={t("PM ทันกำหนด (ช่วงนี้)")} value={fmtPercent(d.completed.pmOnTimePercent)} note={t("เสร็จ PM {pm} · CM {cm}", { pm: d.completed.pm, cm: d.completed.cm })} />
            <KpiCard label={t("Downtime เครื่องจักร")} value={t("{v} ชม.", { v: fmt(d.downtime.hours, 1) })} note={t("{n} ครั้ง", { n: d.downtime.occurrences })} tone={d.downtime.hours > 0 ? "warn" : "default"} />
            <KpiCard label={t("เวลาซ่อมเฉลี่ย")} value={d.downtime.avgRepairHours != null ? t("{v} ชม.", { v: fmt(d.downtime.avgRepairHours, 1) }) : "—"} note={t("เฉพาะครั้งที่ปิดแล้ว")} />
          </KpiGrid>

          <Panel title={t("ใบสั่งงานที่เปิดและเสร็จรายวัน")}>
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="created" name={t("เปิดใบสั่งงาน")} fill={DASH_COLORS.amber} />
                  <Bar dataKey="completed" name={t("ปิดงานแล้ว")} fill={DASH_COLORS.green} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title={t("ใบสั่งงานเลยกำหนด (นานสุดก่อน)")}>
              {d.overdueList.length === 0 ? (
                <Empty text={t("ไม่มีใบสั่งงานเลยกำหนด")} />
              ) : (
                d.overdueList.map((w) => (
                  <ListRow
                    key={w.workOrderNo}
                    label={
                      <span>
                        <Tag color={w.type === "PM" ? "blue" : "volcano"}>{w.type}</Tag>
                        {w.workOrderNo} · {w.equipment}
                      </span>
                    }
                    value={t("เลย {n} วัน ({date})", { n: w.daysOverdue, date: formatThaiDate(w.plannedDate) })}
                  />
                ))
              )}
            </Panel>
            <Panel title={t("PM ที่เลยกำหนด / ถึงกำหนดใน 14 วัน")}>
              {d.pmDue.length === 0 ? (
                <Empty text={t("ไม่มี PM ใกล้ถึงกำหนด")} />
              ) : (
                d.pmDue.map((p) => (
                  <ListRow
                    key={`${p.equipment}-${p.nextDueDate}`}
                    label={`${p.equipment}${p.title ? ` · ${p.title}` : ""}`}
                    value={p.daysUntilDue < 0 ? t("เลย {n} วัน", { n: Math.abs(p.daysUntilDue) }) : p.daysUntilDue === 0 ? t("วันนี้") : t("อีก {n} วัน", { n: p.daysUntilDue })}
                  />
                ))
              )}
            </Panel>
          </Grid2>

          <Grid2>
            <Panel title={t("เครื่องที่หยุดนานสุด (5 อันดับ)")}>
              {d.topDowntimeEquipment.length === 0 ? (
                <Empty text={t("ไม่มี Downtime ในช่วงนี้")} />
              ) : (
                d.topDowntimeEquipment.map((e) => <ListRow key={e.equipment} label={e.equipment} value={t("{v} ชม. ({n} ครั้ง)", { v: fmt(e.hours, 1), n: e.occurrences })} />)
              )}
            </Panel>
            <Panel title={t("สถานะเครื่องจักร")}>
              {d.equipmentByStatus.length === 0 ? <Empty text={t("ยังไม่มีทะเบียนเครื่องจักร")} /> : d.equipmentByStatus.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
          </Grid2>
        </>
      )}
    </DashboardShell>
  );
}
