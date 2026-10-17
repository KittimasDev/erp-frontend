"use client";

import { Tag } from "antd";
import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useMaintenanceDashboardQuery } from "@/hooks/dashboards/useDashboards";
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
  const [params, range, setRange] = useDashboardRange();
  const q = useMaintenanceDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow="Maintenance Dashboard"
      title="แดชบอร์ดซ่อมบำรุง"
      subtitle="ใบสั่งงาน · PM · Downtime เครื่องจักร"
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="MAINTENANCE_DASHBOARD" build={() => (d ? buildMaintenanceReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? "กำลังโหลดข้อมูล…" : "ยังไม่มีข้อมูล"} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label="ใบสั่งงาน PM ที่เปิดอยู่" value={fmt(d.openWorkOrders.pm, 0)} />
            <KpiCard label="ใบสั่งงาน CM (ซ่อม) ที่เปิดอยู่" value={fmt(d.openWorkOrders.cm, 0)} tone={d.openWorkOrders.cm > 0 ? "warn" : "default"} />
            <KpiCard label="เลยกำหนด" value={fmt(d.openWorkOrders.overdue, 0)} tone={d.openWorkOrders.overdue > 0 ? "bad" : "good"} note={`PM เลยกำหนด ${d.pmOverdueCount} แผน`} />
            <KpiCard label="PM ทันกำหนด (ช่วงนี้)" value={fmtPercent(d.completed.pmOnTimePercent)} note={`เสร็จ PM ${d.completed.pm} · CM ${d.completed.cm}`} />
            <KpiCard label="Downtime เครื่องจักร" value={`${fmt(d.downtime.hours, 1)} ชม.`} note={`${d.downtime.occurrences} ครั้ง`} tone={d.downtime.hours > 0 ? "warn" : "default"} />
            <KpiCard label="เวลาซ่อมเฉลี่ย" value={d.downtime.avgRepairHours != null ? `${fmt(d.downtime.avgRepairHours, 1)} ชม.` : "—"} note="เฉพาะครั้งที่ปิดแล้ว" />
          </KpiGrid>

          <Panel title="ใบสั่งงานที่เปิดและเสร็จรายวัน">
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="created" name="เปิดใบสั่งงาน" fill={DASH_COLORS.amber} />
                  <Bar dataKey="completed" name="ปิดงานแล้ว" fill={DASH_COLORS.green} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title="ใบสั่งงานเลยกำหนด (นานสุดก่อน)">
              {d.overdueList.length === 0 ? (
                <Empty text="ไม่มีใบสั่งงานเลยกำหนด" />
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
                    value={`เลย ${w.daysOverdue} วัน (${formatThaiDate(w.plannedDate)})`}
                  />
                ))
              )}
            </Panel>
            <Panel title="PM ที่เลยกำหนด / ถึงกำหนดใน 14 วัน">
              {d.pmDue.length === 0 ? (
                <Empty text="ไม่มี PM ใกล้ถึงกำหนด" />
              ) : (
                d.pmDue.map((p) => (
                  <ListRow
                    key={`${p.equipment}-${p.nextDueDate}`}
                    label={`${p.equipment}${p.title ? ` · ${p.title}` : ""}`}
                    value={p.daysUntilDue < 0 ? `เลย ${Math.abs(p.daysUntilDue)} วัน` : p.daysUntilDue === 0 ? "วันนี้" : `อีก ${p.daysUntilDue} วัน`}
                  />
                ))
              )}
            </Panel>
          </Grid2>

          <Grid2>
            <Panel title="เครื่องที่หยุดนานสุด (5 อันดับ)">
              {d.topDowntimeEquipment.length === 0 ? (
                <Empty text="ไม่มี Downtime ในช่วงนี้" />
              ) : (
                d.topDowntimeEquipment.map((e) => <ListRow key={e.equipment} label={e.equipment} value={`${fmt(e.hours, 1)} ชม. (${e.occurrences} ครั้ง)`} />)
              )}
            </Panel>
            <Panel title="สถานะเครื่องจักร">
              {d.equipmentByStatus.length === 0 ? <Empty text="ยังไม่มีทะเบียนเครื่องจักร" /> : d.equipmentByStatus.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
          </Grid2>
        </>
      )}
    </DashboardShell>
  );
}
