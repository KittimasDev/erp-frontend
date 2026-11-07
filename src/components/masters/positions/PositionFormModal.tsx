"use client";

import { useT } from "@/lib/i18n/useT";
import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type { CreatePositionRequest, Position } from "@/types/positions";
import styles from "@/components/masters/shared/master-page.module.css";

type PositionFormValues = {
  code: string;
  name: string;
  isActive: boolean;
};

type PositionFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialPosition?: Position | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreatePositionRequest) => void;
};

export default function PositionFormModal({
  open,
  mode,
  initialPosition,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: PositionFormModalProps) {
  const t = useT();
  const [form] = Form.useForm<PositionFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && initialPosition) {
      form.setFieldsValue({
        code: initialPosition.code,
        name: initialPosition.nameTh,
        isActive: initialPosition.isActive,
      });
      return;
    }
    form.setFieldsValue({ code: "", name: "", isActive: true });
  }, [open, mode, initialPosition, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
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
            {isCreateMode ? "CREATE POSITION" : "EDIT POSITION"}
          </div>
          <h2>{isCreateMode ? t("เพิ่มตำแหน่ง") : t("แก้ไขตำแหน่ง")}</h2>
          <p>
            {isCreateMode
              ? t("ตำแหน่งงานที่เลือกได้ในข้อมูลพนักงาน — ตัวจัดกะอัตโนมัติจัดกลุ่มคนตามตำแหน่งนี้")
              : t("แก้ชื่อแล้วพนักงานที่ใช้ตำแหน่งนี้จะเปลี่ยนชื่อตำแหน่งตามทั้งหมด")}
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark="optional" className={styles.form}>
        <Form.Item
          label={t("รหัสตำแหน่ง")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสตำแหน่ง") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input size="large" placeholder={t("เช่น TECHNICIAN")} autoComplete="off" />
        </Form.Item>

        <Form.Item
          label={t("ชื่อตำแหน่ง")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อตำแหน่ง") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input size="large" placeholder={t("เช่น ช่างเทคนิค")} autoComplete="off" />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("ปิดใช้งานแล้วเลือกให้พนักงานคนใหม่ไม่ได้ (คนเดิมยังคงตำแหน่งเดิม)")}</span>
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
