"use client";

import { useState } from "react";
import { Button, Descriptions, Drawer, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useCancelWorkOrderMutation, useStartWorkOrderMutation, useWorkOrdersQuery } from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import {
  PRIORITY_OPTIONS,
  ROOT_CAUSE_OPTIONS,
  WORK_ORDER_STATUS_LABEL,
  type WorkOrderPartUsage,
} from "@/types/maintenance";

import { fmtDate, fmtDateTime, fmtMinutes, fmtMoney } from "./maintenance-format";
import { AssignModal, CompleteModal, ReturnPartModal } from "./WorkOrderModals";

const PRIORITY_COLOR: Record<string, string> = { LOW: "default", NORMAL: "blue", HIGH: "orange", CRITICAL: "red" };

type Props = { workOrderId?: string; onClose: () => void };

/** รายละเอียดใบสั่งงาน + ปุ่มมอบหมาย/เริ่ม/ปิดงาน/ยกเลิก/คืนอะไหล่ */
export default function WorkOrderDetailDrawer({ workOrderId, onClose }: Props) {
  // ใช้รายการเดียวกับหน้า (cache ร่วม) แล้วหยิบใบที่เลือก — ไม่มี endpoint รายใบแยก
  const listQuery = useWorkOrdersQuery({});
  const wo = (listQuery.data?.data ?? []).find((w) => w.id === workOrderId);
  const start = useStartWorkOrderMutation();
  const cancel = useCancelWorkOrderMutation();
  const { canEdit, canApprove } = getScreenActionPermissions("WORK_ORDERS");
  const [modal, setModal] = useState<"assign" | "complete" | null>(null);
  const [returning, setReturning] = useState<WorkOrderPartUsage | null>(null);

  const open = wo && (wo.status === "OPEN" || wo.status === "DRAFT");
  const active = wo && wo.status !== "COMPLETED" && wo.status !== "CANCELLED";

  const partColumns: ColumnsType<WorkOrderPartUsage> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: "อะไหล่", dataIndex: "partName" },
    { title: "ใช้", dataIndex: "quantity", width: 90, align: "right" },
    { title: "คืน", dataIndex: "returnedQuantity", width: 80, align: "right" },
    { title: "ต้นทุน/หน่วย", key: "uc", width: 120, align: "right", render: (_v, u) => (u.stockPosted ? fmtMoney(u.unitCost) : "—") },
    { title: "ต้นทุนสุทธิ", key: "nc", width: 120, align: "right", render: (_v, u) => (u.stockPosted ? fmtMoney(u.netCost) : "—") },
    {
      title: "",
      key: "act",
      width: 90,
      render: (_v, u) =>
        u.stockPosted && Number(u.quantity) - u.returnedQuantity > 0 && wo?.status !== "CANCELLED" && canApprove ? (
          <Button size="small" onClick={() => setReturning(u)}>คืน</Button>
        ) : null,
    },
  ];

  return (
    <Drawer
      open={Boolean(workOrderId)}
      onClose={onClose}
      size="large"
      styles={{ wrapper: { width: "min(900px, 96vw)" } }}
      title={wo ? `${wo.workOrderNo} · ${wo.equipmentCode ?? ""} ${wo.equipmentName ?? ""}` : "ใบสั่งงาน"}
      loading={listQuery.isLoading}
      extra={
        wo && active ? (
          <Space wrap>
            {canEdit ? <Button onClick={() => setModal("assign")}>มอบหมายช่าง</Button> : null}
            {open && canApprove ? (
              <Popconfirm title="เริ่มปฏิบัติงาน?" okText="เริ่มงาน" cancelText="ยกเลิก" onConfirm={() => start.mutate(wo.id)}>
                <Button type="primary" loading={start.isPending}>เริ่มงาน</Button>
              </Popconfirm>
            ) : null}
            {wo.status === "IN_PROGRESS" && canApprove ? (
              <Button type="primary" onClick={() => setModal("complete")}>ปิดงาน</Button>
            ) : null}
            {canApprove ? (
              <Popconfirm title="ยกเลิกใบสั่งงานนี้?" description="Downtime ที่ผูกกับใบนี้จะถูกปิดด้วย" okText="ยกเลิกใบ" cancelText="ไม่" onConfirm={() => cancel.mutate(wo.id)}>
                <Button danger loading={cancel.isPending}>ยกเลิกใบ</Button>
              </Popconfirm>
            ) : null}
          </Space>
        ) : null
      }
    >
      {wo ? (
        <>
          <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label="ประเภท"><Tag color={wo.type === "PM" ? "blue" : "volcano"}>{wo.type}</Tag></Descriptions.Item>
            <Descriptions.Item label="สถานะ">{WORK_ORDER_STATUS_LABEL[wo.status] ?? wo.status}</Descriptions.Item>
            <Descriptions.Item label="ความเร่งด่วน"><Tag color={PRIORITY_COLOR[wo.priority]}>{PRIORITY_OPTIONS.find((p) => p.value === wo.priority)?.label ?? wo.priority}</Tag></Descriptions.Item>
            <Descriptions.Item label="วันที่วางแผน">{fmtDate(wo.plannedDate)}</Descriptions.Item>
            <Descriptions.Item label="ช่าง" span={2}>
              {wo.technicians.length
                ? wo.technicians.map((t) => `${t.displayName ?? t.userId}${t.role === "LEAD" ? " (หัวหน้าช่าง)" : ""}`).join(", ")
                : "ยังไม่ได้มอบหมาย"}
            </Descriptions.Item>
            <Descriptions.Item label="รายละเอียด" span={2}><span style={{ whiteSpace: "pre-wrap" }}>{wo.description}</span></Descriptions.Item>
            {wo.reportedAt ? <Descriptions.Item label="แจ้งเสียเมื่อ">{fmtDateTime(wo.reportedAt)}</Descriptions.Item> : null}
            <Descriptions.Item label="เริ่มงาน">{fmtDateTime(wo.startedAt)}</Descriptions.Item>
            <Descriptions.Item label="เสร็จเมื่อ">{fmtDateTime(wo.completedAt)}</Descriptions.Item>
            {wo.plannedManpower || wo.plannedParts?.length ? (
              <Descriptions.Item label="ต้องเตรียม" span={2}>
                {wo.plannedManpower ? `ช่าง ${wo.plannedManpower} คน` : ""}
                {wo.plannedParts?.length ? ` · อะไหล่: ${wo.plannedParts.map((p) => `${p.partName} ×${p.quantity}`).join(", ")}` : ""}
              </Descriptions.Item>
            ) : null}
            {wo.downtime ? (
              <Descriptions.Item label="Downtime" span={2}>
                <Tag color={wo.downtime.category === "PLANNED" ? "blue" : "red"}>{wo.downtime.category === "PLANNED" ? "ตามแผน" : "Breakdown"}</Tag>
                เริ่มหยุด {fmtDateTime(wo.downtime.startAt)}
                {wo.downtime.repairStartedAt ? ` · เริ่มซ่อม ${fmtDateTime(wo.downtime.repairStartedAt)}` : ""}
                {wo.downtime.endAt
                  ? ` · กลับมาใช้ ${fmtDateTime(wo.downtime.endAt)} (รวม ${fmtMinutes(Math.round((new Date(wo.downtime.endAt).getTime() - new Date(wo.downtime.startAt).getTime()) / 60000))})`
                  : " · ยังหยุดอยู่"}
              </Descriptions.Item>
            ) : null}
            {wo.rootCauseCategory || wo.rootCause ? (
              <Descriptions.Item label="สาเหตุ" span={2}>
                {ROOT_CAUSE_OPTIONS.find((o) => o.value === wo.rootCauseCategory)?.label ?? ""} {wo.rootCause}
              </Descriptions.Item>
            ) : null}
            {wo.correctiveAction ? <Descriptions.Item label="วิธีแก้ไข" span={2}>{wo.correctiveAction}</Descriptions.Item> : null}
            {wo.completionNotes ? <Descriptions.Item label="บันทึกผล" span={2}>{wo.completionNotes}</Descriptions.Item> : null}
          </Descriptions>

          <h4>อะไหล่ที่ใช้ · ต้นทุนสุทธิ {fmtMoney(wo.partsCost)} บาท</h4>
          <Table rowKey="id" size="small" pagination={false} columns={partColumns} dataSource={wo.partUsages} locale={{ emptyText: "ยังไม่มีการใช้อะไหล่" }} />

          {modal === "assign" ? <AssignModal workOrder={wo} onClose={() => setModal(null)} /> : null}
          {modal === "complete" ? <CompleteModal workOrder={wo} onClose={() => setModal(null)} /> : null}
          {returning ? <ReturnPartModal workOrder={wo} usage={returning} onClose={() => setReturning(null)} /> : null}
        </>
      ) : null}
    </Drawer>
  );
}
