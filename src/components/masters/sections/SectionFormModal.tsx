"use client";

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
            {isCreateMode ? "CREATE SECTION" : "EDIT SECTION"}
          </div>
          <h2>{isCreateMode ? "เพิ่มแผนกย่อย" : "แก้ไขแผนกย่อย"}</h2>
          <p>แผนกย่อยอยู่ใต้แผนก 1 ระดับ — เลือกในข้อมูลพนักงานได้เฉพาะแผนกย่อยของแผนกที่พนักงานสังกัด</p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark="optional" className={styles.form}>
        <Form.Item
          label="แผนก"
          name="departmentId"
          rules={[{ required: true, message: "กรุณาเลือกแผนก" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="เลือกแผนก"
            loading={departmentsQuery.isLoading}
            options={departments.map((dept) => ({
              value: dept.id,
              label: `${dept.code} — ${dept.nameTh}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="รหัสแผนกย่อย"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสแผนกย่อย" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input size="large" placeholder="เช่น PROD-PREP" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="ชื่อแผนกย่อย"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อแผนกย่อย" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input size="large" placeholder="เช่น ส่วนเตรียมยาง" autoComplete="off" />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>ปิดใช้งานแล้วเลือกให้พนักงานคนใหม่ไม่ได้ (คนเดิมยังสังกัดเดิม)</span>
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
