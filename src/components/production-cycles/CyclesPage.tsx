"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Progress, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FieldTimeOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCancelProductionCycleMutation,
  useCloseProductionCycleMutation,
  useCreateProductionCycleMutation,
  useProductionCyclesQuery,
  useUpdateProductionCycleMutation,
} from "@/hooks/production-cycles/useProductionCycles";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { CYCLE_PHASE_COLOR, CYCLE_PHASE_LABEL, type ProductionCycle } from "@/types/production-cycle";
import styles from "@/components/masters/shared/master-page.module.css";

const fmtDate = (v: string) => dayjs(v).format("DD/MM/YYYY");

type FormValues = { startDate: dayjs.Dayjs; runDays: number; shutdownDays: number; remark?: string };

/** เปิด/แก้รอบ — แสดงวันสิ้นสุดที่ระบบคำนวณให้แบบสด ๆ ก่อนกดบันทึก */
function CycleFormModal({ cycle, onClose }: { cycle: ProductionCycle | null; onClose: () => void }) {
  const [form] = Form.useForm<FormValues>();
  const create = useCreateProductionCycleMutation();
  const update = useUpdateProductionCycleMutation();
  const start = Form.useWatch("startDate", form) ?? (cycle ? dayjs(cycle.startDate) : undefined);
  const runDays = Form.useWatch("runDays", form) ?? cycle?.runDays ?? 45;
  const shutdownDays = Form.useWatch("shutdownDays", form) ?? cycle?.shutdownDays ?? 3;
  const end = start ? start.add(runDays - 1, "day") : undefined;
  const sdEnd = start ? start.add(runDays + shutdownDays - 1, "day") : undefined;

  return (
    <Modal
      open
      title={cycle ? `แก้ไขรอบ ${cycle.cycleNo}` : "เปิดรอบผลิตใหม่"}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) => {
          const body = {
            startDate: v.startDate.format("YYYY-MM-DD"),
            runDays: v.runDays,
            shutdownDays: v.shutdownDays,
            remark: v.remark?.trim() || undefined,
          };
          if (cycle) update.mutate({ id: cycle.id, body }, { onSuccess: onClose });
          else create.mutate(body, { onSuccess: onClose });
        })
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          startDate: cycle ? dayjs(cycle.startDate) : dayjs(),
          runDays: cycle?.runDays ?? 45,
          shutdownDays: cycle?.shutdownDays ?? 3,
          remark: cycle?.remark,
        }}
      >
        <Form.Item name="startDate" label="วันแรกของช่วงผลิต" rules={[{ required: true, message: "เลือกวันเริ่ม" }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="runDays" label="จำนวนวันผลิต" rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={1} max={365} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="shutdownDays" label="จำนวนวัน Shutdown" rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={0} max={60} precision={0} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        {end && sdEnd ? (
          <p style={{ background: "#f6f8fb", padding: 10, borderRadius: 8 }}>
            ผลิต <strong>{fmtDate(start!.format("YYYY-MM-DD"))}</strong> ถึง <strong>{fmtDate(end.format("YYYY-MM-DD"))}</strong>
            {shutdownDays > 0 ? (
              <>
                {" "}
                · Shutdown <strong>{fmtDate(end.add(1, "day").format("YYYY-MM-DD"))}</strong> ถึง{" "}
                <strong>{fmtDate(sdEnd.format("YYYY-MM-DD"))}</strong>
              </>
            ) : null}
            <br />
            <span style={{ color: "#8a94a6", fontSize: 12 }}>
              ใบสั่งผลิตที่สร้าง/เริ่มผลิตในช่วงนี้จะสังกัดรอบนี้อัตโนมัติ
            </span>
          </p>
        ) : null}
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** หน้า /production/cycles — รอบผลิต Pyrolysis (45 วัน + Shutdown 3 วัน) */
export default function CyclesPage() {
  const query = useProductionCyclesQuery();
  const close = useCloseProductionCycleMutation();
  const cancel = useCancelProductionCycleMutation();
  const { canAdd, canEdit } = getScreenActionPermissions("PRODUCTION_CYCLES");
  const [editing, setEditing] = useState<ProductionCycle | "new" | null>(null);
  const [cancelling, setCancelling] = useState<ProductionCycle | null>(null);
  const [reason, setReason] = useState("");

  const columns: ColumnsType<ProductionCycle> = [
    {
      title: "รอบ",
      key: "no",
      render: (_v, c) => (
        <div>
          <Link href={`/production/cycles/${c.id}`}>
            <strong>{c.cycleNo}</strong>
          </Link>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{c.orderCount} ใบสั่งผลิต</div>
        </div>
      ),
    },
    {
      title: "ช่วงผลิต",
      key: "run",
      render: (_v, c) => `${fmtDate(c.startDate)} – ${fmtDate(c.endDate)} (${c.runDays} วัน)`,
    },
    {
      title: "Shutdown",
      key: "sd",
      render: (_v, c) => (c.shutdownDays > 0 ? `${fmtDate(c.shutdownStartDate)} – ${fmtDate(c.shutdownEndDate)} (${c.shutdownDays} วัน)` : "—"),
    },
    {
      title: "ความคืบหน้า",
      key: "pg",
      width: 200,
      render: (_v, c) =>
        c.status === "OPEN" ? (
          <div>
            <Progress percent={c.runProgressPercent} size="small" showInfo={false} />
            <div style={{ fontSize: 12 }}>
              วันที่ {c.runDayNumber}/{c.runDays} · เหลือ {c.remainingRunDays} วัน
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    { title: "สถานะ", key: "ph", width: 190, render: (_v, c) => <Tag color={CYCLE_PHASE_COLOR[c.phase]}>{CYCLE_PHASE_LABEL[c.phase] ?? c.phase}</Tag> },
    {
      title: "",
      key: "act",
      width: 260,
      render: (_v, c) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link href={`/production/cycles/${c.id}`}>
            <Button size="small">สรุปรอบ</Button>
          </Link>
          {canEdit && c.status === "OPEN" ? (
            <>
              <Button size="small" onClick={() => setEditing(c)}>แก้ไข</Button>
              <Popconfirm title="ปิดรอบนี้?" description="ปิดได้เมื่อไม่มีใบสั่งผลิตที่กำลังผลิตค้างอยู่" okText="ปิดรอบ" cancelText="ไม่" onConfirm={() => close.mutate({ id: c.id })}>
                <Button size="small" type="primary" ghost>ปิดรอบ</Button>
              </Popconfirm>
              {c.orderCount === 0 ? <Button size="small" danger onClick={() => setCancelling(c)}>ยกเลิก</Button> : null}
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}><FieldTimeOutlined /></div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>PRODUCTION · CYCLE</div>
            <Typography.Title level={2} className={styles.pageTitle}>รอบผลิต (Production Cycle)</Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              เปิดรอบ 45 วัน + Shutdown 3 วัน (ปรับได้) — ใบสั่งผลิตผูกรอบอัตโนมัติ และดูรายงานสรุปผลรายรอบได้ที่ปุ่มสรุปรอบ
            </Typography.Text>
          </div>
          {canAdd ? <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setEditing("new")}>เปิดรอบใหม่</Button> : <div />}
        </div>
        <div className={styles.tableCard}>
          <Table rowKey="id" className={styles.dataTable} columns={columns} dataSource={query.data?.data ?? []} loading={query.isFetching} pagination={{ pageSize: 20 }} locale={{ emptyText: "ยังไม่มีรอบผลิต — กด เปิดรอบใหม่" }} scroll={{ x: 1000 }} />
        </div>
        {editing ? <CycleFormModal key={editing === "new" ? "new" : editing.id} cycle={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
        <Modal
          open={Boolean(cancelling)}
          title={`ยกเลิกรอบ ${cancelling?.cycleNo ?? ""}`}
          okText="ยกเลิกรอบ"
          okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
          cancelText="ไม่"
          confirmLoading={cancel.isPending}
          onCancel={() => { setCancelling(null); setReason(""); }}
          onOk={() => cancelling && cancel.mutate({ id: cancelling.id, reason: reason.trim() }, { onSuccess: () => { setCancelling(null); setReason(""); } })}
        >
          <Input.TextArea rows={3} maxLength={2000} placeholder="เหตุผล (อย่างน้อย 5 ตัวอักษร)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Modal>
      </section>
    </MasterPageGate>
  );
}
