"use client";

import { DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";

import { useEndDowntimeMutation, useRecordDowntimeMutation } from "@/hooks/maintenance/useMaintenance";
import { ROOT_CAUSE_OPTIONS, type EquipmentDowntime } from "@/types/maintenance";

type RecordValues = {
  startAt: dayjs.Dayjs;
  reason: string;
  category: string;
  rootCauseCategory?: string;
};

/** เปิด Downtime ด้วยมือ (เช่น หยุดตามแผน/Shutdown) — แจ้งเสียใช้ปุ่ม "แจ้งเสีย" แทน */
export function RecordDowntimeModal({ equipmentId, onClose }: { equipmentId: string; onClose: () => void }) {
  const [form] = Form.useForm<RecordValues>();
  const record = useRecordDowntimeMutation();
  return (
    <Modal
      open
      title="บันทึก Downtime"
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={record.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          record.mutate(
            {
              equipmentId,
              body: {
                startAt: v.startAt.toISOString(),
                reason: v.reason.trim(),
                category: v.category,
                rootCauseCategory: v.rootCauseCategory,
              },
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form form={form} layout="vertical" initialValues={{ startAt: dayjs(), category: "UNPLANNED" }}>
        <Form.Item name="category" label="ประเภท">
          <Select
            options={[
              { value: "PLANNED", label: "หยุดตามแผน (Shutdown / PM)" },
              { value: "UNPLANNED", label: "หยุดไม่ได้วางแผน (Breakdown)" },
            ]}
          />
        </Form.Item>
        <Form.Item name="startAt" label="เวลาเริ่มหยุด" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" disabledDate={(d) => d.isAfter(dayjs())} />
        </Form.Item>
        <Form.Item name="reason" label="เหตุผล" rules={[{ required: true, whitespace: true, message: "ใส่เหตุผล" }]}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Form.Item name="rootCauseCategory" label="กลุ่มสาเหตุ (ถ้าทราบ)">
          <Select allowClear options={[...ROOT_CAUSE_OPTIONS]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

type EndValues = {
  repairStartedAt?: dayjs.Dayjs;
  endAt: dayjs.Dayjs;
  rootCauseCategory?: string;
  rootCause?: string;
};

/** ปิด Downtime: ระบุเวลาเริ่มซ่อมเพื่อแยก Breakdown/รอซ่อม ออกจาก Repair Time + สาเหตุ */
export function EndDowntimeModal({
  equipmentId,
  downtime,
  onClose,
}: {
  equipmentId: string;
  downtime: EquipmentDowntime;
  onClose: () => void;
}) {
  const [form] = Form.useForm<EndValues>();
  const end = useEndDowntimeMutation();
  return (
    <Modal
      open
      title="ปิด Downtime"
      okText="ปิด Downtime"
      cancelText="ยกเลิก"
      confirmLoading={end.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          end.mutate(
            {
              equipmentId,
              downtimeId: downtime.id,
              body: {
                endAt: v.endAt.toISOString(),
                repairStartedAt: v.repairStartedAt?.toISOString(),
                rootCauseCategory: v.rootCauseCategory,
                rootCause: v.rootCause,
              },
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <p style={{ marginTop: 0 }}>เริ่มหยุด {dayjs(downtime.startAt).format("DD/MM/YYYY HH:mm")} — {downtime.reason}</p>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          endAt: dayjs(),
          repairStartedAt: downtime.repairStartedAt ? dayjs(downtime.repairStartedAt) : undefined,
          rootCauseCategory: downtime.rootCauseCategory,
          rootCause: downtime.rootCause,
        }}
      >
        <Form.Item name="repairStartedAt" label="เวลาเริ่มซ่อมจริง" extra="ไม่ระบุ = นับทั้งช่วงเป็น “รอซ่อม”">
          <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>
        <Form.Item name="endAt" label="เวลาเครื่องกลับมาใช้งาน" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>
        <Form.Item name="rootCauseCategory" label="กลุ่มสาเหตุ (Root Cause)">
          <Select allowClear options={[...ROOT_CAUSE_OPTIONS]} />
        </Form.Item>
        <Form.Item name="rootCause" label="วิเคราะห์สาเหตุ">
          <Input.TextArea rows={2} maxLength={4000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
