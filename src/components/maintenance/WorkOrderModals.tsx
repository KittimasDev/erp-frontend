"use client";

import { Alert, DatePicker, Form, Input, InputNumber, Modal, Radio, Select } from "antd";
import dayjs from "dayjs";

import {
  useAssignWorkOrderMutation,
  useCompleteWorkOrderMutation,
  useCreateWorkOrderMutation,
  useEquipmentQuery,
  useReturnPartMutation,
} from "@/hooks/maintenance/useMaintenance";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  PRIORITY_OPTIONS,
  ROOT_CAUSE_OPTIONS,
  type PlannedPart,
  type WorkOrder,
  type WorkOrderPartUsage,
} from "@/types/maintenance";

import PlannedPartsEditor from "./PlannedPartsEditor";
import TechnicianSelect from "./TechnicianSelect";

// ───────── สร้างใบสั่งงาน ─────────
type CreateValues = {
  equipmentId: string;
  type: "PM" | "CM";
  description: string;
  priority: string;
  plannedDate?: dayjs.Dayjs;
  plannedManpower?: number;
  plannedParts?: PlannedPart[];
  assignedToId?: string;
  assistantIds?: string[];
};

export function CreateWorkOrderModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [form] = Form.useForm<CreateValues>();
  const equipmentQuery = useEquipmentQuery({ status: "ACTIVE" });
  const create = useCreateWorkOrderMutation();
  return (
    <Modal
      open
      width={680}
      title={t("สร้างใบสั่งงานซ่อมบำรุง")}
      okText={t("สร้าง")}
      cancelText={t("ยกเลิก")}
      confirmLoading={create.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          create.mutate(
            {
              equipmentId: v.equipmentId,
              type: v.type,
              description: v.description.trim(),
              priority: v.priority,
              plannedDate: v.plannedDate?.format("YYYY-MM-DD"),
              plannedManpower: v.plannedManpower,
              plannedParts: (v.plannedParts ?? []).filter((p) => p?.partName),
              assignedToId: v.assignedToId,
              assistantIds: v.assistantIds,
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={{ type: "PM", priority: "NORMAL", plannedParts: [] }}>
        <Form.Item name="type" label={t("ประเภท")}>
          <Radio.Group
            options={[
              { value: "PM", label: t("PM (ป้องกัน)") },
              { value: "CM", label: t("CM (แก้ไข) — ถ้าเครื่องเสียให้ใช้ “แจ้งเสีย”") },
            ]}
          />
        </Form.Item>
        <Form.Item name="equipmentId" label={t("เครื่องจักร")} rules={[{ required: true, message: t("เลือกเครื่อง") }]}>
          <Select
            showSearch
            optionFilterProp="label"
            loading={equipmentQuery.isLoading}
            options={(equipmentQuery.data?.data ?? []).map((e) => ({ value: e.id, label: `${e.equipmentCode} — ${e.name}` }))}
          />
        </Form.Item>
        <Form.Item name="description" label={t("รายละเอียดงาน")} rules={[{ required: true, whitespace: true, message: t("ใส่รายละเอียด") }]}>
          <Input.TextArea rows={3} maxLength={4000} />
        </Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="priority" label={t("ความเร่งด่วน")} style={{ flex: 1 }}>
            <Select options={PRIORITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
          </Form.Item>
          <Form.Item name="plannedDate" label={t("วันที่วางแผน")} style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="plannedManpower" label={t("ช่างที่ต้องเตรียม")} style={{ flex: 1 }}>
            <InputNumber min={1} max={100} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <Form.Item name="assignedToId" label={t("ช่างหลัก")}>
          <TechnicianSelect />
        </Form.Item>
        <Form.Item name="assistantIds" label={t("ผู้ช่วย")}>
          <TechnicianSelect mode="multiple" placeholder="เลือกผู้ช่วย (ได้หลายคน)" />
        </Form.Item>
        <PlannedPartsEditor form={form} />
      </Form>
    </Modal>
  );
}

// ───────── มอบหมายช่าง ─────────
export function AssignModal({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  const t = useT();
  const [form] = Form.useForm<{ assignedToId: string; assistantIds?: string[] }>();
  const assign = useAssignWorkOrderMutation();
  const lead = workOrder.technicians.find((tech) => tech.role === "LEAD")?.userId ?? workOrder.assignedToId;
  return (
    <Modal
      open
      title={t("มอบหมายช่าง — {no}", { no: workOrder.workOrderNo })}
      okText={t("บันทึก")}
      cancelText={t("ยกเลิก")}
      confirmLoading={assign.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          assign.mutate({ id: workOrder.id, assignedToId: v.assignedToId, assistantIds: v.assistantIds }, { onSuccess: onClose }),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          assignedToId: lead,
          assistantIds: workOrder.technicians.filter((tech) => tech.role === "ASSIST").map((tech) => tech.userId),
        }}
      >
        <Form.Item name="assignedToId" label={t("ช่างหลัก")} rules={[{ required: true, message: t("เลือกช่างหลัก") }]}>
          <TechnicianSelect />
        </Form.Item>
        <Form.Item name="assistantIds" label={t("ผู้ช่วย")}>
          <TechnicianSelect mode="multiple" placeholder="เลือกผู้ช่วย (ได้หลายคน)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ───────── ปิดงาน ─────────
type CompleteValues = {
  completionNotes?: string;
  rootCauseCategory?: string;
  rootCause?: string;
  correctiveAction?: string;
  partUsages?: PlannedPart[];
};

export function CompleteModal({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  const t = useT();
  const [form] = Form.useForm<CompleteValues>();
  const complete = useCompleteWorkOrderMutation();
  const isCm = workOrder.type === "CM";
  return (
    <Modal
      open
      width={680}
      title={t("ปิดงาน — {no}", { no: workOrder.workOrderNo })}
      okText={t("ปิดงาน")}
      cancelText={t("ยกเลิก")}
      confirmLoading={complete.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          complete.mutate(
            {
              id: workOrder.id,
              body: {
                completionNotes: v.completionNotes,
                rootCauseCategory: v.rootCauseCategory,
                rootCause: v.rootCause,
                correctiveAction: v.correctiveAction,
                partUsages: (v.partUsages ?? [])
                  .filter((p) => p?.partName)
                  .map((p) => ({ itemId: p.itemId, partName: p.partName, quantity: p.quantity })),
              },
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={{ partUsages: [] }}>
        {isCm ? (
          <>
            <Form.Item name="rootCauseCategory" label={t("กลุ่มสาเหตุ (Root Cause)")}>
              <Select allowClear options={ROOT_CAUSE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} placeholder={t("เลือกกลุ่มสาเหตุ")} />
            </Form.Item>
            <Form.Item name="rootCause" label={t("วิเคราะห์สาเหตุ")}>
              <Input.TextArea rows={2} maxLength={4000} />
            </Form.Item>
            <Form.Item name="correctiveAction" label={t("วิธีแก้ไขที่ทำ")}>
              <Input.TextArea rows={2} maxLength={4000} />
            </Form.Item>
          </>
        ) : null}
        <Form.Item name="completionNotes" label={t("บันทึกผลการซ่อมบำรุง")}>
          <Input.TextArea rows={2} maxLength={4000} />
        </Form.Item>
        <PlannedPartsEditor form={form} name="partUsages" label="อะไหล่ที่ใช้" />
        <Alert
          type="info"
          showIcon
          title={t("อะไหล่ที่เลือกสินค้าในคลังจะตัดสต๊อกจริง (FIFO) จากตำแหน่งจัดเก็บของเครื่อง พร้อมบันทึกต้นทุน · ถ้าเครื่องยังไม่ตั้งตำแหน่งหรือสต๊อกไม่พอ ปิดงานไม่ได้ · ไม่เลือกสินค้า = บันทึกชื่อเฉย ๆ ไม่ตัดสต๊อก")}
        />
      </Form>
    </Modal>
  );
}

// ───────── คืนอะไหล่ ─────────
export function ReturnPartModal({
  workOrder,
  usage,
  onClose,
}: {
  workOrder: WorkOrder;
  usage: WorkOrderPartUsage;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLanguage();
  const [form] = Form.useForm<{ quantity: number; remark?: string }>();
  const ret = useReturnPartMutation();
  const remaining = Number(usage.quantity) - usage.returnedQuantity;
  return (
    <Modal
      open
      title={t("คืนอะไหล่ — {name}", { name: usage.partName })}
      okText={lang === "en" ? "Return to stock" : "คืนเข้าคลัง"}
      cancelText={t("ยกเลิก")}
      confirmLoading={ret.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          ret.mutate({ id: workOrder.id, usageId: usage.id, quantity: v.quantity, remark: v.remark }, { onSuccess: onClose }),
        )
      }
    >
      <p style={{ marginTop: 0 }}>{t("ใช้")} {usage.quantity} · {t("คืนแล้ว")} {usage.returnedQuantity} · {t("คืนได้อีก")} {remaining.toFixed(3)}</p>
      <Form form={form} layout="vertical" initialValues={{ quantity: remaining }}>
        <Form.Item name="quantity" label={t("จำนวนที่คืน")} rules={[{ required: true, message: t("ใส่จำนวน") }]}>
          <InputNumber min={0.001} max={remaining} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
