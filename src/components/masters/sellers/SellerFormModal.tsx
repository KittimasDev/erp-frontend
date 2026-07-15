"use client";

import { useEffect } from "react";
import { Col, Form, Input, Modal, Row, Select, Switch } from "antd";

import type { CreateSellerRequest, Seller } from "@/types/sellers";
import styles from "./SellerFormModal.module.css";

type SellerTypeOption = {
  value: string;
  label: string;
};

type SellerFormValues = {
  code: string;
  name: string;
  sellerTypeId?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactName?: string;
  paymentMethod?: string;
  remark?: string;
  isActive: boolean;
};

type SellerFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialSeller?: Seller | null;
  sellerTypeOptions: SellerTypeOption[];
  sellerTypesLoading?: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateSellerRequest) => void;
};

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "CASH" },
  { value: "TRANSFER", label: "TRANSFER" },
];

export default function SellerFormModal({
  open,
  mode,
  initialSeller,
  sellerTypeOptions,
  sellerTypesLoading = false,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: SellerFormModalProps) {
  const [form] = Form.useForm<SellerFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialSeller) {
      form.setFieldsValue({
        code: initialSeller.sellerCode,
        name: initialSeller.sellerName,
        sellerTypeId: initialSeller.sellerTypeId,
        taxId: initialSeller.taxId,
        phone: initialSeller.phone,
        email: initialSeller.email,
        address: initialSeller.address,
        contactName: initialSeller.contactName,
        paymentMethod: initialSeller.paymentMethod,
        remark: initialSeller.remark,
        isActive: initialSeller.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      sellerTypeId: undefined,
      taxId: "",
      phone: "",
      email: "",
      address: "",
      contactName: "",
      paymentMethod: undefined,
      remark: "",
      isActive: true,
    });
  }, [open, mode, initialSeller, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      sellerTypeId: values.sellerTypeId || undefined,
      taxId: values.taxId?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
      contactName: values.contactName?.trim() || undefined,
      paymentMethod: values.paymentMethod || undefined,
      remark: values.remark?.trim() || undefined,
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
      width={720}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE SELLER" : "EDIT SELLER"}
          </div>

          <h2>{isCreateMode ? "เพิ่มผู้ขายยาง" : "แก้ไขผู้ขายยาง"}</h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลผู้ขายยางรถยนต์ใช้แล้ว"
              : "แก้ไขรายละเอียดผู้ขายและสถานะการใช้งาน"}
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
            <strong>ข้อมูลผู้ขาย</strong>
            <span>ระบุรหัส ชื่อ ประเภท และช่องทางติดต่อ</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="รหัสผู้ขาย"
              name="code"
              rules={[
                { required: true, message: "กรุณากรอกรหัสผู้ขาย" },
                { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น SELL-001"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label="ประเภทผู้ขาย" name="sellerTypeId">
              <Select
                allowClear
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="เลือกประเภท"
                loading={sellerTypesLoading}
                options={sellerTypeOptions}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              label="ชื่อผู้ขาย"
              name="name"
              rules={[
                { required: true, message: "กรุณากรอกชื่อผู้ขาย" },
                { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น หจก. รับซื้อยาง ABC"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="เลขประจำตัวผู้เสียภาษี"
              name="taxId"
              rules={[{ max: 50, message: "ต้องไม่เกิน 50 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น 1234567890123" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ชื่อผู้ติดต่อ"
              name="contactName"
              rules={[{ max: 255, message: "ต้องไม่เกิน 255 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น คุณสมชาย" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="เบอร์โทรศัพท์"
              name="phone"
              rules={[{ max: 100, message: "ต้องไม่เกิน 100 ตัวอักษร" }]}
            >
              <Input size="large" placeholder="เช่น 0812345678" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="อีเมล"
              name="email"
              rules={[
                { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
                { max: 255, message: "ต้องไม่เกิน 255 ตัวอักษร" },
              ]}
            >
              <Input size="large" placeholder="เช่น seller@example.com" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label="วิธีชำระเงิน" name="paymentMethod">
              <Select
                allowClear
                size="large"
                placeholder="เลือกวิธีชำระเงิน"
                options={PAYMENT_METHOD_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item label="ที่อยู่" name="address">
              <Input.TextArea
                rows={2}
                placeholder="เช่น 123 หมู่ 4 ต.บางเมือง อ.เมือง"
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item label="หมายเหตุ" name="remark">
              <Input.TextArea rows={2} placeholder="เช่น ลูกค้ารายประจำ" />
            </Form.Item>
          </Col>
        </Row>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกผู้ขายนี้ในเอกสารได้</span>
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
