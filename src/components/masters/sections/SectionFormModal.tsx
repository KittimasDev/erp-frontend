"use client";

import { useT } from "@/lib/i18n/useT";
import { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";

import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import type { CreateSectionRequest, Section } from "@/types/sections";
import styles from "@/components/masters/shared/master-page.module.css";

type SectionFormValues = {
  code: string;
  name: string;
  departmentId: string;
  isActive: boolean;
};

type SectionFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialSection?: Section | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateSectionRequest) => void;
};

export default function SectionFormModal({
  open,
  mode,
  initialSection,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: SectionFormModalProps) {
  const t = useT();
  const [form] = Form.useForm<SectionFormValues>();
  const departmentsQuery = useDepartmentsQuery({ isActive: true });
  const departments = departmentsQuery.data?.data ?? [];

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && initialSection) {
      form.setFieldsValue({
        code: initialSection.code,
        name: initialSection.nameTh,
        departmentId: initialSection.departmentId,
        isActive: initialSection.isActive,
      });
      return;
    }
    form.setFieldsValue({ code: "", name: "", departmentId: undefined, isActive: true });
  }, [open, mode, initialSection, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      departmentId: values.departmentId,
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
            {isCreateMode ? "CREATE SECTION" : "EDIT SECTION"}
          </div>
          <h2>{isCreateMode ? t("เพิ่มแผนกย่อย") : t("แก้ไขแผนกย่อย")}</h2>
          <p>{t("แผนกย่อยอยู่ใต้แผนก 1 ระดับ — เลือกในข้อมูลพนักงานได้เฉพาะแผนกย่อยของแผนกที่พนักงานสังกัด")}</p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark="optional" className={styles.form}>
        <Form.Item
          label={t("แผนก")}
          name="departmentId"
          rules={[{ required: true, message: t("กรุณาเลือกแผนก") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("เลือกแผนก")}
            loading={departmentsQuery.isLoading}
            options={departments.map((dept) => ({
              value: dept.id,
              label: `${dept.code} — ${dept.nameTh}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label={t("รหัสแผนกย่อย")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสแผนกย่อย") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input size="large" placeholder={t("เช่น PROD-PREP")} autoComplete="off" />
        </Form.Item>

        <Form.Item
          label={t("ชื่อแผนกย่อย")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อแผนกย่อย") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input size="large" placeholder={t("เช่น ส่วนเตรียมยาง")} autoComplete="off" />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("ปิดใช้งานแล้วเลือกให้พนักงานคนใหม่ไม่ได้ (คนเดิมยังสังกัดเดิม)")}</span>
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
