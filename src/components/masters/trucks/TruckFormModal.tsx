"use client";

import { useT } from "@/lib/i18n/useT";
import { usePartyLabels } from "@/lib/i18n/partyLabels";

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
  /** Prefill ผู้ขายตอน create (เช่น จากหน้าเปิดตั๋วชั่ง) */
  defaultSellerId?: string;
  /** ล็อก Select ผู้ขาย — ใช้เมื่อสร้างรถผูกกับผู้ขายที่เลือกอยู่แล้ว */
  lockSellerId?: boolean;
  /** ต้องสูงกว่า SideSheet (1100) ถ้าเปิดซ้อน drawer — ไม่เช่นนั้นคลิกโดน mask แล้วปิด */
  zIndex?: number;
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
  defaultSellerId,
  lockSellerId = false,
  zIndex,
  onCancel,
  onSubmit,
}: TruckFormModalProps) {
  const t = useT();
  const partyLabels = usePartyLabels();
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
      sellerId: defaultSellerId,
      province: "",
      truckType: undefined,
      driverName: "",
      driverPhone: "",
      tareWeightKg: undefined,
      isActive: true,
    });
  }, [open, mode, initialTruck, defaultSellerId, form]);

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
      okText={isCreateMode ? t("บันทึก") : t("อัปเดต")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      width={720}
      centered
      zIndex={zIndex}
      getContainer={() => document.body}
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE TRUCK" : "EDIT TRUCK"}
          </div>

          <h2>{isCreateMode ? t("เพิ่มรถบรรทุก") : t("แก้ไขรถบรรทุก")}</h2>

          <p>
            {isCreateMode
              ? t("กรอกข้อมูลรถบรรทุกที่ใช้รับซื้อหรือขนส่งยาง")
              : t("แก้ไขรายละเอียดรถและสถานะการใช้งาน")}
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
            <strong>{t("ข้อมูลรถบรรทุก")}</strong>
            <span>{t("ระบุรหัส ทะเบียน ผู้ขาย และคนขับ")}</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={t("รหัสรถ")}
              name="code"
              rules={[
                { required: true, message: t("กรุณากรอกรหัสรถ") },
                { max: 100, message: t("รหัสต้องไม่เกิน 100 ตัวอักษร") },
              ]}
            >
              <Input
                size="large"
                placeholder={t("เช่น TRK-001")}
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={t("ทะเบียนรถ")}
              name="licensePlate"
              rules={[
                { required: true, message: t("กรุณากรอกทะเบียนรถ") },
                { max: 100, message: t("ทะเบียนต้องไม่เกิน 100 ตัวอักษร") },
              ]}
            >
              <Input
                size="large"
                placeholder={t("เช่น กข-1234")}
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label={t("ผู้ขาย")} name="sellerId">
              <Select
                allowClear={!lockSellerId}
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder={t("เลือกผู้ขาย")}
                loading={sellersLoading}
                options={sellerOptions}
                disabled={lockSellerId}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={t("จังหวัด")}
              name="province"
              rules={[{ max: 100, message: t("ต้องไม่เกิน 100 ตัวอักษร") }]}
            >
              <Input size="large" placeholder={t("เช่น สมุทรปราการ")} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label={t("ประเภทรถ")} name="truckType">
              <Select
                allowClear
                size="large"
                placeholder={t("เลือกประเภท")}
                options={TRUCK_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={t("น้ำหนักรถเปล่า (กก.)")}
              name="tareWeightKg"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: t("น้ำหนักต้องไม่ติดลบ"),
                },
              ]}
            >
              <InputNumber
                size="large"
                min={0}
                step={0.001}
                style={{ width: "100%" }}
                placeholder={t("เช่น 8500.5")}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={t("ชื่อคนขับ")}
              name="driverName"
              rules={[{ max: 255, message: t("ต้องไม่เกิน 255 ตัวอักษร") }]}
            >
              <Input size="large" placeholder={t("เช่น สมชาย ใจดี")} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={t("เบอร์โทรคนขับ")}
              name="driverPhone"
              rules={[{ max: 100, message: t("ต้องไม่เกิน 100 ตัวอักษร") }]}
            >
              <Input size="large" placeholder={t("เช่น 0812345678")} />
            </Form.Item>
          </Col>
        </Row>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("เปิดใช้งานเพื่อเลือกรถนี้ในเอกสารได้")}</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren={partyLabels.on} unCheckedChildren={partyLabels.off} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
