"use client";

import { useState } from "react";
import { Button, Descriptions, Drawer, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useCancelWorkOrderMutation, useStartWorkOrderMutation, useWorkOrdersQuery } from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  PRIORITY_OPTIONS,
  ROOT_CAUSE_OPTIONS,
  type WorkOrderPartUsage,
} from "@/types/maintenance";

import { fmtDate, fmtDateTime, fmtMinutes, fmtMoney, woStatusLabel } from "./maintenance-format";
import { AssignModal, CompleteModal, ReturnPartModal } from "./WorkOrderModals";

const PRIORITY_COLOR: Record<string, string> = { LOW: "default", NORMAL: "blue", HIGH: "orange", CRITICAL: "red" };

type Props = { workOrderId?: string; onClose: () => void };

/** รายละเอียดใบสั่งงาน + ปุ่มมอบหมาย/เริ่ม/ปิดงาน/ยกเลิก/คืนอะไหล่ */
export default function WorkOrderDetailDrawer({ workOrderId, onClose }: Props) {
  const t = useT();
  const lang = useLanguage();
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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("อะไหล่"), dataIndex: "partName" },
    { title: t("ใช้"), dataIndex: "quantity", width: 90, align: "right" },
    { title: t("คืน"), dataIndex: "returnedQuantity", width: 80, align: "right" },
    { title: t("ต้นทุน/หน่วย"), key: "uc", width: 120, align: "right", render: (_v, u) => (u.stockPosted ? fmtMoney(u.unitCost) : "—") },
    { title: t("ต้นทุนสุทธิ"), key: "nc", width: 120, align: "right", render: (_v, u) => (u.stockPosted ? fmtMoney(u.netCost) : "—") },
    {
      title: "",
      key: "act",
      width: 90,
      render: (_v, u) =>
        u.stockPosted && Number(u.quantity) - u.returnedQuantity > 0 && wo?.status !== "CANCELLED" && canApprove ? (
          <Button size="small" onClick={() => setReturning(u)}>{t("คืน")}</Button>
        ) : null,
    },
  ];

  return (
    <Drawer
      open={Boolean(workOrderId)}
      onClose={onClose}
      size="large"
      styles={{ wrapper: { width: "min(900px, 96vw)" } }}
      title={wo ? `${wo.workOrderNo} · ${wo.equipmentCode ?? ""} ${wo.equipmentName ?? ""}` : t("ใบสั่งงาน")}
      loading={listQuery.isLoading}
      extra={
        wo && active ? (
          <Space wrap>
            {canEdit ? <Button onClick={() => setModal("assign")}>{t("มอบหมายช่าง")}</Button> : null}
            {open && canApprove ? (
              <Popconfirm title={t("เริ่มปฏิบัติงาน?")} okText={t("เริ่มงาน")} cancelText={t("ยกเลิก")} onConfirm={() => start.mutate(wo.id)}>
                <Button type="primary" loading={start.isPending}>{t("เริ่มงาน")}</Button>
              </Popconfirm>
            ) : null}
            {wo.status === "IN_PROGRESS" && canApprove ? (
              <Button type="primary" onClick={() => setModal("complete")}>{t("ปิดงาน")}</Button>
            ) : null}
            {canApprove ? (
              <Popconfirm title={t("ยกเลิกใบสั่งงานนี้?")} description={t("Downtime ที่ผูกกับใบนี้จะถูกปิดด้วย")} okText={t("ยกเลิกใบ")} cancelText={t("ไม่")} onConfirm={() => cancel.mutate(wo.id)}>
                <Button danger loading={cancel.isPending}>{t("ยกเลิกใบ")}</Button>
              </Popconfirm>
            ) : null}
          </Space>
        ) : null
      }
    >
      {wo ? (
        <>
          <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label={t("ประเภท")}><Tag color={wo.type === "PM" ? "blue" : "volcano"}>{wo.type}</Tag></Descriptions.Item>
            <Descriptions.Item label={t("สถานะ")}>{woStatusLabel(wo.status, lang)}</Descriptions.Item>
            <Descriptions.Item label={t("ความเร่งด่วน")}><Tag color={PRIORITY_COLOR[wo.priority]}>{t(PRIORITY_OPTIONS.find((p) => p.value === wo.priority)?.label ?? wo.priority)}</Tag></Descriptions.Item>
            <Descriptions.Item label={t("วันที่วางแผน")}>{fmtDate(wo.plannedDate)}</Descriptions.Item>
            <Descriptions.Item label={t("ช่าง")} span={2}>
              {wo.technicians.length
                ? wo.technicians.map((tech) => `${tech.displayName ?? tech.userId}${tech.role === "LEAD" ? ` ${t("(หัวหน้าช่าง)")}` : ""}`).join(", ")
                : t("ยังไม่ได้มอบหมาย")}
            </Descriptions.Item>
            <Descriptions.Item label={t("รายละเอียด")} span={2}><span style={{ whiteSpace: "pre-wrap" }}>{wo.description}</span></Descriptions.Item>
            {wo.reportedAt ? <Descriptions.Item label={t("แจ้งเสียเมื่อ")}>{fmtDateTime(wo.reportedAt)}</Descriptions.Item> : null}
            <Descriptions.Item label={t("เริ่มงาน")}>{fmtDateTime(wo.startedAt)}</Descriptions.Item>
            <Descriptions.Item label={t("เสร็จเมื่อ")}>{fmtDateTime(wo.completedAt)}</Descriptions.Item>
            {wo.plannedManpower || wo.plannedParts?.length ? (
              <Descriptions.Item label={t("ต้องเตรียม")} span={2}>
                {wo.plannedManpower ? t("ช่าง {n} คน", { n: wo.plannedManpower }) : ""}
                {wo.plannedParts?.length ? ` · ${t("อะไหล่")}: ${wo.plannedParts.map((p) => `${p.partName} ×${p.quantity}`).join(", ")}` : ""}
              </Descriptions.Item>
            ) : null}
            {wo.downtime ? (
              <Descriptions.Item label="Downtime" span={2}>
                <Tag color={wo.downtime.category === "PLANNED" ? "blue" : "red"}>{wo.downtime.category === "PLANNED" ? t("ตามแผน") : t("Breakdown")}</Tag>
                {t("เริ่มหยุด")} {fmtDateTime(wo.downtime.startAt)}
                {wo.downtime.repairStartedAt ? ` · ${t("เริ่มซ่อม")} ${fmtDateTime(wo.downtime.repairStartedAt)}` : ""}
                {wo.downtime.endAt
                  ? ` · ${t("กลับมาใช้")} ${fmtDateTime(wo.downtime.endAt)} (${t("รวม")} ${fmtMinutes(Math.round((new Date(wo.downtime.endAt).getTime() - new Date(wo.downtime.startAt).getTime()) / 60000))})`
                  : ` · ${t("ยังหยุดอยู่")}`}
              </Descriptions.Item>
            ) : null}
            {wo.rootCauseCategory || wo.rootCause ? (
              <Descriptions.Item label={t("สาเหตุ")} span={2}>
                {t(ROOT_CAUSE_OPTIONS.find((o) => o.value === wo.rootCauseCategory)?.label ?? "")} {wo.rootCause}
              </Descriptions.Item>
            ) : null}
            {wo.correctiveAction ? <Descriptions.Item label={t("วิธีแก้ไข")} span={2}>{wo.correctiveAction}</Descriptions.Item> : null}
            {wo.completionNotes ? <Descriptions.Item label={t("บันทึกผล")} span={2}>{wo.completionNotes}</Descriptions.Item> : null}
          </Descriptions>

          <h4>{t("อะไหล่ที่ใช้ · ต้นทุนสุทธิ")} {fmtMoney(wo.partsCost)} {t("บาท")}</h4>
          <Table rowKey="id" size="small" pagination={false} columns={partColumns} dataSource={wo.partUsages} locale={{ emptyText: t("ยังไม่มีการใช้อะไหล่") }} />

          {modal === "assign" ? <AssignModal workOrder={wo} onClose={() => setModal(null)} /> : null}
          {modal === "complete" ? <CompleteModal workOrder={wo} onClose={() => setModal(null)} /> : null}
          {returning ? <ReturnPartModal workOrder={wo} usage={returning} onClose={() => setReturning(null)} /> : null}
        </>
      ) : null}
    </Drawer>
  );
}
