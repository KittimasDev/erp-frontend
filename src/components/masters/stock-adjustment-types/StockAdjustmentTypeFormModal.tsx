"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type {
  CreateStockAdjustmentTypeRequest,
  StockAdjustmentTypeMaster,
} from "@/types/stock-adjustment-types";
import styles from "@/components/masters/shared/master-page.module.css";

type StockAdjustmentTypeFormValues = {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type StockAdjustmentTypeFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialStockAdjustmentType?: StockAdjustmentTypeMaster | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateStockAdjustmentTypeRequest) => void;
};

export default function StockAdjustmentTypeFormModal({
  open,
  mode,
  initialStockAdjustmentType,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: StockAdjustmentTypeFormModalProps) {
  const [form] = Form.useForm<StockAdjustmentTypeFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialStockAdjustmentType) {
      form.setFieldsValue({
        code: initialStockAdjustmentType.code,
        name: initialStockAdjustmentType.nameTh,
        description: initialStockAdjustmentType.description,
        isActive: initialStockAdjustmentType.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
  }, [open, mode, initialStockAdjustmentType, form]);

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
            {isCreateMode ? "CREATE SA TYPE" : "EDIT SA TYPE"}
          </div>

          <h2>
            {isCreateMode
              ? "เพิ่มประเภทใบปรับปรุงสต๊อก"
              : "แก้ไขประเภทใบปรับปรุงสต๊อก"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกประเภทใหม่ที่ใช้เลือกตอนสร้างใบปรับปรุงสต๊อก"
              : "แก้ไขรายละเอียดประเภทและสถานะการใช้งาน"}
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
            <strong>ข้อมูลประเภท</strong>
            <span>ระบุรหัส ชื่อ และคำอธิบาย — ทิศสต๊อกยังดูจากเครื่องหมายของจำนวน</span>
          </div>
        </div>

        <Form.Item
          label="รหัสประเภท"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสประเภท" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น INCREASE, QC_HOLD"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อประเภท"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อประเภท" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น ปรับเพิ่ม"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item label="คำอธิบาย" name="description">
          <Input.TextArea
            rows={3}
            placeholder="เช่น เพิ่มยอดสต๊อก"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>
                เปิดใช้งานเพื่อเลือกประเภทนี้ตอนสร้างใบปรับปรุงสต๊อกได้
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
