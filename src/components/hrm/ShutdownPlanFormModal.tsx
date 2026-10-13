"use client";

import { useEffect } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { usePositionsQuery } from "@/hooks/positions/usePositionsQuery";
import { useShiftsQuery } from "@/hooks/shifts/useShiftQueries";
import type {
  CreateShutdownPlanRequest,
  ShutdownPlan,
} from "@/types/shutdown-plans";

type DemandRow = { position?: string; shiftId?: string; headcount?: number };

type FormValues = {
  name: string;
  range: [Dayjs, Dayjs];
  note?: string;
  demands: DemandRow[];
};

type Props = {
  open: boolean;
  /** ไม่ส่ง = สร้างใหม่ */
  plan?: ShutdownPlan | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateShutdownPlanRequest) => void;
};

/** สร้าง/แก้แผน Shutdown: ชื่อ ช่วงวัน และความต้องการกำลังคนต่อ ตำแหน่ง × กะ */
export default function ShutdownPlanFormModal({
  open,
  plan,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const positionsQuery = usePositionsQuery({ isActive: true });
  const shiftsQuery = useShiftsQuery(false, open);
  const positions = positionsQuery.data?.data ?? [];
  const shifts = shiftsQuery.data?.data ?? [];

  useEffect(() => {
    if (!open) return;
    if (plan) {
      form.setFieldsValue({
        name: plan.name,
        range: [dayjs(plan.dateFrom), dayjs(plan.dateTo)],
        note: plan.note ?? undefined,
        demands: plan.demands.map((d) => ({
          position: d.position,
          shiftId: d.shiftId,
          headcount: d.headcount,
        })),
      });
      return;
    }
    form.setFieldsValue({
      name: "",
      range: undefined,
      note: undefined,
      demands: [{}],
    });
  }, [open, plan, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const demands = (values.demands ?? [])
      .filter((d) => d.position && d.shiftId && d.headcount)
      .map((d) => ({
        position: d.position!,
        shiftId: d.shiftId!,
        headcount: d.headcount!,
      }));
    onSubmit({
      name: values.name.trim(),
      dateFrom: values.range[0].format("YYYY-MM-DD"),
      dateTo: values.range[1].format("YYYY-MM-DD"),
      note: values.note?.trim() || undefined,
      demands,
    });
  };

  return (
    <Modal
      open={open}
      title={plan ? "แก้ไขแผน Shutdown" : "สร้างแผน Shutdown"}
      okText={plan ? "อัปเดต" : "สร้างแผน"}
      cancelText="ยกเลิก"
      confirmLoading={confirmLoading}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnHidden
      centered
      width={720}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="ชื่อแผน"
          name="name"
          rules={[{ required: true, message: "กรุณากรอกชื่อแผน" }, { max: 200 }]}
        >
          <Input placeholder="เช่น Shutdown ประจำปี 2569" />
        </Form.Item>

        <Form.Item
          label="ช่วงวันที่ Shutdown"
          name="range"
          extra={'ยาวไม่เกิน 31 วัน · ระบบลงวัน "วันซ่อมเครื่อง" ในปฏิทินให้ ตัวจัดกะปกติจะข้ามช่วงนี้และไม่คิดสาย'}
          rules={[{ required: true, message: "กรุณาเลือกช่วงวันที่" }]}
        >
          <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item label="กำลังคนที่ต้องการต่อวัน (ตำแหน่ง × กะ)">
          <Form.List name="demands">
            {(fields, { add, remove }) => (
              <div style={{ display: "grid", gap: 8 }}>
                {fields.map((field) => (
                  <div
                    key={field.key}
                    style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 90px 32px", gap: 8 }}
                  >
                    <Form.Item name={[field.name, "position"]} noStyle>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="ตำแหน่ง"
                        loading={positionsQuery.isLoading}
                        options={positions.map((p) => ({ value: p.nameTh, label: p.nameTh }))}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, "shiftId"]} noStyle>
                      <Select
                        placeholder="กะ"
                        loading={shiftsQuery.isLoading}
                        options={shifts.map((s) => ({
                          value: s.id,
                          label: `${s.name} · ${s.startTime}-${s.endTime}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, "headcount"]} noStyle>
                      <InputNumber min={1} max={500} placeholder="คน" style={{ width: "100%" }} />
                    </Form.Item>
                    <Button
                      aria-label="ลบแถว"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>
                  เพิ่มความต้องการ
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item label="หมายเหตุ" name="note">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
