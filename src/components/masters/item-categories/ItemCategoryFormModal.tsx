"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type {
  CreateItemCategoryRequest,
  ItemCategory,
} from "@/types/item-categories";
import styles from "./ItemCategoryFormModal.module.css";

type ItemCategoryFormValues = {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type ItemCategoryFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialItemCategory?: ItemCategory | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateItemCategoryRequest) => void;
};

export default function ItemCategoryFormModal({
  open,
  mode,
  initialItemCategory,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: ItemCategoryFormModalProps) {
  const [form] = Form.useForm<ItemCategoryFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialItemCategory) {
      form.setFieldsValue({
        code: initialItemCategory.code,
        name: initialItemCategory.nameTh,
        description: initialItemCategory.description,
        isActive: initialItemCategory.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
  }, [open, mode, initialItemCategory, form]);

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
      className={styles.unitModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
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
            {isCreateMode ? "CREATE CATEGORY" : "EDIT CATEGORY"}
          </div>

          <h2>
            {isCreateMode ? "เพิ่มหมวดหมู่สินค้า" : "แก้ไขหมวดหมู่สินค้า"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลหมวดหมู่สินค้าใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดหมวดหมู่และสถานะการใช้งาน"}
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
            <strong>ข้อมูลหมวดหมู่</strong>
            <span>ระบุรหัส ชื่อ และคำอธิบายที่ใช้จัดกลุ่มสินค้า</span>
          </div>
        </div>

        <Form.Item
          label="รหัสหมวดหมู่"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสหมวดหมู่" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น RAW_MATERIAL, CHEMICAL"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อหมวดหมู่"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อหมวดหมู่" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น วัตถุดิบ"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item label="คำอธิบาย" name="description">
          <Input.TextArea
            rows={3}
            placeholder="เช่น หมวดหมู่สำหรับวัตถุดิบที่ใช้ในการผลิต"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>

            <div>
              <strong>สถานะใช้งาน</strong>
              <span>
                เปิดใช้งานเพื่อให้สามารถเลือกหมวดหมู่นี้กับสินค้ารายการต่าง ๆ ได้
              </span>
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
