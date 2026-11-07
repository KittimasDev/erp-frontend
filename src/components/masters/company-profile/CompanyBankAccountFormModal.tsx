"use client";

import { useT } from "@/lib/i18n/useT";
import { useEffect } from "react";
import { AutoComplete, Checkbox, Form, Input, InputNumber, Modal, Select } from "antd";
import { BankOutlined } from "@ant-design/icons";

import { useGlAccountsQuery } from "@/hooks/gl-accounts/useGlAccounts";
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
  const t = useT();
  const [form] = Form.useForm<CreateCompanyBankAccountRequest>();
  const isEdit = Boolean(account);
  const glAccountsQuery = useGlAccountsQuery({ isActive: true });

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
        glAccountId: account.glAccountId ?? undefined,
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
      okText={isEdit ? t("บันทึกการแก้ไข") : t("เพิ่มบัญชี")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      className={styles.masterModal}
      title={
        <div className={styles.modalHeader}>
          <span className={styles.modalIcon}>
            <BankOutlined />
          </span>
          <div className={styles.modalHeaderContent}>
            <strong>{isEdit ? t("แก้ไขบัญชีธนาคาร") : t("เพิ่มบัญชีธนาคาร")}</strong>
            <span>{t("บัญชีของบริษัทที่ใช้พิมพ์บนเอกสารรับ/จ่ายเงิน")}</span>
          </div>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        className={styles.form}
        // allowClear ให้ค่า undefined → ส่ง null เพื่อให้ล้างการผูกบัญชีได้จริง
        onFinish={(values) => onSubmit({ ...values, glAccountId: values.glAccountId ?? null })}
        requiredMark={false}
      >
        <Form.Item
          name="bankName"
          label={t("ธนาคาร")}
          rules={[{ required: true, message: t("กรุณากรอกชื่อธนาคาร") }]}
        >
          <AutoComplete
            options={COMPANY_BANK_NAME_OPTIONS.map((o) => ({ ...o, label: t(o.value) }))}
            placeholder={t("เลือกหรือพิมพ์ชื่อธนาคาร")}
            maxLength={150}
            filterOption={(input, option) =>
              (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          name="accountName"
          label={t("ชื่อบัญชี")}
          rules={[{ required: true, message: t("กรุณากรอกชื่อบัญชี") }]}
        >
          <Input placeholder={t("ปกติคือชื่อบริษัท")} maxLength={255} />
        </Form.Item>

        <Form.Item
          name="accountNumber"
          label={t("เลขที่บัญชี")}
          rules={[{ required: true, message: t("กรุณากรอกเลขที่บัญชี") }]}
        >
          <Input placeholder={t("เช่น 123-4-56789-0")} maxLength={50} />
        </Form.Item>

        <Form.Item name="branchName" label={t("สาขา")}>
          <Input placeholder={t("เช่น สาขาสำนักงานใหญ่")} maxLength={150} />
        </Form.Item>

        <Form.Item
          name="glAccountId"
          label={t("บัญชีแยกประเภท (เงินฝากธนาคาร)")}
          extra={t("ใช้เป็นบัญชีฝั่งเครดิตในสมุดรายวันจ่าย/ไฟล์ Express — ไม่ผูกจะส่ง Express ไม่ได้เมื่อจ่ายผ่านบัญชีนี้")}
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t("ยังไม่ผูกบัญชี")}
            loading={glAccountsQuery.isLoading}
            options={(glAccountsQuery.data ?? []).map((a) => ({
              value: a.id,
              label: `${a.code} — ${a.nameTh}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="sortOrder" label={t("ลำดับการแสดงผล")}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="isDefault" valuePropName="checked">
          <Checkbox>
            {t("ตั้งเป็นบัญชีหลัก — เอกสารที่แสดงบัญชีเดียวจะใช้บัญชีนี้ (ระบบจะปลดบัญชีหลักเดิมให้เอง)")}
          </Checkbox>
        </Form.Item>

        <Form.Item name="isActive" valuePropName="checked">
          <Checkbox>{t("ใช้งาน")}</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
