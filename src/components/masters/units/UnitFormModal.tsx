"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type { CreateUnitRequest, Unit } from "@/types/units";
import styles from "./UnitFormModal.module.css";

type UnitFormValues = {
  code: string;
  name: string;
  symbol?: string;
  isActive: boolean;
};

type UnitFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialUnit?: Unit | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateUnitRequest) => void;
};

export default function UnitFormModal({
  open,
  mode,
  initialUnit,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: UnitFormModalProps) {
  const [form] = Form.useForm<UnitFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialUnit) {
      form.setFieldsValue({
        code: initialUnit.code,
        name: initialUnit.nameTh,
        symbol: initialUnit.nameEn,
        isActive: initialUnit.isActive,
      });

      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      symbol: "",
      isActive: true,
    });
  }, [open, mode, initialUnit, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      symbol: values.symbol?.trim() || undefined,
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
            {isCreateMode ? "CREATE UNIT" : "EDIT UNIT"}
          </div>

          <h2>
            {isCreateMode ? "เพิ่มหน่วยนับ" : "แก้ไขหน่วยนับ"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลหน่วยนับใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดหน่วยนับและสถานะการใช้งาน"}
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
            <strong>ข้อมูลหน่วยนับ</strong>
            <span>ระบุรหัส ชื่อ และสัญลักษณ์ที่ใช้ในระบบ</span>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Form.Item
            label="รหัสหน่วยนับ"
            name="code"
            rules={[
              {
                required: true,
                message: "กรุณากรอกรหัสหน่วยนับ",
              },
              {
                max: 50,
                message: "รหัสต้องไม่เกิน 50 ตัวอักษร",
              },
            ]}
          >
            <Input
              size="large"
              placeholder="เช่น KG, TON, PCS"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label="สัญลักษณ์ / ชื่อย่อ"
            name="symbol"
            rules={[
              {
                max: 50,
                message: "สัญลักษณ์ต้องไม่เกิน 50 ตัวอักษร",
              },
            ]}
          >
            <Input
              size="large"
              placeholder="เช่น kg"
              autoComplete="off"
            />
          </Form.Item>
        </div>

        <Form.Item
          label="ชื่อหน่วยนับ"
          name="name"
          rules={[
            {
              required: true,
              message: "กรุณากรอกชื่อหน่วยนับ",
            },
            {
              max: 255,
              message: "ชื่อต้องไม่เกิน 255 ตัวอักษร",
            },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น กิโลกรัม"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>

            <div>
              <strong>สถานะใช้งาน</strong>

              <span>
                เปิดใช้งานเพื่อให้สามารถเลือกหน่วยนับนี้ในรายการสินค้า
                และเอกสารต่าง ๆ ได้
              </span>
            </div>
          </div>

          <Form.Item
            name="isActive"
            valuePropName="checked"
            noStyle
          >
            <Switch
              checkedChildren="เปิด"
              unCheckedChildren="ปิด"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}