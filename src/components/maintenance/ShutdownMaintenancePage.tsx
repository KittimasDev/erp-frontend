"use client";

import { useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Form, InputNumber, Input, Modal, Row, Select, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, ToolOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useAddShutdownWorkOrdersMutation,
  useEquipmentQuery,
  useShutdownPlanQuery,
  useShutdownPlansQuery,
} from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import type { PlannedPart, PmSchedule, ShutdownItemBody, ShutdownMaintenancePlan, WorkOrder } from "@/types/maintenance";
import { PRIORITY_OPTIONS, WORK_ORDER_STATUS_LABEL } from "@/types/maintenance";
import styles from "@/components/masters/shared/master-page.module.css";

import { fmtDate } from "./maintenance-format";
import PlannedPartsEditor from "./PlannedPartsEditor";
import TechnicianSelect from "./TechnicianSelect";

type ManualValues = {
  equipmentId: string;
  description: string;
  plannedDate: dayjs.Dayjs;
  priority: string;
  plannedManpower?: number;
  plannedParts?: PlannedPart[];
  assignedToId?: string;
  assistantIds?: string[];
};

function AddManualModal({ plan, onClose, onSubmit, loading }: { plan: ShutdownMaintenancePlan; onClose: () => void; onSubmit: (item: ShutdownItemBody) => void; loading: boolean }) {
  const [form] = Form.useForm<ManualValues>();
  const equipmentQuery = useEquipmentQuery({});
  return (
    <Modal
      open
      width={680}
      title="เพิ่มงานเข้าแผน Shutdown"
      okText="เพิ่ม"
      cancelText="ยกเลิก"
      confirmLoading={loading}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          onSubmit({
            equipmentId: v.equipmentId,
            description: v.description.trim(),
            plannedDate: v.plannedDate.format("YYYY-MM-DD"),
            priority: v.priority,
            plannedManpower: v.plannedManpower,
            plannedParts: (v.plannedParts ?? []).filter((p) => p?.partName),
            assignedToId: v.assignedToId,
            assistantIds: v.assistantIds,
          }),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={{ priority: "NORMAL", plannedDate: dayjs(plan.dateFrom), plannedParts: [] }}>
        <Form.Item name="equipmentId" label="เครื่องจักร" rules={[{ required: true, message: "เลือกเครื่อง" }]}>
          <Select showSearch optionFilterProp="label" loading={equipmentQuery.isLoading} options={(equipmentQuery.data?.data ?? []).map((e) => ({ value: e.id, label: `${e.equipmentCode} — ${e.name}` }))} />
        </Form.Item>
        <Form.Item name="description" label="งานที่ทำ" rules={[{ required: true, whitespace: true, message: "ใส่รายละเอียด" }]}>
          <Input.TextArea rows={2} maxLength={4000} />
        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="plannedDate" label="วันที่ทำ" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabledDate={(d) => d.isBefore(dayjs(plan.dateFrom), "day") || d.isAfter(dayjs(plan.dateTo), "day")} />
          </Form.Item>
          <Form.Item name="priority" label="ความเร่งด่วน" style={{ flex: 1 }}>
            <Select options={[...PRIORITY_OPTIONS]} />
          </Form.Item>
          <Form.Item name="plannedManpower" label="ช่างที่ต้องเตรียม" style={{ flex: 1 }}>
            <InputNumber min={1} max={100} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <Form.Item name="assignedToId" label="ช่างหลัก"><TechnicianSelect /></Form.Item>
        <Form.Item name="assistantIds" label="ผู้ช่วย"><TechnicianSelect mode="multiple" /></Form.Item>
        <PlannedPartsEditor form={form} />
      </Form>
    </Modal>
  );
}

