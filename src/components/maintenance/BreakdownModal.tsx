"use client";

import { Alert, DatePicker, Form, Input, Modal, Select, Switch } from "antd";
import dayjs from "dayjs";

import { useEquipmentQuery, useReportBreakdownMutation } from "@/hooks/maintenance/useMaintenance";
import { useT } from "@/lib/i18n/useT";
import { PRIORITY_OPTIONS } from "@/types/maintenance";

type FormValues = {
  equipmentId: string;
  description: string;
  priority: string;
  reportedAt: dayjs.Dayjs;
  stopsEquipment: boolean;
};

type Props = { equipmentId?: string; onClose: () => void };

/** แจ้งเสีย: สร้างใบสั่งงานซ่อม (CM) + เปิด Downtime แบบไม่ได้วางแผนในคราวเดียว แล้วแจ้งทีมซ่อมบำรุง */
export default function BreakdownModal({ equipmentId, onClose }: Props) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const equipmentQuery = useEquipmentQuery({ status: "ACTIVE" });
  const report = useReportBreakdownMutation();

  return (
    <Modal
      open
      title={t("แจ้งเครื่องเสีย")}
      okText={t("แจ้งเสีย")}
      okButtonProps={{ danger: true }}
      cancelText={t("ยกเลิก")}
      confirmLoading={report.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          report.mutate(
            {
              equipmentId: v.equipmentId,
              description: v.description.trim(),
              priority: v.priority,
              reportedAt: v.reportedAt.toISOString(),
              stopsEquipment: v.stopsEquipment,
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ equipmentId, priority: "HIGH", reportedAt: dayjs(), stopsEquipment: true }}
      >
        <Form.Item name="equipmentId" label={t("เครื่องจักร")} rules={[{ required: true, message: t("เลือกเครื่อง") }]}>
          <Select
            showSearch
            optionFilterProp="label"
            disabled={Boolean(equipmentId)}
            loading={equipmentQuery.isLoading}
            options={(equipmentQuery.data?.data ?? []).map((e) => ({
              value: e.id,
              label: `${e.equipmentCode} — ${e.name}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="description" label={t("อาการ / สิ่งที่พบ")} rules={[{ required: true, whitespace: true, message: t("บอกอาการ") }]}>
          <Input.TextArea rows={3} maxLength={4000} placeholder={t("เช่น ปั๊มไม่จ่ายน้ำมัน มีเสียงดังผิดปกติ")} />
        </Form.Item>
        <Form.Item name="reportedAt" label={t("เวลาที่เสีย/พบอาการ")} rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" disabledDate={(d) => d.isAfter(dayjs())} />
        </Form.Item>
        <Form.Item name="priority" label={t("ความเร่งด่วน")}>
          <Select options={PRIORITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
        </Form.Item>
        <Form.Item name="stopsEquipment" label={t("ต้องหยุดเครื่อง (เปิด Downtime)")} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Alert
          type="info"
          showIcon
          title={t("ระบบสร้างใบสั่งงานซ่อม (CM) ให้ทันที และเริ่มนับ Downtime แบบไม่ได้วางแผนจากเวลาที่เสีย — เมื่อช่างกดเริ่มงานจะแยก “รอซ่อม” กับ “เวลาซ่อม” ให้เอง")}
        />
      </Form>
    </Modal>
  );
}
