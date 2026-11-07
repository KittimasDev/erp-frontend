"use client";

import { useT } from "@/lib/i18n/useT";
import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type {
  CreatePurchaseRequestTypeRequest,
  PurchaseRequestType,
} from "@/types/purchase-request-types";
import styles from "@/components/masters/shared/master-page.module.css";

type PurchaseRequestTypeFormValues = {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type PurchaseRequestTypeFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialPurchaseRequestType?: PurchaseRequestType | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreatePurchaseRequestTypeRequest) => void;
};

export default function PurchaseRequestTypeFormModal({
  open,
  mode,
  initialPurchaseRequestType,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: PurchaseRequestTypeFormModalProps) {
  const t = useT();
  const [form] = Form.useForm<PurchaseRequestTypeFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialPurchaseRequestType) {
      form.setFieldsValue({
        code: initialPurchaseRequestType.code,
        name: initialPurchaseRequestType.nameTh,
        description: initialPurchaseRequestType.description,
        isActive: initialPurchaseRequestType.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
  }, [open, mode, initialPurchaseRequestType, form]);

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
      okText={isCreateMode ? t("บันทึก") : t("อัปเดต")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      width={580}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>
          {isCreateMode ? "+" : "✎"}
        </div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE PR TYPE" : "EDIT PR TYPE"}
          </div>

          <h2>
            {isCreateMode
              ? t("เพิ่มประเภทใบขอซื้อ")
              : t("แก้ไขประเภทใบขอซื้อ")}
          </h2>

          <p>
            {isCreateMode
              ? t("กรอกประเภทใบขอซื้อใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ")
              : t("แก้ไขรายละเอียดประเภทและสถานะการใช้งาน")}
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
            <strong>{t("ข้อมูลประเภท")}</strong>
            <span>{t("ระบุรหัส ชื่อ และคำอธิบายของประเภทใบขอซื้อ")}</span>
          </div>
        </div>

        <Form.Item
          label={t("รหัสประเภท")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสประเภท") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น RAW_MATERIAL, CHEMICAL")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อประเภท")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อประเภท") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น ขอซื้อวัตถุดิบ")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item label={t("คำอธิบาย")} name="description">
          <Input.TextArea
            rows={3}
            placeholder={t("เช่น ประเภทการขอซื้อวัตถุดิบสำหรับสายการผลิต")}
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>
                {t("เปิดใช้งานเพื่อเลือกประเภทนี้ตอนสร้างใบขอซื้อได้")}
              </span>
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
