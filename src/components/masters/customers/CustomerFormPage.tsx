"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, InputNumber, Select, Space, Switch, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateCustomerMutation } from "@/hooks/customers/useCreateCustomerMutation";
import { useUpdateCustomerMutation } from "@/hooks/customers/useUpdateCustomerMutation";
import { useCustomerQuery } from "@/hooks/customers/useCustomerQuery";
import { CUSTOMER_TYPES } from "@/types/customers";
import type { CreateCustomerRequest } from "@/types/customers";
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

type CustomerFormPageProps = {
  mode: "create" | "edit";
  customerId?: string;
};

export default function CustomerFormPage({
  mode,
  customerId,
}: CustomerFormPageProps) {
  const router = useRouter();
  const [form] = Form.useForm<CustomerFormValues>();
  const customerQuery = useCustomerQuery(
    mode === "edit" ? customerId : undefined,
  );
  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();

  const customer = customerQuery.data?.data;
  const isCreateMode = mode === "create";
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isCreateMode) {
      form.setFieldsValue({
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
      });
      return;
    }

    if (!customer) {
      return;
    }

    form.setFieldsValue({
      customerCode: customer.customerCode,
      nameTh: customer.nameTh,
      taxId: customer.taxId,
      address: customer.address,
      contactName: customer.contactName,
      contactPhone: customer.contactPhone,
      email: customer.email,
      customerType: customer.customerType,
      defaultCreditDays: customer.defaultCreditDays,
      isActive: customer.isActive,
    });
  }, [form, isCreateMode, customer]);

  const goBack = () =>
    router.push(
      isCreateMode || !customerId ? "/customers" : `/customers/${customerId}`,
    );

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const body: CreateCustomerRequest = {
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
    };

    if (isCreateMode) {
      createMutation.mutate(body, {
        onSuccess: () => router.push("/customers"),
      });
      return;
    }

    if (!customerId) {
      return;
    }

    updateMutation.mutate(
      { id: customerId, body },
      { onSuccess: () => router.push(`/customers/${customerId}`) },
    );
  };

  return (
    <MasterPageGate isLoading={!isCreateMode && customerQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={goBack}
            className={styles.editButton}
          >
            กลับ
          </Button>

          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>
              {isCreateMode ? "CREATE CUSTOMER" : "EDIT CUSTOMER"}
            </div>
            <Typography.Title level={2} className={styles.pageTitle}>
              {isCreateMode ? "เพิ่มลูกค้า" : "แก้ไขข้อมูลลูกค้า"}
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              {isCreateMode
                ? "กรอกข้อมูลลูกค้าใหม่ รหัสลูกค้าต้องไม่ซ้ำ"
                : "แก้ไขรายละเอียดลูกค้าและสถานะการใช้งาน"}
            </Typography.Text>
          </div>

          <div />
        </div>

        <div className={styles.tableCard}>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            className={styles.form}
            onFinish={handleSubmit}
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

            <Form.Item
              label="ที่อยู่"
              name="address"
            >
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

            <Space style={{ marginTop: 24 }}>
              <Button onClick={goBack}>ยกเลิก</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                className={styles.createButton}
              >
                {isCreateMode ? "บันทึก" : "อัปเดต"}
              </Button>
            </Space>
          </Form>
        </div>
      </section>
    </MasterPageGate>
  );
}
