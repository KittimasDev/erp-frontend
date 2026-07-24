"use client";

import { useEffect } from "react";
import { Form, Input, Modal } from "antd";

import type { CreateRoleRequest } from "@/types/users";
import styles from "@/components/masters/shared/master-page.module.css";

type RoleFormModalProps = {
  open: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateRoleRequest) => void;
};

export default function RoleFormModal({
  open,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: RoleFormModalProps) {
  const [form] = Form.useForm<CreateRoleRequest>();

  useEffect(() => {
    if (!open) {
      return;
    }
    form.setFieldsValue({ roleCode: "", roleName: "", description: "" });
  }, [open, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      roleCode: values.roleCode.trim().toUpperCase(),
      roleName: values.roleName.trim(),
      description: values.description?.trim() || undefined,
    });
  };

  return (
    <Modal
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="บันทึก"
      cancelText="ยกเลิก"
      destroyOnHidden
      width={520}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>+</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>CREATE ROLE</div>
          <h2>สร้างบทบาทใหม่</h2>
          <p>ตั้งชื่อและรหัสบทบาท แล้วค่อยกำหนดสิทธิ์ในตารางด้านล่าง</p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="รหัสบทบาท"
          name="roleCode"
          rules={[
            { required: true, message: "กรุณากรอกรหัสบทบาท" },
            { max: 100 },
            {
              pattern: /^[A-Za-z0-9_]+$/,
              message: "ใช้ตัวอักษร A-Z, ตัวเลข และ _ เท่านั้น",
            },
          ]}
        >
          <Input placeholder="เช่น QUALITY_INSPECTOR" />
        </Form.Item>

        <Form.Item
          label="ชื่อบทบาท"
          name="roleName"
          rules={[
            { required: true, message: "กรุณากรอกชื่อบทบาท" },
            { max: 255 },
          ]}
        >
          <Input placeholder="เช่น ผู้ตรวจสอบคุณภาพ" />
        </Form.Item>

        <Form.Item label="คำอธิบาย" name="description">
          <Input.TextArea
            rows={3}
            placeholder="อธิบายหน้าที่ของบทบาทนี้ (ไม่บังคับ)"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
