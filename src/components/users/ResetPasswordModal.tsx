"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/useT";
import { Form, Input, Modal } from "antd";
import { KeyOutlined } from "@ant-design/icons";

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_MESSAGE,
  PASSWORD_PLACEHOLDER,
} from "@/lib/user/password-policy";
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
  const t = useT();
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
      okText={t("รีเซ็ตรหัสผ่าน")}
      cancelText={t("ยกเลิก")}
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
          <h2>{t("รีเซ็ตรหัสผ่าน")}</h2>
          <p>
            {t("ตั้งรหัสผ่านใหม่ให้ผู้ใช้")}{" "}
            <strong>{username ?? "-"}</strong>
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false} className={styles.form}>
        <Form.Item
          label={t("รหัสผ่านใหม่")}
          name="newPassword"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสผ่านใหม่") },
            { min: PASSWORD_MIN_LENGTH, message: t(PASSWORD_MIN_MESSAGE) },
          ]}
        >
          <Input.Password placeholder={t(PASSWORD_PLACEHOLDER)} />
        </Form.Item>
        <Form.Item
          label={t("ยืนยันรหัสผ่าน")}
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: t("กรุณายืนยันรหัสผ่าน") },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t("รหัสผ่านไม่ตรงกัน")));
              },
            }),
          ]}
        >
          <Input.Password placeholder={t("พิมพ์รหัสผ่านอีกครั้ง")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
