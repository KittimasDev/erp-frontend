"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Select, Switch } from "antd";

import type { CreateTaxRateRequest, TaxRate } from "@/types/tax-rates";
import styles from "./TaxRateFormModal.module.css";

type TaxRateFormValues = {
  code: string;
  name: string;
  rate: number;
  taxType?: string;
  isActive: boolean;
};

type TaxRateFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialTaxRate?: TaxRate | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTaxRateRequest) => void;
};

const TAX_TYPE_OPTIONS = [
  { value: "VAT", label: "VAT" },
  { value: "WHT", label: "WHT" },
  { value: "NONE", label: "NONE" },
];

export default function TaxRateFormModal({
  open,
  mode,
  initialTaxRate,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: TaxRateFormModalProps) {
  const [form] = Form.useForm<TaxRateFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialTaxRate) {
      form.setFieldsValue({
        code: initialTaxRate.code,
        name: initialTaxRate.name,
        rate: Number(initialTaxRate.rate),
        taxType: initialTaxRate.taxType,
        isActive: initialTaxRate.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      rate: 0,
      taxType: "VAT",
      isActive: true,
    });
  }, [open, mode, initialTaxRate, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      rate: values.rate,
      taxType: values.taxType || undefined,
      isActive: values.isActive,
    });
  };

  const isCreateMode = mode === "create";

  return (
    <Modal
      className={styles.unitModal}
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
            {isCreateMode ? "CREATE TAX RATE" : "EDIT TAX RATE"}
          </div>

          <h2>
            {isCreateMode ? "เพิ่มอัตราภาษี" : "แก้ไขอัตราภาษี"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกอัตราภาษีใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดอัตราภาษีและสถานะการใช้งาน"}
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
            <strong>ข้อมูลอัตราภาษี</strong>
            <span>ระบุรหัส ชื่อ อัตรา และประเภทภาษี</span>
          </div>
        </div>

        <Form.Item
          label="รหัสภาษี"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสภาษี" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น VAT7, NOVAT"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อภาษี"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อภาษี" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น ภาษีมูลค่าเพิ่ม 7%"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="อัตรา (%)"
          name="rate"
          rules={[
            { required: true, message: "กรุณากรอกอัตราภาษี" },
            {
              type: "number",
              min: 0,
              message: "อัตราภาษีต้องไม่ติดลบ",
            },
          ]}
        >
          <InputNumber
            size="large"
            min={0}
            max={100}
            step={0.01}
            style={{ width: "100%" }}
            placeholder="เช่น 7"
          />
        </Form.Item>

        <Form.Item label="ประเภทภาษี" name="taxType">
          <Select
            allowClear
            size="large"
            placeholder="เลือกประเภท"
            options={TAX_TYPE_OPTIONS}
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกอัตราภาษีนี้ในเอกสารได้</span>
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
