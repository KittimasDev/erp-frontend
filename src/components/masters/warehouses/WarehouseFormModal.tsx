"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

import type { CreateWarehouseRequest, Warehouse } from "@/types/warehouses";
import styles from "./WarehouseFormModal.module.css";

type WarehouseFormValues = {
  code: string;
  name: string;
  warehouseGroup?: string;
  description?: string;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isActive: boolean;
};

type WarehouseFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialWarehouse?: Warehouse | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateWarehouseRequest) => void;
};

export default function WarehouseFormModal({
  open,
  mode,
  initialWarehouse,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: WarehouseFormModalProps) {
  const [form] = Form.useForm<WarehouseFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialWarehouse) {
      form.setFieldsValue({
        code: initialWarehouse.warehouseCode,
        name: initialWarehouse.warehouseName,
        warehouseGroup: initialWarehouse.warehouseGroup,
        description: initialWarehouse.description,
        allowNegativeStock: initialWarehouse.allowNegativeStock,
        isQcRequired: initialWarehouse.isQcRequired,
        isActive: initialWarehouse.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      warehouseGroup: "",
      description: "",
      allowNegativeStock: false,
      isQcRequired: false,
      isActive: true,
    });
  }, [open, mode, initialWarehouse, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      warehouseGroup: values.warehouseGroup?.trim() || undefined,
      description: values.description?.trim() || undefined,
      allowNegativeStock: values.allowNegativeStock,
      isQcRequired: values.isQcRequired,
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
      width={560}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE WAREHOUSE" : "EDIT WAREHOUSE"}
          </div>

          <h2>{isCreateMode ? "เพิ่มคลังสินค้า" : "แก้ไขคลังสินค้า"}</h2>

          <p>
            {isCreateMode
              ? "กรอกคลังสินค้าใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดคลังสินค้าและสถานะการใช้งาน"}
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
            <strong>ข้อมูลคลังสินค้า</strong>
            <span>ระบุรหัส ชื่อ กลุ่ม และรายละเอียด</span>
          </div>
        </div>

        <Form.Item
          label="รหัสคลัง"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสคลัง" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น RAW_WH"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อคลัง"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อคลัง" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น คลังวัตถุดิบ"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="กลุ่มคลัง"
          name="warehouseGroup"
          rules={[{ max: 50, message: "กลุ่มคลังต้องไม่เกิน 50 ตัวอักษร" }]}
        >
          <Input
            size="large"
            placeholder="เช่น RAW_MATERIAL"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="รายละเอียด"
          name="description"
          rules={[
            { max: 500, message: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร" },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="เช่น พื้นที่รับยางดิบด้านหน้าโรงงาน"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>อนุญาตยอดติดลบ</strong>
              <span>เปิดเมื่อคลังนี้อนุญาตให้สต็อกติดลบได้</span>
            </div>
          </div>

          <Form.Item
            name="allowNegativeStock"
            valuePropName="checked"
            noStyle
          >
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>ต้องผ่าน QC</strong>
              <span>เปิดเมื่อสินค้าเข้าคลังนี้ต้องผ่านการตรวจคุณภาพ</span>
            </div>
          </div>

          <Form.Item name="isQcRequired" valuePropName="checked" noStyle>
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกคลังนี้ในเอกสารได้</span>
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
