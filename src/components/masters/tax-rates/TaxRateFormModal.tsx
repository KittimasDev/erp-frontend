"use client";

import { useT } from "@/lib/i18n/useT";
import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Select, Switch } from "antd";

import type { CreateTaxRateRequest, TaxRate } from "@/types/tax-rates";
import styles from "@/components/masters/shared/master-page.module.css";

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
  const t = useT();
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
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? t("บันทึก") : t("อัปเดต")}
      cancelText={t("ยกเลิก")}
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
            {isCreateMode ? t("เพิ่มอัตราภาษี") : t("แก้ไขอัตราภาษี")}
          </h2>

          <p>
            {isCreateMode
              ? t("กรอกอัตราภาษีใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ")
              : t("แก้ไขรายละเอียดอัตราภาษีและสถานะการใช้งาน")}
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
            <strong>{t("ข้อมูลอัตราภาษี")}</strong>
            <span>{t("ระบุรหัส ชื่อ อัตรา และประเภทภาษี")}</span>
          </div>
        </div>

        <Form.Item
          label={t("รหัสภาษี")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสภาษี") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น VAT7, NOVAT")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อภาษี")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อภาษี") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น ภาษีมูลค่าเพิ่ม 7%")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("อัตรา (%)")}
          name="rate"
          rules={[
            { required: true, message: t("กรุณากรอกอัตราภาษี") },
            {
              type: "number",
              min: 0,
              message: t("อัตราภาษีต้องไม่ติดลบ"),
            },
          ]}
        >
          <InputNumber
            size="large"
            min={0}
            max={100}
            step={0.01}
            style={{ width: "100%" }}
            placeholder={t("เช่น 7")}
          />
        </Form.Item>

        <Form.Item label={t("ประเภทภาษี")} name="taxType">
          <Select
            allowClear
            size="large"
            placeholder={t("เลือกประเภท")}
            options={TAX_TYPE_OPTIONS}
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("เปิดใช้งานเพื่อเลือกอัตราภาษีนี้ในเอกสารได้")}</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
