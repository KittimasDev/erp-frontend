"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Switch } from "antd";

import type {
  CreatePaymentTermRequest,
  PaymentTerm,
} from "@/types/payment-terms";
import styles from "@/components/masters/shared/master-page.module.css";

type PaymentTermFormValues = {
  code: string;
  name: string;
  creditDays: number;
  isActive: boolean;
};

type PaymentTermFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialPaymentTerm?: PaymentTerm | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreatePaymentTermRequest) => void;
};

export default function PaymentTermFormModal({
  open,
  mode,
  initialPaymentTerm,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: PaymentTermFormModalProps) {
  const [form] = Form.useForm<PaymentTermFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialPaymentTerm) {
      form.setFieldsValue({
        code: initialPaymentTerm.code,
        name: initialPaymentTerm.name,
        creditDays: initialPaymentTerm.creditDays ?? 0,
        isActive: initialPaymentTerm.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      creditDays: 0,
      isActive: true,
    });
  }, [open, mode, initialPaymentTerm, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      creditDays: values.creditDays ?? 0,
      isActive: values.isActive,
    });
  };

  const isCreateMode = mode === "create";

  return (
    <Modal
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
      destroyOnHidden
      width={560}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>
          {isCreateMode ? "+" : "✎"}
        </div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE PAYMENT TERM" : "EDIT PAYMENT TERM"}
          </div>

          <h2>
            {isCreateMode
              ? "เพิ่มเงื่อนไขชำระเงิน"
              : "แก้ไขเงื่อนไขชำระเงิน"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกเงื่อนไขการชำระเงินใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดเงื่อนไขและสถานะการใช้งาน"}
          </p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={styles.form}
      >
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>ข้อมูลเงื่อนไข</strong>
            <span>ระบุรหัส ชื่อ และจำนวนวันเครดิต</span>
          </div>
        </div>

        <Form.Item
          label="รหัสเงื่อนไข"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสเงื่อนไข" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น CREDIT_30, CASH"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อเงื่อนไข"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อเงื่อนไข" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น เครดิต 30 วัน"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="วันเครดิต"
          name="creditDays"
          rules={[
            { required: true, message: "กรุณากรอกจำนวนวันเครดิต" },
            {
              type: "number",
              min: 0,
              message: "วันเครดิตต้องไม่ติดลบ",
            },
          ]}
        >
          <InputNumber
            size="large"
            min={0}
            precision={0}
            style={{ width: "100%" }}
            placeholder="เช่น 30"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>
                เปิดใช้งานเพื่อเลือกเงื่อนไขนี้ในเอกสารจัดซื้อและขายได้
              </span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
