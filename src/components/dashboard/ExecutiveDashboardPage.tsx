"use client";

import { Alert, Tag } from "antd";
import {
  AuditOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  PercentageOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  TruckOutlined,
} from "@ant-design/icons";
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

import StatusLight from "@/components/common/StatusLight";
import { useExecutiveOverviewQuery } from "@/hooks/dashboards/useDashboards";
import { useT } from "@/lib/i18n/useT";
import { buildExecutiveReport } from "@/utils/dashboardExport";

import {
  ChartBox,
  DASH_COLORS,
  DashboardExportButtons,
  DashboardShell,
  Empty,
  fmt,
  fmtBaht,
  fmtKg,
  fmtPercent,
  Grid2,
  KpiCard,
  KpiGrid,
  ListRow,
  Panel,
  SectionTitle,
  shortDate,
  useDashboardRange,
} from "./DashboardKit";
import { CycleSummary, MassBalanceNote } from "./ProductionDailySection";

const axis = { fontSize: 11, fill: "#8a9199" };
const grid = { strokeDasharray: "3 3", vertical: false, stroke: "#eceee6" } as const;
const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #e8eaed", boxShadow: "0 10px 24px rgba(47,52,58,0.12)" },
  cursor: { fill: "rgba(115,152,22,0.06)" },
};
const bar: [number, number, number, number] = [6, 6, 0, 0];

/**
 * ภาพรวมผู้บริหาร (M15.1): การผลิตรายวัน ผลผลิตสะสม ปริมาณรับซื้อยาง สินค้าคงเหลือ ยอดจำหน่าย
 * สถานะเครื่องจักร Downtime KPI และ Cycle Progress วันที่ N จาก 45
 */
