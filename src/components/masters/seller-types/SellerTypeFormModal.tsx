"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type { CreateSellerTypeRequest, SellerType } from "@/types/seller-types";
import styles from "@/components/masters/shared/master-page.module.css";

type SellerTypeFormValues = {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type SellerTypeFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialSellerType?: SellerType | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateSellerTypeRequest) => void;
};

export default function SellerTypeFormModal({
  open,
  mode,
  initialSellerType,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: SellerTypeFormModalProps) {
  const [form] = Form.useForm<SellerTypeFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialSellerType) {
      form.setFieldsValue({
        code: initialSellerType.sellerTypeCode,
        name: initialSellerType.sellerTypeName,
        description: initialSellerType.description,
        isActive: initialSellerType.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
  }, [open, mode, initialSellerType, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
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
            {isCreateMode ? "CREATE SELLER TYPE" : "EDIT SELLER TYPE"}
          </div>

          <h2>
            {isCreateMode ? "เพิ่มประเภทผู้ขาย" : "แก้ไขประเภทผู้ขาย"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกประเภทผู้ขายใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดประเภทผู้ขายและสถานะการใช้งาน"}
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
            <strong>ข้อมูลประเภทผู้ขาย</strong>
            <span>ระบุรหัส ชื่อ และรายละเอียด</span>
          </div>
        </div>

        <Form.Item
          label="รหัสประเภท"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสประเภท" },
            { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น INDIVIDUAL, SHOP"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อประเภท"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อประเภท" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น บุคคลทั่วไป"
            autoComplete="off"
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
            placeholder="เช่น ผู้ขายยางที่เป็นบุคคลธรรมดา"
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
