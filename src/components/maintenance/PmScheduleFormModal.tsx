"use client";

import { useState } from "react";
import { Alert, Col, DatePicker, Form, Input, InputNumber, Modal, Radio, Row, Select, Switch } from "antd";
import dayjs from "dayjs";

import { useEquipmentQuery } from "@/hooks/maintenance/useMaintenance";
import { useT } from "@/lib/i18n/useT";
import type { PlannedPart, PmSchedule, PmScheduleBody, PmScheduleType } from "@/types/maintenance";

import PlannedPartsEditor from "./PlannedPartsEditor";

type FormValues = {
  equipmentId: string;
  title?: string;
  scheduleType: PmScheduleType;
  frequencyDays?: number;
  frequencyCycles?: number;
  nextDueDate?: dayjs.Dayjs;
  leadDays: number;
  autoGenerate: boolean;
  taskDescription?: string;
  plannedParts?: PlannedPart[];
  plannedManpower?: number;
  remark?: string;
};

type Props = {
  schedule: PmSchedule | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (body: PmScheduleBody) => void;
};

const PRESETS = [
  { label: "รายวัน", days: 1 },
  { label: "รายสัปดาห์", days: 7 },
  { label: "ราย 15 วัน", days: 15 },
  { label: "รายเดือน (30)", days: 30 },
];

/** แผน PM: ปฏิทิน (ทุก N วัน: รายวัน/รายสัปดาห์/...) หรือ ทุก N รอบผลิต + แจ้งล่วงหน้า + อะไหล่/กำลังคนที่ต้องเตรียม */
export default function PmScheduleFormModal({ schedule, loading, onCancel, onSubmit }: Props) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const editing = Boolean(schedule);
  const [type, setType] = useState<PmScheduleType>(schedule?.scheduleType ?? "CALENDAR");
  const equipmentQuery = useEquipmentQuery({ status: "ACTIVE" });

  return (
    <Modal
      open
      width={760}
      title={editing ? t("แก้ไขแผน PM") : t("สร้างแผน PM")}
      okText={t("บันทึก")}
      cancelText={t("ยกเลิก")}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() =>
        void form.validateFields().then((v) =>
          onSubmit({
            ...(editing ? {} : { equipmentId: v.equipmentId, scheduleType: type }),
            title: v.title ?? "",
            frequencyDays: type === "CALENDAR" ? v.frequencyDays : undefined,
            frequencyCycles: type === "CYCLE" ? v.frequencyCycles : undefined,
            nextDueDate: type === "CALENDAR" && v.nextDueDate ? v.nextDueDate.format("YYYY-MM-DD") : undefined,
            leadDays: v.leadDays,
            autoGenerate: v.autoGenerate,
            taskDescription: v.taskDescription ?? "",
            plannedParts: (v.plannedParts ?? []).filter((p) => p?.partName),
            plannedManpower: v.plannedManpower,
            remark: v.remark,
          }),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          equipmentId: schedule?.equipmentId,
          title: schedule?.title,
          frequencyDays: schedule?.frequencyDays ?? 30,
          frequencyCycles: schedule?.frequencyCycles ?? 1,
          nextDueDate: schedule?.nextDueDate ? dayjs(schedule.nextDueDate) : dayjs().add(30, "day"),
          leadDays: schedule?.leadDays ?? 7,
          autoGenerate: schedule?.autoGenerate ?? true,
          taskDescription: schedule?.taskDescription,
          plannedParts: schedule?.plannedParts ?? [],
          plannedManpower: schedule?.plannedManpower,
          remark: schedule?.remark,
        }}
      >
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="equipmentId" label={t("เครื่องจักร")} rules={[{ required: true, message: t("เลือกเครื่อง") }]}>
              <Select
                showSearch
                optionFilterProp="label"
                disabled={editing}
                loading={equipmentQuery.isLoading}
                options={(equipmentQuery.data?.data ?? []).map((e) => ({ value: e.id, label: `${e.equipmentCode} — ${e.name}` }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="title" label={t("ชื่องาน PM")}>
              <Input maxLength={200} placeholder={t("เช่น เปลี่ยนน้ำมันเกียร์")} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label={t("รูปแบบรอบ")}>
          <Radio.Group
            value={type}
            disabled={editing}
            onChange={(e) => setType(e.target.value as PmScheduleType)}
            options={[
              { value: "CALENDAR", label: t("ปฏิทิน (ทุก N วัน)") },
              { value: "CYCLE", label: t("ทุก N รอบผลิต") },
            ]}
          />
        </Form.Item>

        {type === "CALENDAR" ? (
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="frequencyDays" label={t("ความถี่ (วัน)")} rules={[{ required: true, message: t("ใส่ความถี่") }]} extra={
                <span>
                  {PRESETS.map((p) => (
                    <a key={p.days} style={{ marginRight: 10 }} onClick={() => form.setFieldValue("frequencyDays", p.days)}>
                      {t(p.label)}
                    </a>
                  ))}
                </span>
              }>
                <InputNumber min={1} max={3650} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nextDueDate" label={t("ครบกำหนดครั้งถัดไป")} rules={[{ required: true, message: t("เลือกวัน") }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        ) : (
          <>
            <Form.Item name="frequencyCycles" label={t("ทุกกี่รอบผลิต")} rules={[{ required: true, message: t("ใส่จำนวนรอบ") }]}>
              <InputNumber min={1} max={1000} style={{ width: 200 }} />
            </Form.Item>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              title={t("1 รอบผลิต = ใบสั่งผลิต 1 ใบที่ปิดงานแล้ว · เริ่มนับตั้งแต่สร้างแผน (หรือจาก PM ครั้งล่าสุดที่ปิดงาน) · เมื่อเหลือ 1 รอบและมีรอบที่กำลังเดิน ระบบแจ้งล่วงหน้าให้เตรียมของ")}
            />
          </>
        )}

        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item name="leadDays" label={t("แจ้งล่วงหน้า (วัน)")} extra={t("แผนแบบปฏิทิน: แจ้ง/สร้างใบก่อนครบกำหนดกี่วัน")}>
              <InputNumber min={0} max={90} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="plannedManpower" label={t("ช่างที่ต้องเตรียม (คน)")}>
              <InputNumber min={1} max={100} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="autoGenerate" label={t("สร้างใบสั่งงานอัตโนมัติ")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="taskDescription" label={t("รายละเอียด / Checklist งาน")}>
          <Input.TextArea rows={3} maxLength={4000} />
        </Form.Item>
        <PlannedPartsEditor form={form} />
        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
