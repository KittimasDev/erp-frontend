"use client";

import { useEffect } from "react";
import { AutoComplete, Checkbox, Form, Input, InputNumber, Modal } from "antd";
import { BankOutlined } from "@ant-design/icons";

import type {
  CompanyBankAccount,
  CreateCompanyBankAccountRequest,
} from "@/types/company-profile";
import styles from "@/components/masters/shared/master-page.module.css";

const COMPANY_BANK_NAME_OPTIONS = [
  "ธนาคารกรุงเทพ",
  "ธนาคารกสิกรไทย",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงศรีอยุธยา",
  "ธนาคารกรุงไทย",
  "ธนาคารทหารไทย",
  "ธนาคารธนชาต",
  "ธนาคารยูโอบี",
  "ธนาคารออมสิน",
  "ธนาคารเกียรตินาคินภัทร",
].map((value) => ({ value }));

type Props = {
  open: boolean;
  /** null = เพิ่มบัญชีใหม่ */
  account: CompanyBankAccount | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateCompanyBankAccountRequest) => void;
};

export default function CompanyBankAccountFormModal({
  open,
  account,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<CreateCompanyBankAccountRequest>();
  const isEdit = Boolean(account);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (account) {
      form.setFieldsValue({
        bankName: account.bankName,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        branchName: account.branchName ?? undefined,
        isDefault: account.isDefault,
        isActive: account.isActive,
        sortOrder: account.sortOrder,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, isDefault: false, sortOrder: 0 });
    }
  }, [account, form, open]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText={isEdit ? "บันทึกการแก้ไข" : "เพิ่มบัญชี"}
      cancelText="ยกเลิก"
      destroyOnHidden
      className={styles.masterModal}
      title={
        <div className={styles.modalHeader}>
          <span className={styles.modalIcon}>
            <BankOutlined />
          </span>
          <div className={styles.modalHeaderContent}>
            <strong>{isEdit ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร"}</strong>
            <span>บัญชีของบริษัทที่ใช้พิมพ์บนเอกสารรับ/จ่ายเงิน</span>
          </div>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        className={styles.form}
        onFinish={onSubmit}
        requiredMark={false}
      >
        <Form.Item
          name="bankName"
          label="ธนาคาร"
          rules={[{ required: true, message: "กรุณากรอกชื่อธนาคาร" }]}
        >
          <AutoComplete
            options={COMPANY_BANK_NAME_OPTIONS}
            placeholder="เลือกหรือพิมพ์ชื่อธนาคาร"
            maxLength={150}
            filterOption={(input, option) =>
              (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          name="accountName"
          label="ชื่อบัญชี"
          rules={[{ required: true, message: "กรุณากรอกชื่อบัญชี" }]}
        >
          <Input placeholder="ปกติคือชื่อบริษัท" maxLength={255} />
        </Form.Item>

        <Form.Item
          name="accountNumber"
          label="เลขที่บัญชี"
          rules={[{ required: true, message: "กรุณากรอกเลขที่บัญชี" }]}
        >
          <Input placeholder="เช่น 123-4-56789-0" maxLength={50} />
        </Form.Item>

        <Form.Item name="branchName" label="สาขา">
          <Input placeholder="เช่น สาขาสำนักงานใหญ่" maxLength={150} />
        </Form.Item>

        <Form.Item name="sortOrder" label="ลำดับการแสดงผล">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="isDefault" valuePropName="checked">
          <Checkbox>
            ตั้งเป็นบัญชีหลัก — เอกสารที่แสดงบัญชีเดียวจะใช้บัญชีนี้
            (ระบบจะปลดบัญชีหลักเดิมให้เอง)
          </Checkbox>
        </Form.Item>

        <Form.Item name="isActive" valuePropName="checked">
          <Checkbox>ใช้งาน</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
