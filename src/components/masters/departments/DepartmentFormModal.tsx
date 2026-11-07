"use client";

import { useT } from "@/lib/i18n/useT";
import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type {
  CreateDepartmentRequest,
  Department,
} from "@/types/departments";
import styles from "@/components/masters/shared/master-page.module.css";

type DepartmentFormValues = {
  code: string;
  name: string;
  isActive: boolean;
};

type DepartmentFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialDepartment?: Department | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateDepartmentRequest) => void;
};

export default function DepartmentFormModal({
  open,
  mode,
  initialDepartment,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: DepartmentFormModalProps) {
  const t = useT();
  const [form] = Form.useForm<DepartmentFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialDepartment) {
      form.setFieldsValue({
        code: initialDepartment.code,
        name: initialDepartment.nameTh,
        isActive: initialDepartment.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      isActive: true,
    });
  }, [open, mode, initialDepartment, form]);

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
        <div className={styles.modalIcon}>
          {isCreateMode ? "+" : "✎"}
        </div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE DEPARTMENT" : "EDIT DEPARTMENT"}
          </div>

          <h2>{isCreateMode ? t("เพิ่มแผนก") : t("แก้ไขแผนก")}</h2>

          <p>
            {isCreateMode
              ? t("กรอกข้อมูลแผนกใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ")
              : t("แก้ไขรายละเอียดแผนกและสถานะการใช้งาน")}
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
            <strong>{t("ข้อมูลแผนก")}</strong>
            <span>{t("ระบุรหัสและชื่อแผนกที่ใช้ในระบบ")}</span>
          </div>
        </div>

        <Form.Item
          label={t("รหัสแผนก")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสแผนก") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น PURCHASE, WAREHOUSE")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อแผนก")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อแผนก") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น ฝ่ายจัดซื้อ")}
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>

            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>
                {t("เปิดใช้งานเพื่อให้สามารถเลือกแผนกนี้ในเอกสารต่าง ๆ ได้")}
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
