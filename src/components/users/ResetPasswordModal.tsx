"use client";

import { useEffect } from "react";
import { Form, Input, Modal } from "antd";
import { KeyOutlined } from "@ant-design/icons";

import styles from "@/components/masters/shared/master-page.module.css";

type ResetPasswordFormValues = {
  newPassword: string;
  confirmPassword: string;
};

type ResetPasswordModalProps = {
  open: boolean;
  username?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (newPassword: string) => void;
};

export default function ResetPasswordModal({
  open,
  username,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: ResetPasswordModalProps) {
  const [form] = Form.useForm<ResetPasswordFormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit(values.newPassword);
  };

  return (
    <Modal
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="รีเซ็ตรหัสผ่าน"
      cancelText="ยกเลิก"
      destroyOnHidden
      width={480}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>
          <KeyOutlined />
        </div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>RESET PASSWORD</div>
          <h2>รีเซ็ตรหัสผ่าน</h2>
          <p>
            ตั้งรหัสผ่านใหม่ให้ผู้ใช้{" "}
            <strong>{username ?? "-"}</strong>
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="รหัสผ่านใหม่"
          name="newPassword"
          rules={[
            { required: true, message: "กรุณากรอกรหัสผ่านใหม่" },
            { min: 8, message: "อย่างน้อย 8 ตัวอักษร" },
          ]}
        >
          <Input.Password placeholder="อย่างน้อย 8 ตัวอักษร" />
        </Form.Item>
        <Form.Item
          label="ยืนยันรหัสผ่าน"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "กรุณายืนยันรหัสผ่าน" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("รหัสผ่านไม่ตรงกัน"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="พิมพ์รหัสผ่านอีกครั้ง" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
