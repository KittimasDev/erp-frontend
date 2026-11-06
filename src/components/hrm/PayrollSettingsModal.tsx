"use client";

import { Divider, Form, InputNumber, Modal, Select, Spin, Switch } from "antd";

import {
  usePayrollSettingsQuery,
  useUpdatePayrollSettingsMutation,
} from "@/hooks/payroll/usePayroll";
import { useT } from "@/lib/i18n/useT";
import { LEAVE_TYPE_OPTIONS, type PayrollSettings } from "@/types/payroll";

type Props = { open: boolean; onClose: () => void };

function SettingsForm({
  initial,
  onClose,
}: {
  initial: PayrollSettings;
  onClose: () => void;
}) {
  const t = useT();
  const [form] = Form.useForm<PayrollSettings>();
  const update = useUpdatePayrollSettingsMutation();
  return (
    <Modal
      open
      title={t("ตั้งค่าคำนวณเงินเดือน")}
      okText={t("บันทึก")}
      cancelText={t("ยกเลิก")}
      confirmLoading={update.isPending}
      width={640}
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
          label={t("วันต่อเดือน (หารเงินเดือนเป็นค่าแรงต่อวัน)")}
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={31} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="socialSecurityRatePercent"
          label={t("อัตราประกันสังคม (%)")}
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={20} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="socialSecurityMaxBase"
          label={t("ฐานค่าจ้างสูงสุดที่คิดประกันสังคม (บาท)")}
          rules={[{ required: true }]}
        >
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="socialSecurityMinBase"
          label={t("ฐานค่าจ้างต่ำสุดที่คิดประกันสังคม (บาท)")}
          rules={[{ required: true }]}
        >
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="unpaidLeaveTypes"
          label={t("ประเภทลาที่ไม่รับเงิน (หักเฉพาะพนักงานรายเดือน)")}
        >
          <Select
            mode="multiple"
            options={LEAVE_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
          />
        </Form.Item>
        <Form.Item
          name="payHolidaysForDaily"
          label={t("ลูกจ้างรายวันได้ค่าจ้างวันหยุดบริษัท")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Divider titlePlacement="left">{t("กองทุน (สำรองเลี้ยงชีพ)")}</Divider>
        <Form.Item
          name="providentFundOptions"
          label={t("ตัวเลือก % ที่พนักงานเลือกหักได้ (พิมพ์ตัวเลขแล้วกด Enter)")}
          rules={[{ required: true, message: t("ใส่อย่างน้อย 1 ค่า") }]}
        >
          <Select
            mode="tags"
            tokenSeparators={[","]}
            onChange={(vals: (string | number)[]) =>
              form.setFieldValue(
                "providentFundOptions",
                vals.map(Number).filter((n) => Number.isFinite(n)),
              )
            }
          />
        </Form.Item>
        <Form.Item
          name="providentFundMaxPercent"
          label={t("% สูงสุดที่เลือกได้ / นำไปลดหย่อนภาษีได้")}
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="providentFundEmployerPercent"
          label={t("นายจ้างสมทบ (% ของเงินเดือน ให้เฉพาะคนที่เข้ากองทุน)")}
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
        </Form.Item>

        <Divider titlePlacement="left">{t("ภาษีหัก ณ ที่จ่าย")}</Divider>
        <Form.Item
          name="taxEnabled"
          label={t("คิดภาษีหัก ณ ที่จ่าย (ประมาณการเงินได้ทั้งปี = รายได้งวด × 12)")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item name="taxExpenseRatePercent" label={t("ค่าใช้จ่ายหักได้ (%)")} rules={[{ required: true }]}>
          <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="taxExpenseCap" label={t("เพดานค่าใช้จ่าย/ปี (บาท)")} rules={[{ required: true }]}>
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="taxPersonalAllowance" label={t("ลดหย่อนส่วนตัว/ปี (บาท)")} rules={[{ required: true }]}>
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.List name="taxBrackets">
          {(fields) => (
            <>
              <div style={{ marginBottom: 8 }}>
                {t("ขั้นบันไดภาษี (เงินได้สุทธิรายปีไม่เกิน → อัตรา %) · ขั้นสุดท้ายเว้นว่าง = ไม่จำกัด")}
              </div>
              {fields.map((field) => (
                <div key={field.key} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Form.Item name={[field.name, "upTo"]} style={{ flex: 1, margin: 0 }}>
                    <InputNumber min={0} precision={0} placeholder={t("ไม่จำกัด")} style={{ width: "100%" }} prefix={t("ไม่เกิน")} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, "ratePercent"]}
                    rules={[{ required: true }]}
                    style={{ width: 140, margin: 0 }}
                  >
                    <InputNumber min={0} max={100} precision={2} suffix="%" style={{ width: "100%" }} />
                  </Form.Item>
                </div>
              ))}
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

/** ตั้งค่าคำนวณเงินเดือน — มีผลกับการคำนวณ/คำนวณใหม่หลังจากนี้ (งวดที่ปิดแล้วไม่เปลี่ยน) */
export default function PayrollSettingsModal({ open, onClose }: Props) {
  const t = useT();
  const query = usePayrollSettingsQuery(open);
  if (!open) return null;
  if (!query.data) {
    return (
      <Modal open footer={null} onCancel={onClose} title={t("ตั้งค่าคำนวณเงินเดือน")}>
        <Spin />
      </Modal>
    );
  }
  return <SettingsForm initial={query.data.data} onClose={onClose} />;
}
