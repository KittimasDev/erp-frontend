"use client";

import { useEffect } from "react";
import { Col, Form, Input, InputNumber, Modal, Row, Select, Switch } from "antd";

import type { CreateTruckRequest, Truck } from "@/types/trucks";
import styles from "@/components/masters/shared/master-page.module.css";

type SellerOption = {
  value: string;
  label: string;
};

type TruckFormValues = {
  code: string;
  licensePlate: string;
  sellerId?: string;
  province?: string;
  truckType?: string;
  driverName?: string;
  driverPhone?: string;
  tareWeightKg?: number | null;
  isActive: boolean;
};

type TruckFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialTruck?: Truck | null;
  sellerOptions: SellerOption[];
  sellersLoading?: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTruckRequest) => void;
};

const TRUCK_TYPE_OPTIONS = [
  { value: "car", label: "รถส่วนตัว" },
  { value: "6_WHEEL", label: "6_WHEEL" },
  { value: "10_WHEEL", label: "10_WHEEL" },
  { value: "TRAILER", label: "TRAILER" },
  { value: "PICKUP", label: "PICKUP" },
];

export default function TruckFormModal({
  open,
  mode,
  initialTruck,
  sellerOptions,
  sellersLoading = false,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: TruckFormModalProps) {
  const [form] = Form.useForm<TruckFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialTruck) {
      form.setFieldsValue({
        code: initialTruck.truckCode,
        licensePlate: initialTruck.licensePlate,
        sellerId: initialTruck.sellerId,
        province: initialTruck.province,
        truckType: initialTruck.truckType,
        driverName: initialTruck.driverName,
        driverPhone: initialTruck.driverPhone,
        tareWeightKg:
          initialTruck.tareWeightKg !== undefined &&
          initialTruck.tareWeightKg !== null &&
          initialTruck.tareWeightKg !== ""
            ? Number(initialTruck.tareWeightKg)
            : undefined,
        isActive: initialTruck.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      licensePlate: "",
      sellerId: undefined,
      province: "",
      truckType: undefined,
      driverName: "",
      driverPhone: "",
      tareWeightKg: undefined,
      isActive: true,
    });
  }, [open, mode, initialTruck, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      licensePlate: values.licensePlate.trim(),
      sellerId: values.sellerId || undefined,
      province: values.province?.trim() || undefined,
      truckType: values.truckType || undefined,
      driverName: values.driverName?.trim() || undefined,
      driverPhone: values.driverPhone?.trim() || undefined,
      tareWeightKg:
        values.tareWeightKg === undefined || values.tareWeightKg === null
          ? undefined
          : values.tareWeightKg,
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
      width={720}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE TRUCK" : "EDIT TRUCK"}
          </div>

          <h2>{isCreateMode ? "เพิ่มรถบรรทุก" : "แก้ไขรถบรรทุก"}</h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลรถบรรทุกที่ใช้รับซื้อหรือขนส่งยาง"
              : "แก้ไขรายละเอียดรถและสถานะการใช้งาน"}
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
            <strong>ข้อมูลรถบรรทุก</strong>
            <span>ระบุรหัส ทะเบียน ผู้ขาย และคนขับ</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="รหัสรถ"
              name="code"
              rules={[
                { required: true, message: "กรุณากรอกรหัสรถ" },
                { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น TRK-001"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ทะเบียนรถ"
              name="licensePlate"
              rules={[
                { required: true, message: "กรุณากรอกทะเบียนรถ" },
                { max: 100, message: "ทะเบียนต้องไม่เกิน 100 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น กข-1234"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label="ผู้ขาย" name="sellerId">
              <Select
                allowClear
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="เลือกผู้ขาย"
                loading={sellersLoading}
                options={sellerOptions}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="จังหวัด"
              name="province"
              rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น สมุทรปราการ" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label="ประเภทรถ" name="truckType">
              <Select
                allowClear
                size="large"
                placeholder="เลือกประเภท"
                options={TRUCK_TYPE_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="น้ำหนักรถเปล่า (กก.)"
              name="tareWeightKg"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: "น้ำหนักต้องไม่ติดลบ",
                },
              ]}
            >
              <InputNumber
                size="large"
                min={0}
                step={0.001}
                style={{ width: "100%" }}
                placeholder="เช่น 8500.5"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ชื่อคนขับ"
              name="driverName"
              rules={[{ max: 255, message: "ต้องไม่เกิน 255 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น สมชาย ใจดี" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="เบอร์โทรคนขับ"
              name="driverPhone"
              rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น 0812345678" />
            </Form.Item>
          </Col>
        </Row>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกรถนี้ในเอกสารได้</span>
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
