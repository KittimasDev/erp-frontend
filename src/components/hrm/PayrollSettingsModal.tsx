"use client";

import { Form, InputNumber, Modal, Select, Spin, Switch } from "antd";

import {
  usePayrollSettingsQuery,
  useUpdatePayrollSettingsMutation,
} from "@/hooks/payroll/usePayroll";
import { LEAVE_TYPE_OPTIONS, type PayrollSettings } from "@/types/payroll";

type Props = { open: boolean; onClose: () => void };

function SettingsForm({
  initial,
  onClose,
}: {
  initial: PayrollSettings;
  onClose: () => void;
}) {
  const [form] = Form.useForm<PayrollSettings>();
  const update = useUpdatePayrollSettingsMutation();
  return (
    <Modal
      open
      title="ตั้งค่าคำนวณเงินเดือน"
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={update.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((values) =>
          update.mutate(values, { onSuccess: onClose }),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={initial}>
        <Form.Item
          name="daysPerMonth"
          label="วันต่อเดือน (หารเงินเดือนเป็นค่าแรงต่อวัน)"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={31} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="socialSecurityRatePercent"
          label="อัตราประกันสังคม (%)"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={20} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="socialSecurityMaxBase"
          label="ฐานค่าจ้างสูงสุดที่คิดประกันสังคม (บาท)"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="socialSecurityMinBase"
          label="ฐานค่าจ้างต่ำสุดที่คิดประกันสังคม (บาท)"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="unpaidLeaveTypes"
          label="ประเภทลาที่ไม่รับเงิน (หักเฉพาะพนักงานรายเดือน)"
        >
          <Select mode="multiple" options={LEAVE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="payHolidaysForDaily"
          label="ลูกจ้างรายวันได้ค่าจ้างวันหยุดบริษัท"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** ตั้งค่าคำนวณเงินเดือน — มีผลกับการคำนวณ/คำนวณใหม่หลังจากนี้ (งวดที่ปิดแล้วไม่เปลี่ยน) */
export default function PayrollSettingsModal({ open, onClose }: Props) {
  const query = usePayrollSettingsQuery(open);
  if (!open) return null;
  if (!query.data) {
    return (
      <Modal open footer={null} onCancel={onClose} title="ตั้งค่าคำนวณเงินเดือน">
        <Spin />
      </Modal>
    );
  }
  return <SettingsForm initial={query.data.data} onClose={onClose} />;
}
