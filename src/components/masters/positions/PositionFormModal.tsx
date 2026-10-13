"use client";

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
            {isCreateMode ? "CREATE POSITION" : "EDIT POSITION"}
          </div>
          <h2>{isCreateMode ? "เพิ่มตำแหน่ง" : "แก้ไขตำแหน่ง"}</h2>
          <p>
            {isCreateMode
              ? "ตำแหน่งงานที่เลือกได้ในข้อมูลพนักงาน — ตัวจัดกะอัตโนมัติจัดกลุ่มคนตามตำแหน่งนี้"
              : "แก้ชื่อแล้วพนักงานที่ใช้ตำแหน่งนี้จะเปลี่ยนชื่อตำแหน่งตามทั้งหมด"}
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark="optional" className={styles.form}>
        <Form.Item
          label="รหัสตำแหน่ง"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสตำแหน่ง" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input size="large" placeholder="เช่น TECHNICIAN" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="ชื่อตำแหน่ง"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อตำแหน่ง" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input size="large" placeholder="เช่น ช่างเทคนิค" autoComplete="off" />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>ปิดใช้งานแล้วเลือกให้พนักงานคนใหม่ไม่ได้ (คนเดิมยังคงตำแหน่งเดิม)</span>
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
