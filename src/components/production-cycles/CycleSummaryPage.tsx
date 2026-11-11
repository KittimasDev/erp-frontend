"use client";

import Link from "next/link";
import { Alert, Button, Card, Progress, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, FieldTimeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useT } from "@/lib/i18n/useT";
import { getStoredLanguage } from "@/lib/i18n/language";
import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";
import { useProductionCycleSummaryQuery } from "@/hooks/production-cycles/useProductionCycles";
import {
  CYCLE_PHASE_COLOR,
  cycleNumLocale,
  cyclePhaseLabel,
  type CycleSummaryDaily,
  type CycleSummaryDowntimeBucket,
  type CycleSummaryOrder,
  type CycleSummaryOutput,
  type CycleSummaryShift,
} from "@/types/production-cycle";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

const n = (v?: number, d = 1) => (v === undefined || v === null ? "—" : v.toLocaleString(cycleNumLocale(), { maximumFractionDigits: d }));
const fmtDate = (v: string) => dayjs(v).format("DD/MM/BBBB");
const ORDER_STATUS_LABEL: Record<string, string> = { IN_PROGRESS: "กำลังผลิต", PAUSED: "หยุดชั่วคราว", COMPLETED: standardStatusLabel("COMPLETED"), DRAFT: standardStatusLabel("DRAFT") };
const ORDER_STATUS_LABEL_EN: Record<string, string> = { IN_PROGRESS: "In production", PAUSED: "Paused", COMPLETED: standardStatusLabel("COMPLETED", "en"), DRAFT: standardStatusLabel("DRAFT", "en") };
const ORDER_STATUS_COLOR: Record<string, string> = { IN_PROGRESS: standardStatusColor("IN_PROGRESS"), PAUSED: "orange", COMPLETED: standardStatusColor("COMPLETED"), DRAFT: standardStatusColor("DRAFT") };
const orderStatusLabel = (v: string) =>
  (getStoredLanguage() === "en" ? ORDER_STATUS_LABEL_EN : ORDER_STATUS_LABEL)[v] ?? v;

