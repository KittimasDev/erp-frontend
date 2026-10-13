"use client";

import { useEffect } from "react";
import { Alert, Form, InputNumber, Modal } from "antd";

import {
  useOtSettingsQuery,
  useUpdateOtSettingsMutation,
} from "@/hooks/overtime/useOtSettings";
import type { OtSettings } from "@/types/overtime";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Field = { name: keyof OtSettings; label: string; hint?: string; max?: number };

const FORMULA: Field[] = [
  { name: "daysPerMonth", label: "วันต่อเดือน (หารเงินเดือน)", hint: "เงินเดือน ÷ ค่านี้ ÷ ชั่วโมงต่อวัน = ค่าแรงต่อชั่วโมง", max: 31 },
  { name: "hoursPerDay", label: "ชั่วโมงทำงานปกติต่อวัน", hint: "ใช้แยก \"ทำงานวันหยุด\" ออกจาก \"OT วันหยุด\" ด้วย", max: 24 },
];

const MULTIPLIERS: Array<{ title: string; fields: Field[] }> = [
  { title: "วันปกติ", fields: [{ name: "normalMultiplier", label: "OT วันปกติ" }] },
  {
    title: "วันหยุด",
    fields: [
      { name: "holidayWorkMonthlyMultiplier", label: "ทำงานวันหยุด · รายเดือน" },
      { name: "holidayWorkDailyMultiplier", label: "ทำงานวันหยุด · รายวัน" },
      { name: "holidayOtMultiplier", label: "OT วันหยุด (เกินชั่วโมงปกติ)" },
    ],
  },
  {
    title: "ช่วง Shutdown",
    fields: [
      { name: "shutdownWorkMonthlyMultiplier", label: "ทำงาน Shutdown · รายเดือน" },
      { name: "shutdownWorkDailyMultiplier", label: "ทำงาน Shutdown · รายวัน" },
      { name: "shutdownOtMultiplier", label: "OT Shutdown (เกินชั่วโมงปกติ)" },
    ],
  },
];

/** ตั้งค่าอัตรา OT — ตัวคูณทุกช่องแก้ได้ ค่าเริ่มต้นตามกฎหมายคุ้มครองแรงงาน */
export default function OtSettingsModal({ open, onClose }: Props) {
  const [form] = Form.useForm<OtSettings>();
  const query = useOtSettingsQuery(open);
  const update = useUpdateOtSettingsMutation();

  useEffect(() => {
    if (open && query.data?.data) {
      form.setFieldsValue(query.data.data);
    }
  }, [open, query.data, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    update.mutate(values, { onSuccess: onClose });
  };

  const numberInput = (field: Field) => (
    <Form.Item
      key={field.name}
      name={field.name}
      label={field.label}
      extra={field.hint}
      rules={[{ required: true, message: "กรุณากรอก" }]}
    >
      <InputNumber min={0} max={field.max ?? 10} step={0.5} style={{ width: "100%" }} />
    </Form.Item>
  );

  return (
    <Modal
      open={open}
      title="ตั้งค่าอัตรา OT"
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={update.isPending}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      centered
      width={640}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title="มีผลกับคำขอที่อนุมัติหลังจากนี้เท่านั้น"
        description="คำขอที่อนุมัติไปแล้วเก็บยอดที่คำนวณ ณ วันอนุมัติ ไม่ถูกคำนวณใหม่ · ค่าเริ่มต้นตามกฎหมายคุ้มครองแรงงาน (วันปกติ 1.5× · ทำงานวันหยุด รายเดือน 1× / รายวัน 2× · OT วันหยุด 3×)"
      />
      <Form form={form} layout="vertical" requiredMark={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          {FORMULA.map(numberInput)}
        </div>
        {MULTIPLIERS.map((group) => (
          <section key={group.title}>
            <h4 style={{ margin: "4px 0 8px" }}>ตัวคูณ — {group.title}</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${group.fields.length}, 1fr)`,
                gap: "0 16px",
              }}
            >
              {group.fields.map(numberInput)}
            </div>
          </section>
        ))}
      </Form>
    </Modal>
  );
}
