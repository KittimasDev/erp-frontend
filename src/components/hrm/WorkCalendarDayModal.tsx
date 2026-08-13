"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";

import { useMarkHolidayMutation } from "@/hooks/shifts/useShiftMutations";
import {
  WORK_CALENDAR_DAY_TYPE_OPTIONS,
  type WorkCalendarDay,
} from "@/types/shifts";

type Props = {
  open: boolean;
  date: string;
  /** มีค่าเมื่อวันนั้นถูกกดหยุดไว้แล้ว = แก้ไข */
  holiday?: WorkCalendarDay;
  onClose: () => void;
};

type FormValues = {
  dayType: string;
  name: string;
  note?: string;
};

/** กดหยุดวันในปฏิทิน — เคสหลักคือวันหยุดซ่อมเครื่อง */
export default function WorkCalendarDayModal({
  open,
  date,
  holiday,
  onClose,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const markMutation = useMarkHolidayMutation();

  useEffect(() => {
    if (!open) {
      return;
    }
    form.setFieldsValue({
      dayType: holiday?.dayType ?? "MAINTENANCE",
      name: holiday?.name ?? "",
      note: holiday?.note,
    });
  }, [open, holiday, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      await markMutation.mutateAsync({
        date,
        dayType: values.dayType,
        name: values.name.trim(),
        note: values.note || undefined,
      });
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={`${holiday ? "แก้ไขวันหยุด" : "กดหยุดวันนี้"} — ${dayjs(date).format("DD/MM/YYYY")}`}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={markMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
      centered
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void handleSubmit(values)}
      >
        <Form.Item
          name="dayType"
          label="ประเภท"
          rules={[{ required: true, message: "เลือกประเภท" }]}
        >
          <Select options={WORK_CALENDAR_DAY_TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="name"
          label="เหตุผล"
          rules={[{ required: true, message: "ระบุเหตุผลที่หยุด" }]}
        >
          <Input placeholder="เช่น หยุดซ่อมเครื่องอัดรีด" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="note"
          label="หมายเหตุ"
          extra="วันที่กดหยุดไว้จะไม่คิดสายให้พนักงาน แต่ยังกดเข้า-ออกงานได้ปกติ"
        >
          <Input.TextArea rows={2} placeholder="เช่น ทีมซ่อมบำรุงเข้าปกติ" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
