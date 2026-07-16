"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";

import type {
  CreateWarehouseLocationRequest,
  WarehouseLocation,
} from "@/types/warehouse-locations";
import styles from "@/components/masters/shared/master-page.module.css";

type WarehouseOption = {
  value: string;
  label: string;
};

type WarehouseLocationFormValues = {
  warehouseId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type WarehouseLocationFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialLocation?: WarehouseLocation | null;
  warehouseOptions: WarehouseOption[];
  warehousesLoading?: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateWarehouseLocationRequest) => void;
};

export default function WarehouseLocationFormModal({
  open,
  mode,
  initialLocation,
  warehouseOptions,
  warehousesLoading = false,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: WarehouseLocationFormModalProps) {
  const [form] = Form.useForm<WarehouseLocationFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialLocation) {
      form.setFieldsValue({
        warehouseId: initialLocation.warehouseId,
        code: initialLocation.locationCode,
        name: initialLocation.locationName,
        description: initialLocation.description,
        isActive: initialLocation.isActive,
      });
      return;
    }

    form.setFieldsValue({
      warehouseId: undefined,
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
  }, [open, mode, initialLocation, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      warehouseId: values.warehouseId,
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
      width={560}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode
              ? "CREATE WAREHOUSE LOCATION"
              : "EDIT WAREHOUSE LOCATION"}
          </div>

          <h2>
            {isCreateMode ? "เพิ่มตำแหน่งจัดเก็บ" : "แก้ไขตำแหน่งจัดเก็บ"}
          </h2>

          <p>
            {isCreateMode
              ? "กรอกตำแหน่งจัดเก็บใหม่ภายใต้คลังสินค้า"
              : "แก้ไขรายละเอียดตำแหน่งจัดเก็บและสถานะการใช้งาน"}
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
            <strong>ข้อมูลตำแหน่งจัดเก็บ</strong>
            <span>ระบุคลัง รหัส ชื่อ และรายละเอียด</span>
          </div>
        </div>

        <Form.Item
          label="คลังสินค้า"
          name="warehouseId"
          rules={[{ required: true, message: "กรุณาเลือกคลังสินค้า" }]}
        >
          <Select
            size="large"
            showSearch
            optionFilterProp="label"
            placeholder="เลือกคลังสินค้า"
            loading={warehousesLoading}
            options={warehouseOptions}
          />
        </Form.Item>

        <Form.Item
          label="รหัสตำแหน่ง"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสตำแหน่ง" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น RAW-A01"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อตำแหน่ง"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อตำแหน่ง" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น โซน A ช่อง 01"
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
            placeholder="เช่น พื้นที่จัดเก็บยางดิบโซน A"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกตำแหน่งนี้ในเอกสารได้</span>
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
