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
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { PlannedPart, PmSchedule, ShutdownItemBody, ShutdownMaintenancePlan, WorkOrder } from "@/types/maintenance";
import { PRIORITY_OPTIONS, WORK_ORDER_STATUS_COLOR } from "@/types/maintenance";
import styles from "@/components/masters/shared/master-page.module.css";

import { fmtDate, woStatusLabel } from "./maintenance-format";
import PlannedPartsEditor from "./PlannedPartsEditor";
import TechnicianSelect from "./TechnicianSelect";
import PageHeader from "@/components/common/PageHeader";

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
  const t = useT();
  const [form] = Form.useForm<ManualValues>();
  const equipmentQuery = useEquipmentQuery({});
  return (
    <Modal
      open
      width={680}
      title={t("เพิ่มงานเข้าแผน Shutdown")}
      okText={t("เพิ่ม")}
      cancelText={t("ยกเลิก")}
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
        <Form.Item name="equipmentId" label={t("เครื่องจักร")} rules={[{ required: true, message: t("เลือกเครื่อง") }]}>
          <Select showSearch optionFilterProp="label" loading={equipmentQuery.isLoading} options={(equipmentQuery.data?.data ?? []).map((e) => ({ value: e.id, label: `${e.equipmentCode} — ${e.name}` }))} />
        </Form.Item>
        <Form.Item name="description" label={t("งานที่ทำ")} rules={[{ required: true, whitespace: true, message: t("ใส่รายละเอียด") }]}>
          <Input.TextArea rows={2} maxLength={4000} />
        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="plannedDate" label={t("วันที่ทำ")} rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" disabledDate={(d) => d.isBefore(dayjs(plan.dateFrom), "day") || d.isAfter(dayjs(plan.dateTo), "day")} />
          </Form.Item>
          <Form.Item name="priority" label={t("ความเร่งด่วน")} style={{ flex: 1 }}>
            <Select options={PRIORITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
          </Form.Item>
          <Form.Item name="plannedManpower" label={t("ช่างที่ต้องเตรียม")} style={{ flex: 1 }}>
            <InputNumber min={1} max={100} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <Form.Item name="assignedToId" label={t("ช่างหลัก")}><TechnicianSelect /></Form.Item>
        <Form.Item name="assistantIds" label={t("ผู้ช่วย")}><TechnicianSelect mode="multiple" /></Form.Item>
        <PlannedPartsEditor form={form} />
      </Form>
    </Modal>
  );
}

