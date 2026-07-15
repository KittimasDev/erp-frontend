"use client";

import { useEffect } from "react";
import { Col, Form, Input, InputNumber, Modal, Row, Select, Switch } from "antd";

import type {
  CreateWeighbridgeScaleRequest,
  WeighbridgeScale,
} from "@/types/weighbridge-scales";
import styles from "./WeighbridgeScaleFormModal.module.css";

type WeighbridgeScaleFormValues = {
  code: string;
  name: string;
  scaleType: string;
  locationName?: string;
  connectionType?: string;
  ipAddress?: string;
  port?: number | null;
  serialPort?: string;
  baudRate?: number | null;
  protocolName?: string;
  capacityKg?: number | null;
  decimalPlaces?: number | null;
  isAutoReadEnabled: boolean;
  isManualFallbackAllowed: boolean;
  isActive: boolean;
};

type WeighbridgeScaleFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialScale?: WeighbridgeScale | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateWeighbridgeScaleRequest) => void;
};

const SCALE_TYPE_OPTIONS = [
  { value: "TRUCK_SCALE", label: "TRUCK_SCALE" },
  { value: "FLOOR_SCALE", label: "FLOOR_SCALE" },
];

const CONNECTION_TYPE_OPTIONS = [
  { value: "TCP_IP", label: "TCP_IP" },
  { value: "RS232", label: "RS232" },
  { value: "CSV", label: "CSV" },
  { value: "MANUAL", label: "MANUAL" },
];

