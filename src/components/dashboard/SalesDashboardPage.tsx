"use client";

import { Tag } from "antd";
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useSalesDashboardQuery } from "@/hooks/dashboards/useDashboards";
import { buildSalesReport } from "@/utils/dashboardExport";

import {
  ChartBox,
  DASH_COLORS,
  DashboardExportButtons,
  DashboardShell,
  Empty,
  fmt,
  fmtBaht,
  fmtPercent,
  Grid2,
  KpiCard,
  KpiGrid,
  ListRow,
  Panel,
  shortDate,
  useDashboardRange,
} from "./DashboardKit";

/** แดชบอร์ดฝ่ายขาย (M15.7): ใบเสนอราคา ยอดขาย ลูกค้าสูงสุด งานค้าง ใบสั่งขายที่เลยวันขอส่ง */
export default function SalesDashboardPage() {
  const [params, range, setRange] = useDashboardRange();
  const q = useSalesDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow="Sales Dashboard"
      title="แดชบอร์ดฝ่ายขาย"
      subtitle="ใบเสนอราคา · ยอดขาย · งานค้างส่งมอบ"
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="SALES_DASHBOARD" build={() => (d ? buildSalesReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? "กำลังโหลดข้อมูล…" : "ยังไม่มีข้อมูล"} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label="ยอดขาย (ยืนยันแล้ว)" value={fmtBaht(d.orders.soldAmount)} note={`${fmt(d.orders.count, 0)} ใบสั่งขาย`} />
            <KpiCard label="ส่งมอบแล้ว" value={fmtBaht(d.orders.deliveredAmount)} />
            <KpiCard label="ใบเสนอราคา" value={fmt(d.quotations.count, 0)} note={`มูลค่า ${fmtBaht(d.quotations.amount)}`} />
            <KpiCard label="ออกเป็นใบสั่งขายแล้ว" value={fmtPercent(d.quotations.conversionPercent)} note={`${d.quotations.converted} จาก ${d.quotations.count} ใบ`} />
            <KpiCard label="ใบสั่งขายค้างส่งมอบ" value={fmt(d.pipeline.openOrders, 0)} note={`กำลังจัดส่ง ${d.pipeline.dispatchInProgress} งาน`} />
            <KpiCard label="รอลูกค้ายืนยัน" value={fmt(d.pipeline.awaitingConfirm, 0)} tone={d.pipeline.awaitingConfirm > 0 ? "warn" : "default"} note={`ร่าง ${d.pipeline.draft} ใบ`} />
            <KpiCard label="เลยวันขอส่งแล้ว" value={fmt(d.lateOrderCount, 0)} tone={d.lateOrderCount > 0 ? "bad" : "good"} />
          </KpiGrid>

          <Panel title="ยอดขายรายวัน (฿)">
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmtBaht(Number(v))} />
                  <Bar dataKey="soldAmount" name="ยอดขาย" fill={DASH_COLORS.blue} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title="ลูกค้ายอดขายสูงสุด (5 อันดับ)">
              {d.topCustomers.length === 0 ? (
                <Empty text="ไม่มียอดขายในช่วงนี้" />
              ) : (
                d.topCustomers.map((c) => <ListRow key={c.customer} label={c.customer} value={`${fmtBaht(c.amount)} (${c.orders} ใบ)`} />)
              )}
            </Panel>
            <Panel title="ใบสั่งขายที่เลยวันขอส่ง">
              {d.lateOrders.length === 0 ? (
                <Empty text="ไม่มีใบสั่งขายเลยวันขอส่ง" />
              ) : (
                d.lateOrders.map((o) => (
                  <ListRow
                    key={o.soNo}
                    label={
                      <span>
                        <Tag>{o.status}</Tag>
                        {o.soNo} · {o.customer}
                      </span>
                    }
                    value={`เลย ${o.daysLate} วัน (${formatThaiDate(o.requestedDeliveryDate)})`}
                  />
                ))
              )}
              {d.lateOrderCount > d.lateOrders.length ? <Empty text={`และอีก ${d.lateOrderCount - d.lateOrders.length} ใบ`} /> : null}
            </Panel>
          </Grid2>

          <Grid2>
            <Panel title="สถานะใบสั่งขาย (ช่วงนี้)">
              {d.orders.byStatus.length === 0 ? <Empty text="ไม่มีใบสั่งขายในช่วงนี้" /> : d.orders.byStatus.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
            <Panel title="สถานะใบเสนอราคา (ช่วงนี้)">
              {d.quotations.byStatus.length === 0 ? <Empty text="ไม่มีใบเสนอราคาในช่วงนี้" /> : d.quotations.byStatus.map((s) => <ListRow key={s.key} label={s.label} value={s.count} />)}
            </Panel>
          </Grid2>
        </>
      )}
    </DashboardShell>
  );
}
