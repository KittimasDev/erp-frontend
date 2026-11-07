"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/useT";
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
  const t = useT();
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
      okText={t("บันทึก")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      width={520}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>+</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>CREATE ROLE</div>
          <h2>{t("สร้างบทบาทใหม่")}</h2>
          <p>{t("ตั้งชื่อและรหัสบทบาท แล้วค่อยกำหนดสิทธิ์ในตารางด้านล่าง")}</p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label={t("รหัสบทบาท")}
          name="roleCode"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสบทบาท") },
            { max: 100 },
            {
              pattern: /^[A-Za-z0-9_]+$/,
              message: t("ใช้ตัวอักษร A-Z, ตัวเลข และ _ เท่านั้น"),
            },
          ]}
        >
          <Input placeholder={t("เช่น QUALITY_INSPECTOR")} />
        </Form.Item>

        <Form.Item
          label={t("ชื่อบทบาท")}
          name="roleName"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อบทบาท") },
            { max: 255 },
          ]}
        >
          <Input placeholder={t("เช่น ผู้ตรวจสอบคุณภาพ")} />
        </Form.Item>

        <Form.Item label={t("คำอธิบาย")} name="description">
          <Input.TextArea
            rows={3}
            placeholder={t("อธิบายหน้าที่ของบทบาทนี้ (ไม่บังคับ)")}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
