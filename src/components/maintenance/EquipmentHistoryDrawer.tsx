"use client";

import { useState } from "react";
import { Button, Descriptions, Drawer, Table, Tabs, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useEquipmentHistoryQuery } from "@/hooks/maintenance/useMaintenance";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  ROOT_CAUSE_OPTIONS,
  type Equipment,
  type EquipmentDowntime,
  type WorkOrder,
} from "@/types/maintenance";

import { EndDowntimeModal, RecordDowntimeModal } from "./DowntimeModals";
import { fmtDate, fmtDateTime, fmtMinutes, equipmentStatusLabel, fmtMoney, woStatusLabel } from "./maintenance-format";

const rootCauseThai = (v?: string) => ROOT_CAUSE_OPTIONS.find((o) => o.value === v)?.label ?? "—";

type Props = { equipment: Equipment | null; onClose: () => void };

/** ประวัติซ่อมบำรุงของเครื่อง: ใบสั่งงาน · Downtime (เปิด/ปิดได้) · PM รายรอบ · ต้นทุนอะไหล่ */
export default function EquipmentHistoryDrawer({ equipment, onClose }: Props) {
  const t = useT();
  const lang = useLanguage();
  const rootCauseLabel = (v?: string) => t(rootCauseThai(v));
  const query = useEquipmentHistoryQuery(equipment?.id);
  const history = query.data?.data;
  const [recording, setRecording] = useState(false);
  const [ending, setEnding] = useState<EquipmentDowntime | null>(null);

  const woColumns: ColumnsType<WorkOrder> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("เลขที่"), dataIndex: "workOrderNo", width: 150 },
    { title: t("ประเภท"), dataIndex: "type", width: 70, render: (ty: string) => <Tag color={ty === "PM" ? "blue" : "volcano"}>{ty}</Tag> },
    { title: t("รายละเอียด"), dataIndex: "description", ellipsis: true },
    { title: t("สถานะ"), dataIndex: "status", width: 100, render: (s: string) => woStatusLabel(s, lang) },
    { title: t("เสร็จเมื่อ"), key: "done", width: 140, render: (_v, w) => fmtDateTime(w.completedAt) },
    { title: t("ต้นทุนอะไหล่"), key: "cost", width: 120, align: "right", render: (_v, w) => fmtMoney(w.partsCost) },
  ];

  const dtColumns: ColumnsType<EquipmentDowntime> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ประเภท"),
      dataIndex: "category",
      width: 110,
      render: (c: string) => (c === "PLANNED" ? <Tag color="blue">{t("ตามแผน")}</Tag> : <Tag color="red">{t("Breakdown")}</Tag>),
    },
    { title: t("เริ่มหยุด"), key: "start", width: 140, render: (_v, d) => fmtDateTime(d.startAt) },
    { title: t("รอซ่อม"), key: "wait", width: 110, render: (_v, d) => fmtMinutes(d.waitingMinutes) },
    { title: t("เวลาซ่อม"), key: "repair", width: 110, render: (_v, d) => fmtMinutes(d.repairMinutes) },
    { title: t("รวม"), key: "total", width: 110, render: (_v, d) => (d.isOpen ? <Tag color="red">{t("ยังหยุดอยู่")} · {fmtMinutes(d.durationMinutes)}</Tag> : fmtMinutes(d.durationMinutes)) },
    { title: t("สาเหตุ"), key: "cause", render: (_v, d) => `${rootCauseLabel(d.rootCauseCategory)}${d.rootCause ? ` — ${d.rootCause}` : ""}` },
    {
      title: "",
      key: "act",
      width: 90,
      render: (_v, d) => (d.isOpen ? <Button size="small" onClick={() => setEnding(d)}>{t("ปิด")}</Button> : null),
    },
  ];

  return (
    <Drawer
      open={Boolean(equipment)}
      onClose={onClose}
      size="large"
      styles={{ wrapper: { width: "min(1000px, 96vw)" } }}
      title={equipment ? t("ประวัติซ่อมบำรุง — {code} {name}", { code: equipment.equipmentCode, name: equipment.name }) : ""}
      loading={query.isLoading}
    >
      {equipment && history ? (
        <>
          <Descriptions size="small" column={{ xs: 1, md: 3 }} style={{ marginBottom: 12 }}>
            <Descriptions.Item label={t("สถานะ")}>{equipmentStatusLabel(equipment.status, lang)}</Descriptions.Item>
            <Descriptions.Item label={t("Downtime รวม")}>{history.totalDowntimeHours} {t("ชม.")}</Descriptions.Item>
            <Descriptions.Item label={t("ต้นทุนอะไหล่สุทธิ")}>{fmtMoney(history.totalPartsCost)} {t("บาท")}</Descriptions.Item>
            <Descriptions.Item label="Serial">{equipment.serialNumber ?? "—"}</Descriptions.Item>
            <Descriptions.Item label={t("ประกันหมดอายุ")}>
              {fmtDate(equipment.warrantyExpiryDate)}
              {equipment.underWarranty ? <Tag color="green" style={{ marginLeft: 6 }}>{t("ยังอยู่ในประกัน")}</Tag> : null}
            </Descriptions.Item>
            <Descriptions.Item label={t("ชั่วโมงเดินเครื่อง")}>{equipment.runningHours ?? "—"}</Descriptions.Item>
          </Descriptions>
          <Tabs
            items={[
              {
                key: "wo",
                label: t("ใบสั่งงาน ({n})", { n: history.workOrders.length }),
                children: (
                  <Table rowKey="id" size="small" columns={woColumns} dataSource={history.workOrders} pagination={{ pageSize: 10 }} scroll={{ x: 800 }}
                    expandable={{
                      expandedRowRender: (w) => (
                        <div style={{ fontSize: 13 }}>
                          {w.rootCause ? <p style={{ margin: 0 }}>{t("สาเหตุ")}: {rootCauseLabel(w.rootCauseCategory)} — {w.rootCause}</p> : null}
                          {w.correctiveAction ? <p style={{ margin: 0 }}>{t("วิธีแก้")}: {w.correctiveAction}</p> : null}
                          {w.partUsages.length > 0 ? (
                            <p style={{ margin: 0 }}>{t("อะไหล่")}: {w.partUsages.map((u) => `${u.partName} ×${u.quantity}${u.returnedQuantity ? ` (${t("คืน")} ${u.returnedQuantity})` : ""}`).join(", ")}</p>
                          ) : null}
                        </div>
                      ),
                    }}
                  />
                ),
              },
              {
                key: "dt",
                label: t("Downtime ({n})", { n: history.downtimes.length }),
                children: (
                  <>
                    <Button style={{ marginBottom: 8 }} onClick={() => setRecording(true)}>
                      {t("บันทึก Downtime")}
                    </Button>
                    <Table rowKey="id" size="small" columns={dtColumns} dataSource={history.downtimes} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
                  </>
                ),
              },
              {
                key: "pm",
                label: t("PM รายรอบ ({n})", { n: history.pmHistory.length }),
                children: (
                  <Table
                    rowKey="workOrderNo"
                    size="small"
                    pagination={false}
                    dataSource={history.pmHistory}
                    columns={[
                      { title: t("ใบสั่งงาน PM"), dataIndex: "workOrderNo" },
                      { title: t("งาน"), dataIndex: "title", render: (v?: string) => v ?? "—" },
                      { title: t("ทำเสร็จเมื่อ"), key: "d", render: (_v, r) => fmtDateTime(r.completedAt) },
                      { title: t("รอบผลิตที่ปิดแล้ว ณ วันนั้น"), key: "c", align: "right", render: (_v, r) => r.pmCycleCount ?? "—" },
                    ]}
                    locale={{ emptyText: t("ยังไม่มี PM ที่ปิดงาน") }}
                  />
                ),
              },
            ]}
          />
          {recording ? <RecordDowntimeModal equipmentId={equipment.id} onClose={() => setRecording(false)} /> : null}
          {ending ? <EndDowntimeModal equipmentId={equipment.id} downtime={ending} onClose={() => setEnding(null)} /> : null}
        </>
      ) : null}
    </Drawer>
  );
}