/** รายงานสรุปผลการผลิตรายรอบ 45+3 วัน (M5.9) — Yield / Mass Balance / Process Loss / Downtime / Efficiency รายวันและรายรอบ */
export default function CycleSummaryPage({ id }: { id: string }) {
  const t = useT();
  const query = useProductionCycleSummaryQuery(id);
  const s = query.data?.data;

  const orderColumns: ColumnsType<CycleSummaryOrder> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("ใบสั่งผลิต"), key: "no", render: (_v, o) => <Link href={`/production/production-orders/${o.id}`}>{o.orderNo}</Link> },
    { title: "Batch", dataIndex: "batchNo", render: (v?: string) => v ?? "—" },
    { title: t("สถานะ"), dataIndex: "status", render: (v: string) => <Tag color={ORDER_STATUS_COLOR[v] ?? "default"}>{orderStatusLabel(v)}</Tag> },
    { title: t("ยางเข้า"), dataIndex: "inputQty", align: "right", render: (v: number) => n(v) },
    { title: t("ผลผลิต"), dataIndex: "outputQty", align: "right", render: (v: number) => n(v) },
    {
      title: "Yield",
      key: "y",
      align: "right",
      render: (_v, o) => (o.comparable ? `${n(o.yieldPercent)}%` : <Tag>{t("เทียบหน่วยไม่ได้")}</Tag>),
    },
  ];
  const outputColumns: ColumnsType<CycleSummaryOutput> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("ผลผลิต"), key: "i", render: (_v, o) => `${o.itemCode ?? ""} ${o.itemNameTh ?? ""}` },
    { title: t("ปริมาณ"), dataIndex: "quantity", align: "right", render: (v: number) => n(v, 3) },
    { title: "Yield %", dataIndex: "yieldPercent", align: "right", render: (v?: number) => (v === undefined ? "—" : `${n(v)}%`) },
  ];
  const dtColumns: ColumnsType<CycleSummaryDowntimeBucket> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("หมวดสาเหตุ"), dataIndex: "label" },
    { title: t("ครั้ง"), dataIndex: "count", width: 70, align: "right" },
    { title: t("ชั่วโมง"), dataIndex: "hours", width: 100, align: "right", render: (v: number) => n(v, 2) },
  ];
  const dailyColumns: ColumnsType<CycleSummaryDaily> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("วันที่"), dataIndex: "date", width: 110, render: fmtDate },
    { title: t("ยางป้อน (กก.)"), dataIndex: "inputKg", align: "right", render: (v: number) => n(v) },
    { title: t("ผลผลิต กก. (อนุมัติรับเข้า)"), dataIndex: "outputKg", align: "right", render: (v: number) => n(v) },
    { title: t("Loss (ชี้นำ)"), dataIndex: "lossKg", align: "right", render: (v: number) => n(v) },
    { title: t("ชม.เดินเครื่อง"), dataIndex: "operatingHours", align: "right", render: (v: number) => n(v, 2) },
    { title: t("Feed Rate (กก./ชม.)"), dataIndex: "feedRateKgH", align: "right", render: (v?: number) => n(v) },
  ];
  const shiftColumns: ColumnsType<CycleSummaryShift> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("กะ"), dataIndex: "shiftName" },
    { title: t("จำนวนบันทึก"), dataIndex: "recordCount", align: "right" },
    { title: t("ยางป้อน (กก.)"), dataIndex: "inputKg", align: "right", render: (v: number) => n(v) },
    { title: t("ชม.เดินเครื่อง"), dataIndex: "operatingHours", align: "right", render: (v: number) => n(v, 2) },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="PRODUCTION · CYCLE SUMMARY"
          icon={<FieldTimeOutlined />}
          title={<>{t("สรุปรอบ")} {s?.cycle.cycleNo ?? ""}{" "}
              {s ? <Tag color={CYCLE_PHASE_COLOR[s.cycle.phase]}>{cyclePhaseLabel(s.cycle.phase)}</Tag> : null}</>}
          actions={
            <>
<Link href="/production/cycles"><Button icon={<ArrowLeftOutlined />}>{t("กลับ")}</Button></Link>
            </>
          }
        >
{s ? (
              <Typography.Text className={styles.pageSubtitle}>
                {t("ผลิต")} {fmtDate(s.cycle.startDate)} – {fmtDate(s.cycle.endDate)} ({t("{n} วัน", { n: s.cycle.runDays })})
                {s.cycle.shutdownDays > 0 ? ` · Shutdown ${fmtDate(s.cycle.shutdownStartDate)} – ${fmtDate(s.cycle.shutdownEndDate)} (${t("{n} วัน", { n: s.cycle.shutdownDays })})` : ""}
              </Typography.Text>
            ) : null}
        </PageHeader>

        {!s ? (
          <div className={styles.tableCard}><p>{t("ไม่พบรอบผลิต")}</p></div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {s.cycle.status === "OPEN" ? (
              <Card size="small">
                <Progress percent={s.cycle.runProgressPercent} format={() => t("วันที่ {day}/{total}", { day: s.cycle.runDayNumber, total: s.cycle.runDays })} />
              </Card>
            ) : null}

            {s.massBalanceWarning ? <Alert type={s.massBalanceStatus === "EXCEEDS_INPUT" ? "error" : "warning"} showIcon title={s.massBalanceWarning} /> : null}
            {s.excludedOrderCount > 0 ? (
              <Alert type="info" showIcon title={t("มี {n} ใบที่เทียบหน่วยเข้า-ออกไม่ได้ — ไม่ถูกรวมในยอด Yield/Mass Balance ของรอบ", { n: s.excludedOrderCount })} />
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <Card size="small"><Statistic title={t("ยางเข้า ({unit})", { unit: s.unitCode ?? t("หน่วยของใบ") })} value={n(s.totalInputQty, 0)} /></Card>
              <Card size="small"><Statistic title={t("ผลผลิตรวม")} value={n(s.totalOutputQty, 0)} /></Card>
              <Card size="small"><Statistic title="Yield" value={s.yieldPercent === undefined ? "—" : `${n(s.yieldPercent)}%`} /></Card>
              <Card size="small"><Statistic title="Process Loss" value={s.processLossPercent === undefined ? "—" : `${n(s.processLossQty, 0)} (${n(s.processLossPercent)}%)`} /></Card>
              <Card size="small"><Statistic title="Production Efficiency" value={s.efficiencyPercent === undefined ? "—" : `${n(s.efficiencyPercent)}%`} /></Card>
              <Card size="small"><Statistic title={t("Feed Rate เฉลี่ย (กก./ชม.)")} value={n(s.avgFeedRateKgH)} /></Card>
              <Card size="small"><Statistic title={t("ยางป้อนสะสม (รายกะ, กก.)")} value={n(s.recordedInputKg, 0)} /></Card>
              <Card size="small"><Statistic title={t("ชม.เดินเครื่องสะสม")} value={n(s.operatingHours, 1)} /></Card>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("Production Efficiency = ชั่วโมงเดินเครื่อง ÷ (วันที่ผ่านไปของช่วงผลิต × 24 − ชั่วโมงหยุดตามแผน) · มีเฉพาะเมื่อมีบันทึกการผลิตรายกะ · Yield/Loss รวมเฉพาะใบที่เทียบหน่วยได้")}
            </Typography.Text>

            <Card size="small" title={t("ใบสั่งผลิตในรอบ")}>
              <Table rowKey="id" size="small" columns={orderColumns} dataSource={s.orders} pagination={false} locale={{ emptyText: t("ยังไม่มีใบสั่งผลิตสังกัดรอบนี้") }} />
            </Card>

            <Card size="small" title={t("ผลผลิตรวมทั้งรอบ")}>
              <Table rowKey="itemId" size="small" columns={outputColumns} dataSource={s.outputs} pagination={false} locale={{ emptyText: t("ยังไม่มีผลผลิตที่อนุมัติรับเข้า") }} />
            </Card>

            <Card
              size="small"
              title={t("Downtime รวม {h} ชม.", { h: n(s.totalDowntimeHours, 1) })}
              extra={
                <span style={{ fontSize: 12 }}>
                  {t("ตามแผน")} {n(s.plannedDowntimeHours, 1)} · {t("ไม่ตามแผน")} {n(s.unplannedDowntimeHours, 1)} · Breakdown {n(s.breakdownHours, 1)} · {t("Shutdown ตามแผนของรอบ")} {s.plannedShutdownHours} {t("ชม.")}
                </span>
              }
            >
              <Table rowKey="key" size="small" columns={dtColumns} dataSource={s.downtimeByCategory} pagination={false} locale={{ emptyText: t("ไม่มี Downtime") }} />
            </Card>

            <Card size="small" title={t("รายวัน (จากบันทึกการผลิตรายกะ)")}>
              <Table rowKey="date" size="small" columns={dailyColumns} dataSource={s.daily} pagination={{ pageSize: 50, hideOnSinglePage: true }} locale={{ emptyText: t("ยังไม่มีบันทึกรายกะ") }} scroll={{ x: 700 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("Loss รายวันเป็นค่าชี้นำ — ผลผลิตนับตามวันที่อนุมัติรับเข้าคลัง ไม่ใช่วันที่ผลิตจริง และนับเฉพาะผลผลิตหน่วย กก.")}
              </Typography.Text>
            </Card>

            <Card size="small" title={t("รายกะ")}>
              <Table rowKey="shiftName" size="small" columns={shiftColumns} dataSource={s.byShift} pagination={false} locale={{ emptyText: t("ยังไม่มีบันทึกรายกะ") }} />
            </Card>
          </div>
        )}
      </section>
    </MasterPageGate>
  );
}
