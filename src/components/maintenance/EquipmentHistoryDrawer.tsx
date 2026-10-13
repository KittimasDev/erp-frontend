"use client";

import { useState } from "react";
import { Button, Descriptions, Drawer, Table, Tabs, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useEquipmentHistoryQuery } from "@/hooks/maintenance/useMaintenance";
import {
  EQUIPMENT_STATUS_LABEL,
  ROOT_CAUSE_OPTIONS,
  WORK_ORDER_STATUS_LABEL,
  type Equipment,
  type EquipmentDowntime,
  type WorkOrder,
} from "@/types/maintenance";

import { EndDowntimeModal, RecordDowntimeModal } from "./DowntimeModals";
import { fmtDate, fmtDateTime, fmtMinutes, fmtMoney } from "./maintenance-format";

const rootCauseLabel = (v?: string) => ROOT_CAUSE_OPTIONS.find((o) => o.value === v)?.label ?? "—";

type Props = { equipment: Equipment | null; onClose: () => void };

/** ประวัติซ่อมบำรุงของเครื่อง: ใบสั่งงาน · Downtime (เปิด/ปิดได้) · PM รายรอบ · ต้นทุนอะไหล่ */
export default function EquipmentHistoryDrawer({ equipment, onClose }: Props) {
  const query = useEquipmentHistoryQuery(equipment?.id);
  const history = query.data?.data;
  const [recording, setRecording] = useState(false);
  const [ending, setEnding] = useState<EquipmentDowntime | null>(null);

  const woColumns: ColumnsType<WorkOrder> = [
    { title: "เลขที่", dataIndex: "workOrderNo", width: 150 },
    { title: "ประเภท", dataIndex: "type", width: 70, render: (t: string) => <Tag color={t === "PM" ? "blue" : "volcano"}>{t}</Tag> },
    { title: "รายละเอียด", dataIndex: "description", ellipsis: true },
    { title: "สถานะ", dataIndex: "status", width: 100, render: (s: string) => WORK_ORDER_STATUS_LABEL[s] ?? s },
    { title: "เสร็จเมื่อ", key: "done", width: 140, render: (_v, w) => fmtDateTime(w.completedAt) },
    { title: "ต้นทุนอะไหล่", key: "cost", width: 120, align: "right", render: (_v, w) => fmtMoney(w.partsCost) },
  ];

  const dtColumns: ColumnsType<EquipmentDowntime> = [
    {
      title: "ประเภท",
      dataIndex: "category",
      width: 110,
      render: (c: string) => (c === "PLANNED" ? <Tag color="blue">ตามแผน</Tag> : <Tag color="red">Breakdown</Tag>),
    },
    { title: "เริ่มหยุด", key: "start", width: 140, render: (_v, d) => fmtDateTime(d.startAt) },
    { title: "รอซ่อม", key: "wait", width: 110, render: (_v, d) => fmtMinutes(d.waitingMinutes) },
    { title: "เวลาซ่อม", key: "repair", width: 110, render: (_v, d) => fmtMinutes(d.repairMinutes) },
    { title: "รวม", key: "total", width: 110, render: (_v, d) => (d.isOpen ? <Tag color="red">ยังหยุดอยู่ · {fmtMinutes(d.durationMinutes)}</Tag> : fmtMinutes(d.durationMinutes)) },
    { title: "สาเหตุ", key: "cause", render: (_v, d) => `${rootCauseLabel(d.rootCauseCategory)}${d.rootCause ? ` — ${d.rootCause}` : ""}` },
    {
      title: "",
      key: "act",
      width: 90,
      render: (_v, d) => (d.isOpen ? <Button size="small" onClick={() => setEnding(d)}>ปิด</Button> : null),
    },
  ];

  return (
    <Drawer
      open={Boolean(equipment)}
      onClose={onClose}
      size="large"
      styles={{ wrapper: { width: "min(1000px, 96vw)" } }}
      title={equipment ? `ประวัติซ่อมบำรุง — ${equipment.equipmentCode} ${equipment.name}` : ""}
      loading={query.isLoading}
    >
      {equipment && history ? (
        <>
          <Descriptions size="small" column={{ xs: 1, md: 3 }} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="สถานะ">{EQUIPMENT_STATUS_LABEL[equipment.status] ?? equipment.status}</Descriptions.Item>
            <Descriptions.Item label="Downtime รวม">{history.totalDowntimeHours} ชม.</Descriptions.Item>
            <Descriptions.Item label="ต้นทุนอะไหล่สุทธิ">{fmtMoney(history.totalPartsCost)} บาท</Descriptions.Item>
            <Descriptions.Item label="Serial">{equipment.serialNumber ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="ประกันหมดอายุ">
              {fmtDate(equipment.warrantyExpiryDate)}
              {equipment.underWarranty ? <Tag color="green" style={{ marginLeft: 6 }}>ยังอยู่ในประกัน</Tag> : null}
            </Descriptions.Item>
            <Descriptions.Item label="ชั่วโมงเดินเครื่อง">{equipment.runningHours ?? "—"}</Descriptions.Item>
          </Descriptions>
          <Tabs
            items={[
              {
                key: "wo",
                label: `ใบสั่งงาน (${history.workOrders.length})`,
                children: (
                  <Table rowKey="id" size="small" columns={woColumns} dataSource={history.workOrders} pagination={{ pageSize: 10 }} scroll={{ x: 800 }}
                    expandable={{
                      expandedRowRender: (w) => (
                        <div style={{ fontSize: 13 }}>
                          {w.rootCause ? <p style={{ margin: 0 }}>สาเหตุ: {rootCauseLabel(w.rootCauseCategory)} — {w.rootCause}</p> : null}
                          {w.correctiveAction ? <p style={{ margin: 0 }}>วิธีแก้: {w.correctiveAction}</p> : null}
                          {w.partUsages.length > 0 ? (
                            <p style={{ margin: 0 }}>อะไหล่: {w.partUsages.map((u) => `${u.partName} ×${u.quantity}${u.returnedQuantity ? ` (คืน ${u.returnedQuantity})` : ""}`).join(", ")}</p>
                          ) : null}
                        </div>
                      ),
                    }}
                  />
                ),
              },
              {
                key: "dt",
                label: `Downtime (${history.downtimes.length})`,
                children: (
                  <>
                    <Button style={{ marginBottom: 8 }} onClick={() => setRecording(true)}>
                      บันทึก Downtime
                    </Button>
                    <Table rowKey="id" size="small" columns={dtColumns} dataSource={history.downtimes} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
                  </>
                ),
              },
              {
                key: "pm",
                label: `PM รายรอบ (${history.pmHistory.length})`,
                children: (
                  <Table
                    rowKey="workOrderNo"
                    size="small"
                    pagination={false}
                    dataSource={history.pmHistory}
                    columns={[
                      { title: "ใบสั่งงาน PM", dataIndex: "workOrderNo" },
                      { title: "งาน", dataIndex: "title", render: (v?: string) => v ?? "—" },
                      { title: "ทำเสร็จเมื่อ", key: "d", render: (_v, r) => fmtDateTime(r.completedAt) },
                      { title: "รอบผลิตที่ปิดแล้ว ณ วันนั้น", key: "c", align: "right", render: (_v, r) => r.pmCycleCount ?? "—" },
                    ]}
                    locale={{ emptyText: "ยังไม่มี PM ที่ปิดงาน" }}
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
