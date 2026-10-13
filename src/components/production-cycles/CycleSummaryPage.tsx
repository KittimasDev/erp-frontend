"use client";

import Link from "next/link";
import { Alert, Button, Card, Progress, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, FieldTimeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useProductionCycleSummaryQuery } from "@/hooks/production-cycles/useProductionCycles";
import {
  CYCLE_PHASE_COLOR,
  CYCLE_PHASE_LABEL,
  type CycleSummaryDaily,
  type CycleSummaryDowntimeBucket,
  type CycleSummaryOrder,
  type CycleSummaryOutput,
  type CycleSummaryShift,
} from "@/types/production-cycle";
import styles from "@/components/masters/shared/master-page.module.css";

const n = (v?: number, d = 1) => (v === undefined || v === null ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: d }));
const fmtDate = (v: string) => dayjs(v).format("DD/MM/YYYY");
const ORDER_STATUS_LABEL: Record<string, string> = { IN_PROGRESS: "กำลังผลิต", PAUSED: "หยุดชั่วคราว", COMPLETED: "เสร็จสิ้น", DRAFT: "ร่าง" };

/** รายงานสรุปผลการผลิตรายรอบ 45+3 วัน (M5.9) — Yield / Mass Balance / Process Loss / Downtime / Efficiency รายวันและรายรอบ */
export default function CycleSummaryPage({ id }: { id: string }) {
  const query = useProductionCycleSummaryQuery(id);
  const s = query.data?.data;

  const orderColumns: ColumnsType<CycleSummaryOrder> = [
    { title: "ใบสั่งผลิต", key: "no", render: (_v, o) => <Link href={`/production/production-orders/${o.id}`}>{o.orderNo}</Link> },
    { title: "Batch", dataIndex: "batchNo", render: (v?: string) => v ?? "—" },
    { title: "สถานะ", dataIndex: "status", render: (v: string) => ORDER_STATUS_LABEL[v] ?? v },
    { title: "ยางเข้า", dataIndex: "inputQty", align: "right", render: (v: number) => n(v) },
    { title: "ผลผลิต", dataIndex: "outputQty", align: "right", render: (v: number) => n(v) },
    {
      title: "Yield",
      key: "y",
      align: "right",
      render: (_v, o) => (o.comparable ? `${n(o.yieldPercent)}%` : <Tag>เทียบหน่วยไม่ได้</Tag>),
    },
  ];
  const outputColumns: ColumnsType<CycleSummaryOutput> = [
    { title: "ผลผลิต", key: "i", render: (_v, o) => `${o.itemCode ?? ""} ${o.itemNameTh ?? ""}` },
    { title: "ปริมาณ", dataIndex: "quantity", align: "right", render: (v: number) => n(v, 3) },
    { title: "Yield %", dataIndex: "yieldPercent", align: "right", render: (v?: number) => (v === undefined ? "—" : `${n(v)}%`) },
  ];
  const dtColumns: ColumnsType<CycleSummaryDowntimeBucket> = [
    { title: "หมวดสาเหตุ", dataIndex: "label" },
    { title: "ครั้ง", dataIndex: "count", width: 70, align: "right" },
    { title: "ชั่วโมง", dataIndex: "hours", width: 100, align: "right", render: (v: number) => n(v, 2) },
  ];
  const dailyColumns: ColumnsType<CycleSummaryDaily> = [
    { title: "วันที่", dataIndex: "date", width: 110, render: fmtDate },
    { title: "ยางป้อน (กก.)", dataIndex: "inputKg", align: "right", render: (v: number) => n(v) },
    { title: "ผลผลิต กก. (อนุมัติรับเข้า)", dataIndex: "outputKg", align: "right", render: (v: number) => n(v) },
    { title: "Loss (ชี้นำ)", dataIndex: "lossKg", align: "right", render: (v: number) => n(v) },
    { title: "ชม.เดินเครื่อง", dataIndex: "operatingHours", align: "right", render: (v: number) => n(v, 2) },
    { title: "Feed Rate (กก./ชม.)", dataIndex: "feedRateKgH", align: "right", render: (v?: number) => n(v) },
  ];
  const shiftColumns: ColumnsType<CycleSummaryShift> = [
    { title: "กะ", dataIndex: "shiftName" },
    { title: "จำนวนบันทึก", dataIndex: "recordCount", align: "right" },
    { title: "ยางป้อน (กก.)", dataIndex: "inputKg", align: "right", render: (v: number) => n(v) },
    { title: "ชม.เดินเครื่อง", dataIndex: "operatingHours", align: "right", render: (v: number) => n(v, 2) },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}><FieldTimeOutlined /></div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>PRODUCTION · CYCLE SUMMARY</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              สรุปรอบ {s?.cycle.cycleNo ?? ""}{" "}
              {s ? <Tag color={CYCLE_PHASE_COLOR[s.cycle.phase]}>{CYCLE_PHASE_LABEL[s.cycle.phase] ?? s.cycle.phase}</Tag> : null}
            </Typography.Title>
            {s ? (
              <Typography.Text className={styles.pageSubtitle}>
                ผลิต {fmtDate(s.cycle.startDate)} – {fmtDate(s.cycle.endDate)} ({s.cycle.runDays} วัน)
                {s.cycle.shutdownDays > 0 ? ` · Shutdown ${fmtDate(s.cycle.shutdownStartDate)} – ${fmtDate(s.cycle.shutdownEndDate)} (${s.cycle.shutdownDays} วัน)` : ""}
              </Typography.Text>
            ) : null}
          </div>
          <Link href="/production/cycles"><Button icon={<ArrowLeftOutlined />}>กลับ</Button></Link>
        </div>

        {!s ? (
          <div className={styles.tableCard}><p>ไม่พบรอบผลิต</p></div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {s.cycle.status === "OPEN" ? (
              <Card size="small">
                <Progress percent={s.cycle.runProgressPercent} format={() => `วันที่ ${s.cycle.runDayNumber}/${s.cycle.runDays}`} />
              </Card>
            ) : null}

            {s.massBalanceWarning ? <Alert type={s.massBalanceStatus === "EXCEEDS_INPUT" ? "error" : "warning"} showIcon title={s.massBalanceWarning} /> : null}
            {s.excludedOrderCount > 0 ? (
              <Alert type="info" showIcon title={`มี ${s.excludedOrderCount} ใบที่เทียบหน่วยเข้า-ออกไม่ได้ — ไม่ถูกรวมในยอด Yield/Mass Balance ของรอบ`} />
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <Card size="small"><Statistic title={`ยางเข้า (${s.unitCode ?? "หน่วยของใบ"})`} value={n(s.totalInputQty, 0)} /></Card>
              <Card size="small"><Statistic title="ผลผลิตรวม" value={n(s.totalOutputQty, 0)} /></Card>
              <Card size="small"><Statistic title="Yield" value={s.yieldPercent === undefined ? "—" : `${n(s.yieldPercent)}%`} /></Card>
              <Card size="small"><Statistic title="Process Loss" value={s.processLossPercent === undefined ? "—" : `${n(s.processLossQty, 0)} (${n(s.processLossPercent)}%)`} /></Card>
              <Card size="small"><Statistic title="Production Efficiency" value={s.efficiencyPercent === undefined ? "—" : `${n(s.efficiencyPercent)}%`} /></Card>
              <Card size="small"><Statistic title="Feed Rate เฉลี่ย (กก./ชม.)" value={n(s.avgFeedRateKgH)} /></Card>
              <Card size="small"><Statistic title="ยางป้อนสะสม (รายกะ, กก.)" value={n(s.recordedInputKg, 0)} /></Card>
              <Card size="small"><Statistic title="ชม.เดินเครื่องสะสม" value={n(s.operatingHours, 1)} /></Card>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Production Efficiency = ชั่วโมงเดินเครื่อง ÷ (วันที่ผ่านไปของช่วงผลิต × 24 − ชั่วโมงหยุดตามแผน) · มีเฉพาะเมื่อมีบันทึกการผลิตรายกะ · Yield/Loss รวมเฉพาะใบที่เทียบหน่วยได้
            </Typography.Text>

            <Card size="small" title="ใบสั่งผลิตในรอบ">
              <Table rowKey="id" size="small" columns={orderColumns} dataSource={s.orders} pagination={false} locale={{ emptyText: "ยังไม่มีใบสั่งผลิตสังกัดรอบนี้" }} />
            </Card>

            <Card size="small" title="ผลผลิตรวมทั้งรอบ">
              <Table rowKey="itemId" size="small" columns={outputColumns} dataSource={s.outputs} pagination={false} locale={{ emptyText: "ยังไม่มีผลผลิตที่อนุมัติรับเข้า" }} />
            </Card>

            <Card
              size="small"
              title={`Downtime รวม ${n(s.totalDowntimeHours, 1)} ชม.`}
              extra={
                <span style={{ fontSize: 12 }}>
                  ตามแผน {n(s.plannedDowntimeHours, 1)} · ไม่ตามแผน {n(s.unplannedDowntimeHours, 1)} · Breakdown {n(s.breakdownHours, 1)} · Shutdown ตามแผนของรอบ {s.plannedShutdownHours} ชม.
                </span>
              }
            >
              <Table rowKey="key" size="small" columns={dtColumns} dataSource={s.downtimeByCategory} pagination={false} locale={{ emptyText: "ไม่มี Downtime" }} />
            </Card>

            <Card size="small" title="รายวัน (จากบันทึกการผลิตรายกะ)">
              <Table rowKey="date" size="small" columns={dailyColumns} dataSource={s.daily} pagination={{ pageSize: 50, hideOnSinglePage: true }} locale={{ emptyText: "ยังไม่มีบันทึกรายกะ" }} scroll={{ x: 700 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Loss รายวันเป็นค่าชี้นำ — ผลผลิตนับตามวันที่อนุมัติรับเข้าคลัง ไม่ใช่วันที่ผลิตจริง และนับเฉพาะผลผลิตหน่วย กก.
              </Typography.Text>
            </Card>

            <Card size="small" title="รายกะ">
              <Table rowKey="shiftName" size="small" columns={shiftColumns} dataSource={s.byShift} pagination={false} locale={{ emptyText: "ยังไม่มีบันทึกรายกะ" }} />
            </Card>
          </div>
        )}
      </section>
    </MasterPageGate>
  );
}
