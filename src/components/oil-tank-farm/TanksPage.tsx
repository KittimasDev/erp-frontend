"use client";

import { useState } from "react";
import { Button, Progress, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExperimentOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateOilTankMutation, useOilTanksQuery, useUpdateOilTankMutation } from "@/hooks/oil-tank-farm/useOilTankFarm";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { OIL_TANK_STATUS_LABEL, type OilTank } from "@/types/oil-tank-farm";
import styles from "@/components/masters/shared/master-page.module.css";

import TankBalanceReportTab from "./TankBalanceReportTab";
import TankFormModal from "./TankFormModal";
import TankReadingsDrawer from "./TankReadingsDrawer";
import PageHeader from "@/components/common/PageHeader";

const n = (v?: string | number) => Number(v ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 3 });
const STATUS_COLOR: Record<string, string> = { ACTIVE: "green", MAINTENANCE: "orange", INACTIVE: "default" };

/** หน้า /oil-tank-farm/tanks — ถังเก็บน้ำมัน: ความจุ/ยอดคงเหลือ/พร้อมใช้/จอง/รอ QC · วัดระดับจริง · รายงานยอดรายถัง */
export default function TanksPage() {
  const query = useOilTanksQuery();
  const create = useCreateOilTankMutation();
  const update = useUpdateOilTankMutation();
  const { canAdd, canEdit } = getScreenActionPermissions("OIL_TANKS");
  const [editing, setEditing] = useState<OilTank | "new" | null>(null);
  const [readingsOf, setReadingsOf] = useState<OilTank | null>(null);
  const tanks = query.data?.data ?? [];

  const columns: ColumnsType<OilTank> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "ถัง",
      key: "t",
      render: (_v, t) => (
        <div>
          <strong>{t.tankNo}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{t.itemNameTh} · {t.warehouseCode}/{t.locationCode}</div>
        </div>
      ),
    },
    {
      title: "ระดับ",
      key: "lv",
      width: 210,
      render: (_v, t) => {
        const pct = t.fillPercent ?? 0;
        return (
          <div>
            <Progress percent={Math.min(pct, 100)} size="small" status={pct >= 95 ? "exception" : undefined} />
            <div style={{ fontSize: 12 }}>{n(t.currentVolumeLiters)} / {n(t.capacityLiters)} ลิตร</div>
          </div>
        );
      },
    },
    { title: "พร้อมใช้", key: "av", width: 110, align: "right", render: (_v, t) => n(t.availableLiters) },
    { title: "จองไว้", key: "rs", width: 100, align: "right", render: (_v, t) => (Number(t.reservedLiters) ? n(t.reservedLiters) : "—") },
    { title: "รอ QC", key: "hd", width: 100, align: "right", render: (_v, t) => (Number(t.holdLiters) ? <Tag color="gold">{n(t.holdLiters)}</Tag> : "—") },
    {
      title: "วัดล่าสุด",
      key: "lr",
      width: 190,
      render: (_v, t) =>
        t.lastReading ? (
          <div style={{ fontSize: 12 }}>
            {dayjs(t.lastReading.measuredAt).format("DD/MM HH:mm")} · {n(t.lastReading.measuredLiters)}
            {Number(t.lastReading.varianceLiters) !== 0 ? (
              <Tag color={t.lastReading.status === "RECORDED" ? "orange" : "default"} style={{ marginLeft: 4 }}>
                ต่าง {Number(t.lastReading.varianceLiters) > 0 ? "+" : ""}{n(t.lastReading.varianceLiters)}
              </Tag>
            ) : null}
          </div>
        ) : (
          "—"
        ),
    },
    { title: "สถานะ", key: "st", width: 100, render: (_v, t) => <Tag color={STATUS_COLOR[t.status]}>{OIL_TANK_STATUS_LABEL[t.status] ?? t.status}</Tag> },
    {
      title: "",
      key: "act",
      width: 170,
      render: (_v, t) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="small" onClick={() => setReadingsOf(t)}>วัดระดับ</Button>
          {canEdit ? <Button size="small" onClick={() => setEditing(t)}>แก้ไข</Button> : null}
        </div>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="OIL TANK FARM"
          icon={<ExperimentOutlined />}
          title="ถังเก็บน้ำมัน"
          subtitle="ความจุและยอดคงเหลือรายถัง · วัดระดับจริงเทียบกับยอดในระบบ · รายงานยอดรายวัน/รายเดือน"
          actions={
            <>
{canAdd ? (
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setEditing("new")}>เพิ่มถัง</Button>
          ) : <div />}
            </>
          }
        />
        <div className={styles.tableCard}>
          <Tabs
            items={[
              {
                key: "tanks",
                label: "ถัง",
                children: (
                  <Table rowKey="id" className={styles.dataTable} columns={columns} dataSource={tanks} loading={query.isFetching} pagination={false} scroll={{ x: 1100 }} locale={{ emptyText: "ยังไม่มีถัง — กด เพิ่มถัง" }} />
                ),
              },
              { key: "report", label: "รายงานยอดรายถัง", children: <TankBalanceReportTab /> },
            ]}
          />
        </div>
        {editing ? (
          <TankFormModal
            key={editing === "new" ? "new" : editing.id}
            tank={editing === "new" ? null : editing}
            loading={create.isPending || update.isPending}
            onCancel={() => setEditing(null)}
            onCreate={(body) => create.mutate(body, { onSuccess: () => setEditing(null) })}
            onUpdate={(id, body) => update.mutate({ id, body }, { onSuccess: () => setEditing(null) })}
          />
        ) : null}
        <TankReadingsDrawer key={readingsOf?.id ?? "none"} tank={readingsOf} onClose={() => setReadingsOf(null)} />
      </section>
    </MasterPageGate>
  );
}