export default function ExecutiveDashboardPage() {
  const t = useT();
  const [params, range, setRange] = useDashboardRange();
  const q = useExecutiveOverviewQuery(params);
  const d = q.data;

  return (
    <DashboardShell
      eyebrow={t("Executive Dashboard")}
      title={t("ภาพรวมผู้บริหาร")}
      subtitle={t("การผลิต · การรับซื้อยาง · สต๊อก · ยอดขาย · เครื่องจักร · Downtime")}
      range={range}
      onRangeChange={setRange}
      loading={q.isFetching}
      error={q.error}
      extra={<DashboardExportButtons screenCode="EXECUTIVE_DASHBOARD" build={() => (d ? buildExecutiveReport(d) : null)} />}
    >
      {!d ? (
        <Empty text={q.isLoading ? t("กำลังโหลดข้อมูล…") : t("ยังไม่มีข้อมูล")} />
      ) : (
        <>
          <SectionTitle hint={t("ช่วงวันที่ที่เลือก")}>{t("ตัวเลขหลัก")}</SectionTitle>
          <KpiGrid hero>
            <KpiCard hero icon={<ThunderboltOutlined />} label={t("ผลผลิตรับเข้าคลัง (ช่วงนี้)")} value={fmtKg(d.production.outputKg)} note={t("ยางป้อน {v}", { v: fmtKg(d.production.inputKg) })} />
            <KpiCard hero icon={<PercentageOutlined />} label={t("Yield เฉลี่ย")} value={fmtPercent(d.kpi.averageYieldPercent)} note={t("ปิดงาน {done} ใบ · กำลังเดิน {running} ใบ", { done: d.kpi.completedOrders, running: d.kpi.inProgressOrders })} />
            <KpiCard hero icon={<TruckOutlined />} label={t("รับซื้อยาง (น้ำหนักจ่ายเงิน)")} value={fmtKg(d.rawTire.payableKg)} note={t("{n} ใบรับ · {amt}", { n: fmt(d.rawTire.receipts, 0), amt: fmtBaht(d.rawTire.amount) })} />
            <KpiCard hero icon={<ShoppingCartOutlined />} label={t("ยอดขาย (ยืนยันแล้ว)")} value={fmtBaht(d.sales.soldAmount)} note={t("ส่งมอบแล้ว {amt} · ค้างส่ง {n} ใบ", { amt: fmtBaht(d.sales.deliveredAmount), n: d.sales.openOrders })} />
          </KpiGrid>

          <SectionTitle hint={t("สิ่งที่ควรจับตา")}>{t("สถานะและความเสี่ยง")}</SectionTitle>
          <KpiGrid>
            <KpiCard icon={<InboxOutlined />} label={t("มูลค่าสต๊อก")} value={fmtBaht(d.inventory.totalValue)} tone={d.inventory.lowCount > 0 ? "warn" : "default"} note={d.inventory.lowCount > 0 ? t("ต่ำกว่าขั้นต่ำ {n} รายการ (หมด {out})", { n: d.inventory.lowCount, out: d.inventory.outCount }) : t("ไม่มีสินค้าต่ำกว่าขั้นต่ำ")} />
            <KpiCard icon={<ClockCircleOutlined />} label={t("Downtime")} value={t("{v} ชม.", { v: fmt(d.downtime.totalHours, 1) })} tone={d.kpi.openDowntimeCount > 0 ? "bad" : "default"} note={d.kpi.openDowntimeCount > 0 ? t("ยังไม่ปิด {n} รายการ", { n: d.kpi.openDowntimeCount }) : t("ไม่มีค้าง")} />
            <KpiCard icon={<AuditOutlined />} label={t("ใบรออนุมัติ (ทุกโมดูล)")} value={fmt(d.kpi.pendingApprovalsCount, 0)} tone={d.kpi.pendingApprovalsCount > 0 ? "warn" : "good"} note={d.kpi.pendingApprovalsCount > 0 ? t("รอดำเนินการ") : t("ไม่มีค้างอนุมัติ")} />
          </KpiGrid>

          <SectionTitle>{t("การผลิตและเครื่องจักร")}</SectionTitle>
          <Grid2>
            <Panel title={t("Cycle Progress")}>
              {d.cycle ? <CycleSummary cycle={d.cycle} /> : <Empty text={t("ไม่มีรอบผลิตที่เปิดอยู่")} />}
            </Panel>
            <Panel
              title={t("สถานะเครื่องจักร")}
              extra={<StatusLight light={d.machines.overallLight} />}
            >
              <div style={{ marginBottom: 8 }}>
                <Tag color="red">{t("หยุด/เสีย")} {d.machines.counts.red}</Tag>
                <Tag color="gold">{t("เฝ้าระวัง")} {d.machines.counts.yellow}</Tag>
                <Tag color="green">{t("ปกติ")} {d.machines.counts.green}</Tag>
              </div>
              {d.machines.issues.length === 0 ? (
                <Empty text={t("ไม่มีเครื่องที่ผิดปกติ")} />
              ) : (
                d.machines.issues.map((m) => (
                  <ListRow
                    key={m.code}
                    label={
                      <span>
                        <StatusLight light={m.light} showText={false} /> {m.code} {m.name}
                      </span>
                    }
                    value={<span style={{ fontWeight: 400 }}>{m.reasons.join(" · ")}</span>}
                  />
                ))
              )}
            </Panel>
          </Grid2>

          <Panel title={t("การผลิตรายวัน (ยางป้อน เทียบผลผลิตรับเข้าคลัง)")}>
            <MassBalanceNote status={d.production.massBalanceStatus} />
            <ChartBox>
              <ResponsiveContainer>
                <ComposedChart data={d.production.days}>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={axis} />
                  <YAxis tick={axis} />
                  <Tooltip {...tooltipStyle} labelFormatter={(v) => String(v)} formatter={(v) => fmtKg(Number(v))} />
                  <Legend />
                  <Bar dataKey="inputKg" name={t("ยางป้อน (kg)")} fill="#c9ccd1" radius={bar} />
                  <Bar dataKey="outputKg" name={t("ผลผลิต (kg)")} fill={DASH_COLORS.green} radius={bar} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>

          <SectionTitle>{t("ผลผลิตและสต๊อก")}</SectionTitle>
          <Grid2>
            <Panel title={t("ผลผลิตสะสมของช่วงนี้ แยกชนิด")}>
              {d.production.outputKinds.map((k) => (
                <ListRow
                  key={k.kind}
                  label={k.label}
                  value={`${k.quantities?.length ? k.quantities.map((q) => `${fmt(q.quantity, 2)} ${q.unit}`).join(" · ") : fmtKg(k.quantityKg)}${k.yieldPercentOfInput != null ? t(" ({v} ของยางป้อน)", { v: fmtPercent(k.yieldPercentOfInput) }) : ""}`}
                />
              ))}
            </Panel>
            <Panel title={t("สินค้าสำเร็จรูปคงเหลือ")}>
              {d.inventory.finishedGoods.length === 0 ? (
                <Empty text={t("ไม่มีสินค้าสำเร็จรูปคงเหลือ")} />
              ) : (
                d.inventory.finishedGoods.map((g) => (
                  <ListRow key={g.itemCode} label={`${g.itemCode} · ${g.itemName}`} value={`${fmt(g.quantity, 0)} ${g.unit ?? ""}`} />
                ))
              )}
            </Panel>
          </Grid2>

          <SectionTitle>{t("รับซื้อยางและยอดขาย")}</SectionTitle>
          <Grid2>
            <Panel title={t("ปริมาณรับซื้อยางรายวัน (kg น้ำหนักจ่ายเงิน)")}>
              <ChartBox>
                <ResponsiveContainer>
                  <ComposedChart data={d.rawTire.days}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={axis} />
                    <YAxis tick={axis} />
                    <Tooltip {...tooltipStyle} formatter={(v) => fmtKg(Number(v))} />
                    <Bar dataKey="payableKg" name={t("จ่ายเงิน (kg)")} fill={DASH_COLORS.greenDark} radius={bar} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartBox>
            </Panel>
            <Panel title={t("ยอดขายรายวัน (฿)")}>
              <ChartBox>
                <ResponsiveContainer>
                  <ComposedChart data={d.sales.days}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={axis} />
                    <YAxis tick={axis} />
                    <Tooltip {...tooltipStyle} formatter={(v) => fmtBaht(Number(v))} />
                    <Legend />
                    <Bar dataKey="soldAmount" name={t("ยอดขาย")} fill={DASH_COLORS.blue} radius={bar} />
                    <Bar dataKey="deliveredAmount" name={t("ส่งมอบแล้ว")} fill={DASH_COLORS.green} radius={bar} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartBox>
            </Panel>
          </Grid2>

          <Panel title={t("Downtime ตามหมวด (Pareto)")}>
            {d.downtime.byCategory.length === 0 ? (
              <Empty text={t("ไม่มี Downtime ในช่วงนี้")} />
            ) : (
              <ChartBox>
                <ResponsiveContainer>
                  <ComposedChart data={d.downtime.byCategory}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="label" tick={axis} />
                    <YAxis yAxisId="h" tick={axis} />
                    <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tick={axis} />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Bar yAxisId="h" dataKey="hours" name={t("ชั่วโมง")} fill={DASH_COLORS.red} radius={bar} />
                    <Line yAxisId="p" dataKey="cumulativePercent" name={t("สะสม %")} stroke={DASH_COLORS.amber} strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </Panel>

          {d.inventory.lowCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={t("มีสินค้า {n} รายการต่ำกว่าสต๊อกขั้นต่ำ (หมดสต๊อก {out})", { n: d.inventory.lowCount, out: d.inventory.outCount })}
              description={t("ดูรายละเอียดที่หน้าสินค้า ตัวกรอง “สถานะสต๊อก = ต่ำกว่าขั้นต่ำ”")}
            />
          ) : null}
        </>
      )}
    </DashboardShell>
  );
}
