"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  type FormInstance,
} from "antd";

import {
  CUSTOMER_TYPES,
  type CreateCustomerRequest,
  type Customer,
} from "@/types/customers";
import styles from "@/components/masters/shared/master-page.module.css";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  DOMESTIC: "ในประเทศ",
  EXPORT: "ส่งออก",
  DEALER: "ตัวแทนจำหน่าย",
  GENERAL: "ทั่วไป",
};

type CustomerFormValues = {
  customerCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  customerType?: string;
  defaultCreditDays?: number;
  isActive: boolean;
};

type CustomerFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialCustomer?: Customer | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateCustomerRequest) => void;
};

function getInitialValues(
  mode: "create" | "edit",
  initialCustomer?: Customer | null,
): CustomerFormValues {
  if (mode === "edit" && initialCustomer) {
    return {
      customerCode: initialCustomer.customerCode,
      nameTh: initialCustomer.nameTh,
      taxId: initialCustomer.taxId,
      address: initialCustomer.address,
      contactName: initialCustomer.contactName,
      contactPhone: initialCustomer.contactPhone,
      email: initialCustomer.email,
      customerType: initialCustomer.customerType,
      defaultCreditDays: initialCustomer.defaultCreditDays,
      isActive: initialCustomer.isActive,
    };
  }

  return {
    customerCode: "",
    nameTh: "",
    taxId: "",
    address: "",
    contactName: "",
    contactPhone: "",
    email: "",
    customerType: undefined,
    defaultCreditDays: 0,
    isActive: true,
  };
}

function CustomerFormBody({
  mode,
  initialCustomer,
  formRef,
}: {
  mode: "create" | "edit";
  initialCustomer?: Customer | null;
  formRef: MutableRefObject<FormInstance<CustomerFormValues> | null>;
}) {
  const [form] = Form.useForm<CustomerFormValues>();
  const isCreateMode = mode === "create";

  useEffect(() => {
    formRef.current = form;
    return () => {
      formRef.current = null;
    };
  }, [form, formRef]);

  return (
    <>
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE CUSTOMER" : "EDIT CUSTOMER"}
          </div>

          <h2>{isCreateMode ? "เพิ่มลูกค้า" : "แก้ไขข้อมูลลูกค้า"}</h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลลูกค้าใหม่ รหัสลูกค้าต้องไม่ซ้ำ"
              : "แก้ไขรายละเอียดลูกค้าและสถานะการใช้งาน"}
          </p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={styles.form}
        initialValues={getInitialValues(mode, initialCustomer)}
        preserve={false}
      >
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>ข้อมูลลูกค้า</strong>
            <span>ระบุรหัส ชื่อ และประเภทลูกค้า</span>
          </div>
        </div>

        <Form.Item
          label="รหัสลูกค้า"
          name="customerCode"
          rules={[
            { required: true, message: "กรุณากรอกรหัสลูกค้า" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น CUST-00001"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="ชื่อลูกค้า"
          name="nameTh"
          rules={[
            { required: true, message: "กรุณากรอกชื่อลูกค้า" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item label="ประเภทลูกค้า" name="customerType">
          <Select
            size="large"
            allowClear
            placeholder="เลือกประเภทลูกค้า"
            options={CUSTOMER_TYPES.map((type) => ({
              value: type,
              label: CUSTOMER_TYPE_LABEL[type] ?? type,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="เลขประจำตัวผู้เสียภาษี"
          name="taxId"
          rules={[{ max: 50, message: "ไม่เกิน 50 ตัวอักษร" }]}
        >
          <Input
            size="large"
            placeholder="เช่น 0-1234-56789-01-2"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item label="ที่อยู่" name="address">
          <Input.TextArea
            rows={3}
            placeholder="ที่อยู่ของลูกค้า"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>ผู้ติดต่อ</strong>
            <span>ข้อมูลผู้ติดต่อของลูกค้า</span>
          </div>
        </div>

        <Form.Item
          label="ชื่อผู้ติดต่อ"
          name="contactName"
          rules={[{ max: 255, message: "ไม่เกิน 255 ตัวอักษร" }]}
        >
          <Input
            size="large"
            placeholder="เช่น คุณสมชาย ใจดี"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="เบอร์ติดต่อ"
          name="contactPhone"
          rules={[{ max: 50, message: "ไม่เกิน 50 ตัวอักษร" }]}
        >
          <Input
            size="large"
            placeholder="เช่น 081-234-5678"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="อีเมล"
          name="email"
          rules={[{ type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" }]}
        >
          <Input
            size="large"
            placeholder="เช่น contact@example.com"
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>เงื่อนไขเครดิต</strong>
            <span>จำนวนวันเครดิตเริ่มต้นของลูกค้า</span>
          </div>
        </div>

        <Form.Item label="จำนวนวันเครดิต (วัน)" name="defaultCreditDays">
          <InputNumber
            size="large"
            min={0}
            step={1}
            style={{ width: "100%" }}
            placeholder="0"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกลูกค้านี้ในเอกสารได้</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>
      </Form>
    </>
  );
}

export default function CustomerFormModal({
  open,
  mode,
  initialCustomer,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: CustomerFormModalProps) {
  const formRef = useRef<FormInstance<CustomerFormValues> | null>(null);
  const isCreateMode = mode === "create";

  const handleOk = async () => {
    const values = await formRef.current?.validateFields();
    if (!values) {
      return;
    }

    onSubmit({
      customerCode: values.customerCode.trim(),
      nameTh: values.nameTh.trim(),
      taxId: values.taxId?.trim() || undefined,
      address: values.address?.trim() || undefined,
      contactName: values.contactName?.trim() || undefined,
      contactPhone: values.contactPhone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      customerType: values.customerType || undefined,
      defaultCreditDays: values.defaultCreditDays ?? 0,
      isActive: values.isActive,
    });
  };

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
      <CustomerFormBody
        mode={mode}
        initialCustomer={initialCustomer}
        formRef={formRef}
      />
    </Modal>
  );
}
