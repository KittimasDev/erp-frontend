"use client";

import { useT } from "@/lib/i18n/useT";

import { useEffect } from "react";
import { Form, Input, Modal, Select } from "antd";

import { useCreateCustomerMutation } from "@/hooks/customers/useCreateCustomerMutation";
import {
  CUSTOMER_TYPES,
  type CreateCustomerRequest,
  type Customer,
} from "@/types/customers";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  DOMESTIC: "ในประเทศ",
  EXPORT: "ส่งออก",
  DEALER: "ตัวแทนจำหน่าย",
  GENERAL: "ทั่วไป",
};

type FormValues = {
  customerCode: string;
  nameTh: string;
  customerType?: string;
  taxId?: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
};

export default function QuickCreateCustomerModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateCustomerMutation();

  useEffect(() => {
    if (!open) {
      return;
    }
    form.setFieldsValue({
      customerCode: "",
      nameTh: "",
      customerType: "GENERAL",
      taxId: "",
      contactName: "",
      contactPhone: "",
      address: "",
    });
  }, [form, open]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const body: CreateCustomerRequest = {
      customerCode: values.customerCode.trim(),
      nameTh: values.nameTh.trim(),
      customerType: values.customerType || undefined,
      taxId: values.taxId?.trim() || undefined,
      contactName: values.contactName?.trim() || undefined,
      contactPhone: values.contactPhone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      defaultCreditDays: 0,
      isActive: true,
    };

    createMutation.mutate(body, {
      onSuccess: (res) => {
        onCreated(res.data);
        form.resetFields();
        onClose();
      },
    });
  };

  return (
    <Modal
      title={t("เพิ่มลูกค้าใหม่")}
      open={open}
      onCancel={onClose}
      onOk={() => void handleSubmit()}
      okText={t("บันทึกลูกค้า")}
      cancelText={t("ยกเลิก")}
      confirmLoading={createMutation.isPending}
      destroyOnHidden
      forceRender
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          label={t("รหัสลูกค้า")}
          name="customerCode"
          rules={[
            { required: true, message: t("กรอกรหัสลูกค้า") },
            { max: 50, message: t("ไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input placeholder={t("เช่น CUST-00001")} autoComplete="off" />
        </Form.Item>
        <Form.Item
          label={t("ชื่อลูกค้า")}
          name="nameTh"
          rules={[
            { required: true, message: t("กรอกชื่อลูกค้า") },
            { max: 255, message: t("ไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input placeholder={t("เช่น บริษัท ตัวอย่าง จำกัด")} autoComplete="off" />
        </Form.Item>
        <Form.Item label={t("ประเภทลูกค้า")} name="customerType">
          <Select
            allowClear
            placeholder={t("เลือกประเภท")}
            options={CUSTOMER_TYPES.map((type) => ({
              value: type,
              label: t(CUSTOMER_TYPE_LABEL[type] ?? type),
            }))}
          />
        </Form.Item>
        <Form.Item
          label={t("เลขประจำตัวผู้เสียภาษี")}
          name="taxId"
          rules={[{ max: 50, message: t("ไม่เกิน 50 ตัวอักษร") }]}
        >
          <Input placeholder={t("ไม่บังคับ")} autoComplete="off" />
        </Form.Item>
        <Form.Item label={t("ชื่อผู้ติดต่อ")} name="contactName">
          <Input placeholder={t("ไม่บังคับ")} autoComplete="off" />
        </Form.Item>
        <Form.Item label={t("เบอร์โทร")} name="contactPhone">
          <Input placeholder={t("ไม่บังคับ")} autoComplete="off" />
        </Form.Item>
        <Form.Item label={t("ที่อยู่")} name="address">
          <Input.TextArea rows={2} placeholder={t("ไม่บังคับ")} autoComplete="off" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
