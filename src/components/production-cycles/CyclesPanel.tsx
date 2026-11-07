"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Progress, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
  useCancelProductionCycleMutation,
  useCloseProductionCycleMutation,
  useProductionCyclesQuery,
  useUpdateProductionCycleMutation,
} from "@/hooks/production-cycles/useProductionCycles";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { CYCLE_PHASE_COLOR, cyclePhaseLabel, type ProductionCycle } from "@/types/production-cycle";

const fmtDate = (v: string) => dayjs(v).format("DD/MM/YYYY");

type FormValues = { startDate: dayjs.Dayjs; runDays: number; shutdownDays: number; remark?: string };

/** แก้รอบ — แสดงวันสิ้นสุดที่ระบบคำนวณให้แบบสด ๆ ก่อนกดบันทึก (รอบใหม่เกิดจากยืนยันรอบในตารางการผลิต) */
function CycleEditModal({ cycle, onClose }: { cycle: ProductionCycle; onClose: () => void }) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const update = useUpdateProductionCycleMutation();
  const start = Form.useWatch("startDate", form) ?? dayjs(cycle.startDate);
  const runDays = Form.useWatch("runDays", form) ?? cycle.runDays;
  const shutdownDays = Form.useWatch("shutdownDays", form) ?? cycle.shutdownDays;
  const end = start.add(runDays - 1, "day");
  const sdEnd = start.add(runDays + shutdownDays - 1, "day");

  return (
    <Modal
      open
      title={getStoredLanguage() === "en" ? `Edit cycle ${cycle.cycleNo}` : `แก้ไขรอบ ${cycle.cycleNo}`}
      okText={t("บันทึก")}
      cancelText={t("ยกเลิก")}
      confirmLoading={update.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          update.mutate(
            {
              id: cycle.id,
              body: {
                startDate: v.startDate.format("YYYY-MM-DD"),
                runDays: v.runDays,
                shutdownDays: v.shutdownDays,
                remark: v.remark?.trim() || undefined,
              },
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          startDate: dayjs(cycle.startDate),
          runDays: cycle.runDays,
          shutdownDays: cycle.shutdownDays,
          remark: cycle.remark,
        }}
      >
        <Form.Item name="startDate" label={t("วันแรกของช่วงผลิต")} rules={[{ required: true, message: t("เลือกวันเริ่ม") }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="runDays" label={t("จำนวนวันผลิต")} rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={1} max={365} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="shutdownDays" label={t("จำนวนวัน Shutdown")} rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={0} max={60} precision={0} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <p style={{ background: "#f6f8fb", padding: 10, borderRadius: 8 }}>
          {t("ผลิต")} <strong>{fmtDate(start.format("YYYY-MM-DD"))}</strong> {getStoredLanguage() === "en" ? "to" : "ถึง"} <strong>{fmtDate(end.format("YYYY-MM-DD"))}</strong>
          {shutdownDays > 0 ? (
            <>
              {" "}
              · Shutdown <strong>{fmtDate(end.add(1, "day").format("YYYY-MM-DD"))}</strong> {getStoredLanguage() === "en" ? "to" : "ถึง"}{" "}
              <strong>{fmtDate(sdEnd.format("YYYY-MM-DD"))}</strong>
            </>
          ) : null}
          <br />
          <span style={{ color: "#8a94a6", fontSize: 12 }}>
            {t("ใบสั่งผลิตที่สร้าง/เริ่มผลิตในช่วงนี้จะสังกัดรอบนี้อัตโนมัติ")}
          </span>
        </p>
        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * รอบผลิตจริง (Pyrolysis 45 วัน + Shutdown 3 วัน) — แท็บในหน้า /production/schedule
 * รหัสรอบเป็นตัวเดียวกับรหัสในตารางแผน (CYC-YYYY-NN) · รอบเกิดจากยืนยันรอบในตารางการผลิตเท่านั้น
 */
export default function CyclesPanel() {
  const t = useT();
  const [page, setPage] = useState(1);
  const query = useProductionCyclesQuery();
  const close = useCloseProductionCycleMutation();
  const cancel = useCancelProductionCycleMutation();
  const { canEdit } = getScreenActionPermissions("PRODUCTION_CYCLES");
  const [editing, setEditing] = useState<ProductionCycle | null>(null);
  const [cancelling, setCancelling] = useState<ProductionCycle | null>(null);
  const [reason, setReason] = useState("");

  const columns: ColumnsType<ProductionCycle> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("รหัสรอบ"),
      key: "no",
      render: (_v, c) => (
        <div>
          <Link href={`/production/cycles/${c.id}`}>
            <strong>{c.cycleNo}</strong>
          </Link>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{t("{n} ใบสั่งผลิต", { n: c.orderCount })}</div>
        </div>
      ),
    },
    {
      title: t("ช่วงผลิต"),
      key: "run",
      render: (_v, c) => `${fmtDate(c.startDate)} – ${fmtDate(c.endDate)} (${t("{n} วัน", { n: c.runDays })})`,
    },
    {
      title: "Shutdown",
      key: "sd",
      render: (_v, c) => (c.shutdownDays > 0 ? `${fmtDate(c.shutdownStartDate)} – ${fmtDate(c.shutdownEndDate)} (${t("{n} วัน", { n: c.shutdownDays })})` : "—"),
    },
    {
      title: t("ความคืบหน้า"),
      key: "pg",
      width: 200,
      render: (_v, c) =>
        c.status === "OPEN" ? (
          <div>
            <Progress percent={c.runProgressPercent} size="small" showInfo={false} />
            <div style={{ fontSize: 12 }}>
              {t("วันที่ {day}/{total} · เหลือ {left} วัน", { day: c.runDayNumber, total: c.runDays, left: c.remainingRunDays })}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    { title: t("สถานะ"), key: "ph", width: 190, render: (_v, c) => <Tag color={CYCLE_PHASE_COLOR[c.phase]}>{cyclePhaseLabel(c.phase)}</Tag> },
    {
      title: "",
      key: "act",
      width: 260,
      render: (_v, c) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link href={`/production/cycles/${c.id}`}>
            <Button size="small">{t("สรุปรอบ")}</Button>
          </Link>
          {canEdit && c.status === "OPEN" ? (
            <>
              <Button size="small" onClick={() => setEditing(c)}>{t("แก้ไข")}</Button>
              <Popconfirm title={t("ปิดรอบนี้?")} description={t("ปิดได้เมื่อไม่มีใบสั่งผลิตที่กำลังผลิตค้างอยู่")} okText={t("ปิดรอบ")} cancelText={t("ไม่")} onConfirm={() => close.mutate({ id: c.id })}>
                <Button size="small" type="primary" ghost>{t("ปิดรอบ")}</Button>
              </Popconfirm>
              {c.orderCount === 0 ? <Button size="small" danger onClick={() => setCancelling(c)}>{t("ยกเลิก")}</Button> : null}
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={query.data?.data ?? []}
        loading={query.isLoading || query.isFetching}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }}
        locale={{ emptyText: t("ยังไม่มีรอบผลิตจริง — รอบเกิดจากการยืนยันรอบในแท็บ รายการรอบการผลิต") }}
        scroll={{ x: 1000 }}
      />
      {editing ? <CycleEditModal key={editing.id} cycle={editing} onClose={() => setEditing(null)} /> : null}
      <Modal
        open={Boolean(cancelling)}
        title={getStoredLanguage() === "en" ? `Cancel cycle ${cancelling?.cycleNo ?? ""}` : `ยกเลิกรอบ ${cancelling?.cycleNo ?? ""}`}
        okText={getStoredLanguage() === "en" ? "Cancel cycle" : "ยกเลิกรอบ"}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        cancelText={t("ไม่")}
        confirmLoading={cancel.isPending}
        onCancel={() => { setCancelling(null); setReason(""); }}
        onOk={() => cancelling && cancel.mutate({ id: cancelling.id, reason: reason.trim() }, { onSuccess: () => { setCancelling(null); setReason(""); } })}
      >
        <Input.TextArea rows={3} maxLength={2000} placeholder={t("เหตุผล (อย่างน้อย 5 ตัวอักษร)")} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </>
  );
}
