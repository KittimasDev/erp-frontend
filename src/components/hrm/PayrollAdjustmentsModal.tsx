"use client";

import { Button, Form, Input, InputNumber, Modal, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useSetPayrollAdjustmentsMutation } from "@/hooks/payroll/usePayroll";
import type { PayrollAdjustmentInput, PayrollSlip } from "@/types/payroll";

type Props = {
  runId: string;
  slip: PayrollSlip | null;
  onClose: () => void;
};

type FormValues = { items: Partial<PayrollAdjustmentInput>[] };

/** รายการปรับรายคน: เบี้ยขยัน / ค่ากะ / ค่ากะกลางคืน / โบนัส (รายได้) หรือเงินหักอื่น ๆ — แทนที่ทั้งชุด */
export default function PayrollAdjustmentsModal({ runId, slip, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const mutation = useSetPayrollAdjustmentsMutation();
  if (!slip) return null;
  return (
    <Modal
      open
      title={`รายการปรับ — ${slip.displayName}`}
      okText="บันทึก"
      cancelText="ยกเลิก"
      width={640}
      confirmLoading={mutation.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((values) =>
          mutation.mutate(
            {
              id: runId,
              userId: slip.userId,
              items: (values.items ?? []) as PayrollAdjustmentInput[],
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <p style={{ color: "#8a94a6", marginTop: 0 }}>
        ใส่เบี้ยขยัน ค่ากะ ค่ากะกลางคืน โบนัส หรือเงินหักอื่น ๆ ที่ระบบยังไม่คำนวณให้เอง — ระบบรวมเข้ายอดสุทธิ (เงินเพิ่มไม่นับเข้าฐานประกันสังคม)
      </p>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          items: slip.adjustments.map((a) => ({
            kind: a.kind,
            label: a.label,
            amount: a.amount,
          })),
        }}
      >
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <div key={field.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Form.Item
                    name={[field.name, "kind"]}
                    rules={[{ required: true, message: "เลือกประเภท" }]}
                    style={{ width: 130 }}
                  >
                    <Select
                      placeholder="ประเภท"
                      options={[
                        { value: "EARNING", label: "รายได้ (+)" },
                        { value: "DEDUCTION", label: "รายการหัก (−)" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, "label"]}
                    rules={[{ required: true, whitespace: true, message: "ใส่ชื่อรายการ" }]}
                    style={{ flex: 1 }}
                  >
                    <Input placeholder="เช่น เบี้ยขยัน, ค่ากะกลางคืน" maxLength={200} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, "amount"]}
                    rules={[
                      { required: true, message: "ใส่จำนวนเงิน" },
                      { type: "number", min: 0.01, message: "ใส่จำนวนบวก (ถ้าเป็นรายการหัก ให้เลือกประเภท “รายการหัก”)" },
                      { type: "number", max: 9999999, message: "จำนวนเงินมากเกินไป" },
                    ]}
                    style={{ width: 130 }}
                  >
                    <InputNumber precision={2} style={{ width: "100%" }} placeholder="บาท" />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                    aria-label="ลบรายการ"
                  />
                </div>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ kind: "EARNING" })} block>
                เพิ่มรายการ
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
