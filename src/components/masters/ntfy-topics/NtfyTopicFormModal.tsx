"use client";

import { useT } from "@/lib/i18n/useT";
import { usePartyLabels } from "@/lib/i18n/partyLabels";

import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type { CreateNtfyTopicRequest, NtfyTopic } from "@/types/ntfy-topics";
import styles from "@/components/masters/shared/master-page.module.css";

type NtfyTopicFormValues = {
  topic: string;
  description: string;
  isActive: boolean;
};

type NtfyTopicFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialTopic?: NtfyTopic | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateNtfyTopicRequest) => void;
};

export default function NtfyTopicFormModal({
  open,
  mode,
  initialTopic,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: NtfyTopicFormModalProps) {
  const t = useT();
  const partyLabels = usePartyLabels();
  const [form] = Form.useForm<NtfyTopicFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && initialTopic) {
      form.setFieldsValue({
        topic: initialTopic.topic,
        description: initialTopic.description,
        isActive: initialTopic.isActive,
      });
      return;
    }
    form.setFieldsValue({
      topic: "",
      description: "",
      isActive: true,
    });
  }, [open, mode, initialTopic, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      topic: values.topic.trim(),
      description: values.description.trim(),
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
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE NTFY TOPIC" : "EDIT NTFY TOPIC"}
          </div>
          <h2>
            {isCreateMode ? t("เพิ่มหัวข้อแจ้งเตือน") : t("แก้ไขหัวข้อแจ้งเตือน")}
          </h2>
          <p>
            {isCreateMode
              ? t("ตั้งชื่อ topic และบอกว่าแจ้งเตือนเรื่องอะไร")
              : t("แก้คำอธิบายหรือสถานะของหัวข้อแจ้งเตือน")}
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark="optional" className={styles.form}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>{t("ข้อมูลหัวข้อแจ้งเตือน")}</strong>
            <span>{t("ชื่อนี้ต้องตรงกับที่ subscribe ในแอป ntfy")}</span>
          </div>
        </div>

        <Form.Item
          label={t("ชื่อ topic")}
          name="topic"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อ topic") },
            {
              pattern: /^[A-Za-z0-9_-]{1,64}$/,
              message: t("ใช้ตัวอักษร ตัวเลข _ และ - ได้ไม่เกิน 64 ตัว"),
            },
          ]}
        >
          <Input size="large" placeholder="astar-wh-receipt" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label={t("แจ้งเตือนเรื่อง")}
          name="description"
          rules={[
            { required: true, message: t("กรุณาระบุว่าแจ้งเตือนเรื่องอะไร") },
            { max: 500, message: t("คำอธิบายต้องไม่เกิน 500 ตัวอักษร") },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder={t("เช่น แจ้งเมื่อยืนยันใบรับซื้อยาง")}
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("ปิดแล้วจะเลือกในฟอร์มผู้ใช้ใหม่ไม่ได้")}</span>
            </div>
          </div>
          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren={partyLabels.on} unCheckedChildren={partyLabels.off} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
