"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Switch } from "antd";

import type { CreateVendorRequest, Vendor } from "@/types/vendors";
import styles from "./VendorFormModal.module.css";

type VendorFormValues = {
  code: string;
  name: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  defaultCreditDays: number;
  isActive: boolean;
};

type VendorFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialVendor?: Vendor | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateVendorRequest) => void;
};

export default function VendorFormModal({
  open,
  mode,
  initialVendor,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: VendorFormModalProps) {
  const [form] = Form.useForm<VendorFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialVendor) {
      form.setFieldsValue({
        code: initialVendor.creditorCode,
        name: initialVendor.nameTh,
        taxId: initialVendor.taxId,
        address: initialVendor.address,
        contactName: initialVendor.contactName,
        contactPhone: initialVendor.contactPhone,
        defaultCreditDays: initialVendor.defaultCreditDays ?? 0,
        isActive: initialVendor.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      taxId: "",
      address: "",
      contactName: "",
      contactPhone: "",
      defaultCreditDays: 0,
      isActive: true,
    });
  }, [open, mode, initialVendor, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      taxId: values.taxId?.trim() || undefined,
      address: values.address?.trim() || undefined,
      contactName: values.contactName?.trim() || undefined,
      contactPhone: values.contactPhone?.trim() || undefined,
      defaultCreditDays: values.defaultCreditDays ?? 0,
      isActive: values.isActive,
    });
  };

  const isCreateMode = mode === "create";

  return (
    <Modal
      className={styles.vendorModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
      destroyOnHidden
      width={680}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>
          {isCreateMode ? "+" : "✎"}
        </div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE VENDOR" : "EDIT VENDOR"}
          </div>

          <h2>{isCreateMode ? "เพิ่มผู้ขาย" : "แก้ไขผู้ขาย"}</h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลผู้ขายใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดผู้ขายและสถานะการใช้งาน"}
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
            <strong>ข้อมูลผู้ขาย</strong>
            <span>ระบุรหัส ชื่อ และข้อมูลติดต่อ</span>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Form.Item
            label="รหัสผู้ขาย"
            name="code"
            rules={[
              { required: true, message: "กรุณากรอกรหัสผู้ขาย" },
              { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
            ]}
          >
            <Input
              size="large"
              placeholder="เช่น SUP-00001"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label="เลขผู้เสียภาษี"
            name="taxId"
            rules={[{ max: 50, message: "ต้องไม่เกิน 50 ตัวอักษร" }]}
          >
            <Input
              size="large"
              placeholder="เช่น 0123456789012"
              autoComplete="off"
            />
          </Form.Item>
        </div>

        <Form.Item
          label="ชื่อผู้ขาย"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อผู้ขาย" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item label="ที่อยู่" name="address">
          <Input.TextArea
            rows={2}
            placeholder="ที่อยู่ผู้ขาย"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.formGrid}>
          <Form.Item
            label="ชื่อผู้ติดต่อ"
            name="contactName"
            rules={[{ max: 255, message: "ต้องไม่เกิน 255 ตัวอักษร" }]}
          >
            <Input size="large" placeholder="เช่น คุณสมชาย ใจดี" />
          </Form.Item>

          <Form.Item
            label="เบอร์ติดต่อ"
            name="contactPhone"
            rules={[{ max: 50, message: "ต้องไม่เกิน 50 ตัวอักษร" }]}
          >
            <Input size="large" placeholder="เช่น 0812345678" />
          </Form.Item>
        </div>

        <Form.Item
          label="วันเครดิตเริ่มต้น"
          name="defaultCreditDays"
          rules={[
            { required: true, message: "กรุณาระบุวันเครดิต" },
            {
              type: "number",
              min: 0,
              message: "ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป",
            },
          ]}
        >
          <InputNumber min={0} style={{ width: "100%" }} size="large" />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>
                เปิดใช้งานเพื่อให้เลือกผู้ขายนี้ในใบสั่งซื้อและเอกสารจัดซื้อได้
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