function PlanDetail({ plan, onBack }: { plan: ShutdownMaintenancePlan; onBack: () => void }) {
  const query = useShutdownPlanQuery(plan.id);
  const add = useAddShutdownWorkOrdersMutation();
  const { canAdd } = getScreenActionPermissions("MAINTENANCE_SHUTDOWN");
  const [manual, setManual] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [candidateDate, setCandidateDate] = useState(dayjs(plan.dateFrom));
  const data = query.data?.data;

  const woColumns: ColumnsType<WorkOrder> = [
    { title: "วันที่", key: "d", width: 110, render: (_v, w) => fmtDate(w.plannedDate) },
    { title: "ใบสั่งงาน", dataIndex: "workOrderNo", width: 160 },
    { title: "เครื่อง / งาน", key: "eq", render: (_v, w) => <div><strong>{w.equipmentCode}</strong> {w.description.split("\n")[0]}</div> },
    { title: "ช่าง", key: "t", width: 170, render: (_v, w) => w.technicians.map((t) => t.displayName).filter(Boolean).join(", ") || (w.plannedManpower ? `ต้องการ ${w.plannedManpower} คน` : "—") },
    { title: "สถานะ", key: "s", width: 100, render: (_v, w) => <Tag color={w.status === "COMPLETED" ? "green" : "blue"}>{WORK_ORDER_STATUS_LABEL[w.status] ?? w.status}</Tag> },
  ];
  const candColumns: ColumnsType<PmSchedule> = [
    { title: "แผน PM", key: "p", render: (_v, s) => <div><strong>{s.equipmentCode}</strong> {s.title ?? "PM"}<div style={{ fontSize: 12, color: "#8a94a6" }}>{s.dueLabel}</div></div> },
    { title: "เตรียมของ", key: "k", render: (_v, s) => <span style={{ fontSize: 12 }}>{s.plannedParts?.map((p) => `${p.partName} ×${p.quantity}`).join(", ") || "—"}{s.plannedManpower ? ` · ช่าง ${s.plannedManpower}` : ""}</span> },
  ];

  return (
    <div>
      <Button onClick={onBack} style={{ marginBottom: 12 }}>← กลับรายการแผน</Button>
      <Typography.Title level={4} style={{ marginTop: 0 }}>{plan.name} · {fmtDate(plan.dateFrom)} – {fmtDate(plan.dateTo)}</Typography.Title>
      {data ? (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={12} md={6}><Card size="small"><Statistic title="ใบสั่งงานที่วางไว้" value={data.workOrderCount} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="ทำเสร็จแล้ว" value={data.completedCount} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="ช่างที่ต้องเตรียม (รวม)" value={data.plannedManpowerTotal} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="รายการอะไหล่ที่ต้องเตรียม" value={data.plannedPartsTotal.length} /></Card></Col>
          </Row>
          {data.plannedPartsTotal.length > 0 ? (
            <Alert style={{ marginBottom: 12 }} type="info" showIcon title={`อะไหล่ที่ต้องเตรียมรวม: ${data.plannedPartsTotal.map((p) => `${p.partName} ×${p.quantity}`).join(", ")}`} />
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 6px" }}>
            <Typography.Title level={5} style={{ margin: 0 }}>ใบสั่งงานในช่วง Shutdown</Typography.Title>
            {canAdd ? <Button icon={<PlusOutlined />} onClick={() => setManual(true)}>เพิ่มงานเอง</Button> : null}
          </div>
          <Table rowKey="id" size="small" columns={woColumns} dataSource={data.workOrders} pagination={false} locale={{ emptyText: "ยังไม่ได้วางงานในช่วงนี้" }} />

          <Typography.Title level={5} style={{ margin: "20px 0 6px" }}>แผน PM ที่ควรทำในช่วงนี้</Typography.Title>
          <p style={{ color: "#8a94a6", marginTop: 0 }}>ถึงกำหนด / จะครบกำหนดก่อนจบ Shutdown / ใกล้ครบรอบผลิต และยังไม่มีใบสั่งงานค้าง — เลือกแล้ววางลงในวันที่ต้องการ</p>
          <Table
            rowKey="id"
            size="small"
            columns={candColumns}
            dataSource={data.candidates}
            pagination={false}
            rowSelection={canAdd ? { selectedRowKeys: picked, onChange: (keys) => setPicked(keys as string[]) } : undefined}
            locale={{ emptyText: "ไม่มีแผน PM ที่ต้องทำเพิ่มในช่วงนี้" }}
          />
          {canAdd && data.candidates.length > 0 ? (
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <span>วางในวันที่</span>
              <DatePicker value={candidateDate} onChange={(d) => d && setCandidateDate(d)} format="DD/MM/YYYY" allowClear={false}
                disabledDate={(d) => d.isBefore(dayjs(plan.dateFrom), "day") || d.isAfter(dayjs(plan.dateTo), "day")} />
              <Button
                type="primary"
                disabled={picked.length === 0}
                loading={add.isPending}
                onClick={() =>
                  add.mutate(
                    { planId: plan.id, items: picked.map((scheduleId) => ({ scheduleId, plannedDate: candidateDate.format("YYYY-MM-DD") })) },
                    { onSuccess: () => setPicked([]) },
                  )
                }
              >
                วางงานที่เลือก ({picked.length})
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
      {manual ? (
        <AddManualModal
          plan={plan}
          loading={add.isPending}
          onClose={() => setManual(false)}
          onSubmit={(item) => add.mutate({ planId: plan.id, items: [item] }, { onSuccess: () => setManual(false) })}
        />
      ) : null}
    </div>
  );
}

/** หน้า /maintenance/shutdown-plans — วางแผนซ่อมบำรุงช่วง Shutdown (ใช้แผน Shutdown ของ HRM เป็นกรอบเวลา) */
export default function ShutdownMaintenancePage() {
  const query = useShutdownPlansQuery();
  const [selected, setSelected] = useState<ShutdownMaintenancePlan | null>(null);
  const plans = query.data?.data ?? [];

  const columns: ColumnsType<ShutdownMaintenancePlan> = [
    {
      title: "แผน Shutdown",
      key: "n",
      render: (_v, p) => (
        <button type="button" onClick={() => setSelected(p)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontWeight: 600, textAlign: "left" }}>
          {p.name}
        </button>
      ),
    },
    { title: "ช่วงวันที่", key: "r", width: 220, render: (_v, p) => `${fmtDate(p.dateFrom)} – ${fmtDate(p.dateTo)}` },
    { title: "ใบสั่งงาน", key: "c", width: 150, render: (_v, p) => <Tag color={p.workOrderCount ? "blue" : "default"}>{p.completedCount}/{p.workOrderCount} เสร็จ</Tag> },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}><ToolOutlined /></div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>MAINTENANCE · SHUTDOWN</div>
            <Typography.Title level={2} className={styles.pageTitle}>แผนซ่อมบำรุงช่วง Shutdown</Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>วางใบสั่งงาน PM ล่วงหน้าตามช่วง Shutdown พร้อมอะไหล่/ช่างที่ต้องเตรียม — แผน Shutdown สร้างที่ HRM &gt; แผนกำลังคนช่วง Shutdown</Typography.Text>
          </div>
          <div />
        </div>
        <div className={styles.tableCard}>
          {selected ? (
            <PlanDetail key={selected.id} plan={selected} onBack={() => setSelected(null)} />
          ) : (
            <Table rowKey="id" className={styles.dataTable} columns={columns} dataSource={plans} loading={query.isFetching} pagination={false} locale={{ emptyText: "ยังไม่มีแผน Shutdown — สร้างที่หน้า แผนกำลังคนช่วง Shutdown (HRM) ก่อน" }} />
          )}
        </div>
      </section>
    </MasterPageGate>
  );
}