export default function WeighbridgeScaleFormModal({
  open,
  mode,
  initialScale,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: WeighbridgeScaleFormModalProps) {
  const [form] = Form.useForm<WeighbridgeScaleFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialScale) {
      form.setFieldsValue({
        code: initialScale.scaleCode,
        name: initialScale.scaleName,
        scaleType: initialScale.scaleType,
        locationName: initialScale.locationName,
        connectionType: initialScale.connectionType,
        ipAddress: initialScale.ipAddress,
        port: initialScale.port,
        serialPort: initialScale.serialPort,
        baudRate: initialScale.baudRate,
        protocolName: initialScale.protocolName,
        capacityKg:
          initialScale.capacityKg !== undefined &&
          initialScale.capacityKg !== null &&
          initialScale.capacityKg !== ""
            ? Number(initialScale.capacityKg)
            : undefined,
        decimalPlaces: initialScale.decimalPlaces,
        isAutoReadEnabled: initialScale.isAutoReadEnabled,
        isManualFallbackAllowed: initialScale.isManualFallbackAllowed,
        isActive: initialScale.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      scaleType: "TRUCK_SCALE",
      locationName: "",
      connectionType: undefined,
      ipAddress: "",
      port: undefined,
      serialPort: "",
      baudRate: undefined,
      protocolName: "",
      capacityKg: undefined,
      decimalPlaces: 2,
      isAutoReadEnabled: false,
      isManualFallbackAllowed: true,
      isActive: true,
    });
  }, [open, mode, initialScale, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      scaleType: values.scaleType,
      locationName: values.locationName?.trim() || undefined,
      connectionType: values.connectionType || undefined,
      ipAddress: values.ipAddress?.trim() || undefined,
      port:
        values.port === undefined || values.port === null
          ? undefined
          : values.port,
      serialPort: values.serialPort?.trim() || undefined,
      baudRate:
        values.baudRate === undefined || values.baudRate === null
          ? undefined
          : values.baudRate,
      protocolName: values.protocolName?.trim() || undefined,
      capacityKg:
        values.capacityKg === undefined || values.capacityKg === null
          ? undefined
          : values.capacityKg,
      decimalPlaces:
        values.decimalPlaces === undefined || values.decimalPlaces === null
          ? undefined
          : values.decimalPlaces,
      isAutoReadEnabled: values.isAutoReadEnabled,
      isManualFallbackAllowed: values.isManualFallbackAllowed,
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
      width={760}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE SCALE" : "EDIT SCALE"}
          </div>

          <h2>{isCreateMode ? "เพิ่มเครื่องชั่ง" : "แก้ไขเครื่องชั่ง"}</h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลเครื่องชั่งน้ำหนักและการเชื่อมต่อ"
              : "แก้ไขรายละเอียดเครื่องชั่งและสถานะการใช้งาน"}
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
            <strong>ข้อมูลเครื่องชั่ง</strong>
            <span>ระบุรหัส ชื่อ ประเภท และตำแหน่งติดตั้ง</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="รหัสเครื่องชั่ง"
              name="code"
              rules={[
                { required: true, message: "กรุณากรอกรหัสเครื่องชั่ง" },
                { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น TRUCK_SCALE_01"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ชื่อเครื่องชั่ง"
              name="name"
              rules={[
                { required: true, message: "กรุณากรอกชื่อเครื่องชั่ง" },
                { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น เครื่องชั่งรถบรรทุก 1"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ประเภทเครื่องชั่ง"
              name="scaleType"
              rules={[
                { required: true, message: "กรุณาเลือกประเภทเครื่องชั่ง" },
              ]}
            >
              <Select
                size="large"
                placeholder="เลือกประเภท"
                options={SCALE_TYPE_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ตำแหน่งติดตั้ง"
              name="locationName"
              rules={[{ max: 255, message: "ต้องไม่เกิน 255 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น จุดชั่งหน้าโรงงาน" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="พิกัดน้ำหนักสูงสุด (กก.)"
              name="capacityKg"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: "พิกัดต้องไม่ติดลบ",
                },
              ]}
            >
              <InputNumber
                size="large"
                min={0}
                step={0.001}
                style={{ width: "100%" }}
                placeholder="เช่น 80000"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ทศนิยม"
              name="decimalPlaces"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: "ทศนิยมต้องไม่ติดลบ",
                },
              ]}
            >
              <InputNumber
                size="large"
                min={0}
                step={1}
                style={{ width: "100%" }}
                placeholder="เช่น 2"
              />
            </Form.Item>
          </Col>
        </Row>

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>การเชื่อมต่อ</strong>
            <span>ตั้งค่าช่องทางอ่านค่าจากเครื่องชั่ง</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="ประเภทการเชื่อมต่อ" name="connectionType">
              <Select
                allowClear
                size="large"
                placeholder="เลือกประเภท"
                options={CONNECTION_TYPE_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Protocol"
              name="protocolName"
              rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น AVERY" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="IP Address"
              name="ipAddress"
              rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น 192.168.1.50" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Port"
              name="port"
              rules={[
                {
                  type: "number",
                  min: 1,
                  message: "Port ต้องมากกว่า 0",
                },
              ]}
            >
              <InputNumber
                size="large"
                min={1}
                step={1}
                style={{ width: "100%" }}
                placeholder="เช่น 4001"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Serial Port"
              name="serialPort"
              rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น COM1" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Baud Rate"
              name="baudRate"
              rules={[
                {
                  type: "number",
                  min: 1,
                  message: "Baud Rate ต้องมากกว่า 0",
                },
              ]}
            >
              <InputNumber
                size="large"
                min={1}
                step={1}
                style={{ width: "100%" }}
                placeholder="เช่น 9600"
              />
            </Form.Item>
          </Col>
        </Row>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>อ่านค่าอัตโนมัติ</strong>
              <span>เปิดเพื่ออ่านน้ำหนักจากเครื่องชั่งอัตโนมัติ</span>
            </div>
          </div>

          <Form.Item name="isAutoReadEnabled" valuePropName="checked" noStyle>
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>อนุญาตกรอก Manual</strong>
              <span>ใช้ได้เมื่อเชื่อมต่อเครื่องชั่งไม่ได้</span>
            </div>
          </div>

          <Form.Item
            name="isManualFallbackAllowed"
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
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกเครื่องชั่งนี้ในเอกสารได้</span>
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
