"use client";

import { Tag } from "antd";
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import { useSalesDashboardQuery } from "@/hooks/dashboards/useDashboards";
import { useT } from "@/lib/i18n/useT";
import { tSoStatus } from "@/types/sales-orders";
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
  const t = useT();
  const [params, range, setRange] = useDashboardRange();
  const q = useSalesDashboardQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow={t("Sales Dashboard")}
      title={t("แดชบอร์ดฝ่ายขาย")}
      subtitle={t("ใบเสนอราคา · ยอดขาย · งานค้างส่งมอบ")}
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="SALES_DASHBOARD" build={() => (d ? buildSalesReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? t("กำลังโหลดข้อมูล…") : t("ยังไม่มีข้อมูล")} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard label={t("ยอดขาย (ยืนยันแล้ว)")} value={fmtBaht(d.orders.soldAmount)} note={t("{n} ใบสั่งขาย", { n: fmt(d.orders.count, 0) })} />
            <KpiCard label={t("ส่งมอบแล้ว")} value={fmtBaht(d.orders.deliveredAmount)} />
            <KpiCard label={t("ใบเสนอราคา")} value={fmt(d.quotations.count, 0)} note={t("มูลค่า {v}", { v: fmtBaht(d.quotations.amount) })} />
            <KpiCard label={t("ออกเป็นใบสั่งขายแล้ว")} value={fmtPercent(d.quotations.conversionPercent)} note={t("{a} จาก {b} ใบ", { a: d.quotations.converted, b: d.quotations.count })} />
            <KpiCard label={t("ใบสั่งขายค้างส่งมอบ")} value={fmt(d.pipeline.openOrders, 0)} note={t("กำลังจัดส่ง {n} งาน", { n: d.pipeline.dispatchInProgress })} />
            <KpiCard label={t("รอลูกค้ายืนยัน")} value={fmt(d.pipeline.awaitingConfirm, 0)} tone={d.pipeline.awaitingConfirm > 0 ? "warn" : "default"} note={t("ร่าง {n} ใบ", { n: d.pipeline.draft })} />
            <KpiCard label={t("เลยวันขอส่งแล้ว")} value={fmt(d.lateOrderCount, 0)} tone={d.lateOrderCount > 0 ? "bad" : "good"} />
          </KpiGrid>

          <Panel title={t("ยอดขายรายวัน (฿)")}>
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmtBaht(Number(v))} />
                  <Bar dataKey="soldAmount" name={t("ยอดขาย")} fill={DASH_COLORS.blue} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <Grid2>
            <Panel title={t("ลูกค้ายอดขายสูงสุด (5 อันดับ)")}>
              {d.topCustomers.length === 0 ? (
                <Empty text={t("ไม่มียอดขายในช่วงนี้")} />
              ) : (
                d.topCustomers.map((c) => <ListRow key={c.customer} label={c.customer} value={t("{amt} ({n} ใบ)", { amt: fmtBaht(c.amount), n: c.orders })} />)
              )}
            </Panel>
            <Panel title={t("ใบสั่งขายที่เลยวันขอส่ง")}>
              {d.lateOrders.length === 0 ? (
                <Empty text={t("ไม่มีใบสั่งขายเลยวันขอส่ง")} />
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
                    value={t("เลย {n} วัน ({date})", { n: o.daysLate, date: formatThaiDate(o.requestedDeliveryDate) })}
                  />
                ))
              )}
              {d.lateOrderCount > d.lateOrders.length ? <Empty text={t("และอีก {n} ใบ", { n: d.lateOrderCount - d.lateOrders.length })} /> : null}
            </Panel>
          </Grid2>

          <Grid2>
            <Panel title={t("สถานะใบสั่งขาย (ช่วงนี้)")}>
              {d.orders.byStatus.length === 0 ? <Empty text={t("ไม่มีใบสั่งขายในช่วงนี้")} /> : d.orders.byStatus.map((s) => <ListRow key={s.key} label={tSoStatus(s.label)} value={s.count} />)}
            </Panel>
            <Panel title={t("สถานะใบเสนอราคา (ช่วงนี้)")}>
              {d.quotations.byStatus.length === 0 ? <Empty text={t("ไม่มีใบเสนอราคาในช่วงนี้")} /> : d.quotations.byStatus.map((s) => <ListRow key={s.key} label={tSoStatus(s.label)} value={s.count} />)}
            </Panel>
          </Grid2>
        </>
      )}
    </DashboardShell>
  );
}
