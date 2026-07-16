"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Switch } from "antd";

import type {
  CreateTireClassificationRequest,
  TireClassification,
} from "@/types/tire-classifications";
import styles from "@/components/masters/shared/master-page.module.css";

type TireClassificationFormValues = {
  code: string;
  name: string;
  description?: string;
  defaultPricePerKg?: number | null;
  isActive: boolean;
};

type TireClassificationFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialClassification?: TireClassification | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTireClassificationRequest) => void;
};

export default function TireClassificationFormModal({
  open,
  mode,
  initialClassification,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: TireClassificationFormModalProps) {
  const [form] = Form.useForm<TireClassificationFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialClassification) {
      form.setFieldsValue({
        code: initialClassification.classificationCode,
        name: initialClassification.classificationName,
        description: initialClassification.description,
        defaultPricePerKg: Number(initialClassification.defaultPricePerKg),
        isActive: initialClassification.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      defaultPricePerKg: 0,
      isActive: true,
    });
  }, [open, mode, initialClassification, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      defaultPricePerKg:
        values.defaultPricePerKg === undefined ||
        values.defaultPricePerKg === null
          ? 0
          : values.defaultPricePerKg,
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
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode
              ? "CREATE TIRE CLASSIFICATION"
              : "EDIT TIRE CLASSIFICATION"}
          </div>

          <h2>
            {isCreateMode
              ? "เพิ่มประเภท/กลุ่มยาง"
              : "แก้ไขประเภท/กลุ่มยาง"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกประเภท/กลุ่มยางรถยนต์ใช้แล้ว"
              : "แก้ไขรายละเอียดและราคารับซื้อมาตรฐาน"}
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
            <strong>ข้อมูลประเภท/กลุ่มยาง</strong>
            <span>ระบุรหัส ชื่อ และราคารับซื้อต่อกิโลกรัม</span>
          </div>
        </div>

        <Form.Item
          label="รหัส"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัส" },
            { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น PASSENGER, TRUCK"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อ"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อ" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น ยางนั่ง"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ราคาต่อกก."
          name="defaultPricePerKg"
          rules={[
            { required: true, message: "กรุณากรอกราคาต่อกก." },
            {
              type: "number",
              min: 0,
              message: "ราคาต้องไม่ติดลบ",
            },
          ]}
        >
          <InputNumber
            size="large"
            min={0}
            step={0.0001}
            style={{ width: "100%" }}
            placeholder="เช่น 12.5"
          />
        </Form.Item>

        <Form.Item
          label="รายละเอียด"
          name="description"
          rules={[
            { max: 500, message: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร" },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="เช่น ยางรถยนต์นั่งส่วนบุคคล"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกประเภทนี้ในเอกสารได้</span>
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