function PlanDetail({ plan, onBack }: { plan: ShutdownMaintenancePlan; onBack: () => void }) {
  const t = useT();
  const lang = useLanguage();
  const query = useShutdownPlanQuery(plan.id);
  const add = useAddShutdownWorkOrdersMutation();
  const { canAdd } = getScreenActionPermissions("MAINTENANCE_SHUTDOWN");
  const [manual, setManual] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [candidateDate, setCandidateDate] = useState(dayjs(plan.dateFrom));
  const data = query.data?.data;

  const woColumns: ColumnsType<WorkOrder> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    { title: t("วันที่"), key: "d", width: 110, render: (_v, w) => fmtDate(w.plannedDate) },
    { title: t("ใบสั่งงาน"), dataIndex: "workOrderNo", width: 160 },
    { title: t("เครื่อง / งาน"), key: "eq", render: (_v, w) => <div><strong>{w.equipmentCode}</strong> {w.description.split("\n")[0]}</div> },
    { title: t("ช่าง"), key: "t", width: 170, render: (_v, w) => w.technicians.map((tech) => tech.displayName).filter(Boolean).join(", ") || (w.plannedManpower ? t("ต้องการ {n} คน", { n: w.plannedManpower }) : "—") },
    { title: t("สถานะ"), key: "s", width: 100, render: (_v, w) => <Tag color={WORK_ORDER_STATUS_COLOR[w.status] ?? "default"}>{woStatusLabel(w.status, lang)}</Tag> },
  ];
  const candColumns: ColumnsType<PmSchedule> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    { title: t("แผน PM"), key: "p", render: (_v, s) => <div><strong>{s.equipmentCode}</strong> {s.title ?? "PM"}<div style={{ fontSize: 12, color: "#8a94a6" }}>{s.dueLabel}</div></div> },
    { title: t("เตรียมของ"), key: "k", render: (_v, s) => <span style={{ fontSize: 12 }}>{s.plannedParts?.map((p) => `${p.partName} ×${p.quantity}`).join(", ") || "—"}{s.plannedManpower ? ` · ${t("ช่าง")} ${s.plannedManpower}` : ""}</span> },
  ];

  return (
    <div>
      <Button onClick={onBack} style={{ marginBottom: 12 }}>{t("← กลับรายการแผน")}</Button>
      <Typography.Title level={4} style={{ marginTop: 0 }}>{plan.name} · {fmtDate(plan.dateFrom)} – {fmtDate(plan.dateTo)}</Typography.Title>
      {data ? (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={12} md={6}><Card size="small"><Statistic title={t("ใบสั่งงานที่วางไว้")} value={data.workOrderCount} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title={t("ทำเสร็จแล้ว")} value={data.completedCount} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title={t("ช่างที่ต้องเตรียม (รวม)")} value={data.plannedManpowerTotal} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title={t("รายการอะไหล่ที่ต้องเตรียม")} value={data.plannedPartsTotal.length} /></Card></Col>
          </Row>
          {data.plannedPartsTotal.length > 0 ? (
            <Alert style={{ marginBottom: 12 }} type="info" showIcon title={`${t("อะไหล่ที่ต้องเตรียมรวม")}: ${data.plannedPartsTotal.map((p) => `${p.partName} ×${p.quantity}`).join(", ")}`} />
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 6px" }}>
            <Typography.Title level={5} style={{ margin: 0 }}>{t("ใบสั่งงานในช่วง Shutdown")}</Typography.Title>
            {canAdd ? <Button icon={<PlusOutlined />} onClick={() => setManual(true)}>{t("เพิ่มงานเอง")}</Button> : null}
          </div>
          <Table rowKey="id" size="small" columns={woColumns} dataSource={data.workOrders} pagination={false} locale={{ emptyText: t("ยังไม่ได้วางงานในช่วงนี้") }} />

          <Typography.Title level={5} style={{ margin: "20px 0 6px" }}>{t("แผน PM ที่ควรทำในช่วงนี้")}</Typography.Title>
          <p style={{ color: "#8a94a6", marginTop: 0 }}>{t("ถึงกำหนด / จะครบกำหนดก่อนจบ Shutdown / ใกล้ครบรอบผลิต และยังไม่มีใบสั่งงานค้าง — เลือกแล้ววางลงในวันที่ต้องการ")}</p>
          <Table
            rowKey="id"
            size="small"
            columns={candColumns}
            dataSource={data.candidates}
            pagination={false}
            rowSelection={canAdd ? { selectedRowKeys: picked, onChange: (keys) => setPicked(keys as string[]) } : undefined}
            locale={{ emptyText: t("ไม่มีแผน PM ที่ต้องทำเพิ่มในช่วงนี้") }}
          />
          {canAdd && data.candidates.length > 0 ? (
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <span>{t("วางในวันที่")}</span>
              <DatePicker value={candidateDate} onChange={(d) => d && setCandidateDate(d)} format="DD/MM/BBBB" allowClear={false}
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
                {t("วางงานที่เลือก ({n})", { n: picked.length })}
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
  const t = useT();
  const query = useShutdownPlansQuery();
  const [selected, setSelected] = useState<ShutdownMaintenancePlan | null>(null);
  const plans = query.data?.data ?? [];

  const columns: ColumnsType<ShutdownMaintenancePlan> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: t("แผน Shutdown"),
      key: "n",
      render: (_v, p) => (
        <button type="button" onClick={() => setSelected(p)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontWeight: 600, textAlign: "left" }}>
          {p.name}
        </button>
      ),
    },
    { title: t("ช่วงวันที่"), key: "r", width: 220, render: (_v, p) => `${fmtDate(p.dateFrom)} – ${fmtDate(p.dateTo)}` },
    { title: t("ใบสั่งงาน"), key: "c", width: 150, render: (_v, p) => <Tag color={p.workOrderCount ? "blue" : "default"}>{p.completedCount}/{p.workOrderCount} {t("เสร็จ")}</Tag> },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="MAINTENANCE · SHUTDOWN"
          icon={<ToolOutlined />}
          title={t("แผนซ่อมบำรุงช่วง Shutdown")}
          subtitle={t("วางใบสั่งงาน PM ล่วงหน้าตามช่วง Shutdown พร้อมอะไหล่/ช่างที่ต้องเตรียม — แผน Shutdown สร้างที่ HRM > แผนกำลังคนช่วง Shutdown")}
        />
        <div className={styles.tableCard}>
          {selected ? (
            <PlanDetail key={selected.id} plan={selected} onBack={() => setSelected(null)} />
          ) : (
            <Table rowKey="id" className={styles.dataTable} columns={columns} dataSource={plans} loading={query.isFetching} pagination={false} locale={{ emptyText: t("ยังไม่มีแผน Shutdown — สร้างที่หน้า แผนกำลังคนช่วง Shutdown (HRM) ก่อน") }} />
          )}
        </div>
      </section>
    </MasterPageGate>
  );
}
