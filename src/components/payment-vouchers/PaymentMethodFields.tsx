"use client";

import { DatePicker, Form, Input, Select } from "antd";

import type { VoucherBankAccount } from "@/types/payment-vouchers";

export const PAYMENT_METHOD_OPTIONS = [
  { value: "TRANSFER", label: "โอนเงิน" },
  { value: "CHEQUE", label: "เช็ค" },
  { value: "CASH", label: "อื่น ๆ (เงินสด)" },
];

export const paymentMethodLabel = (v?: string) =>
  PAYMENT_METHOD_OPTIONS.find((o) => o.value === v)?.label ?? v ?? "—";

export const bankLabel = (b?: VoucherBankAccount) =>
  b ? `${b.bankName} · ${b.accountNumber} (${b.accountName})` : "—";

/** 2.1 วันที่เอกสาร + 2.7 วิธีชำระเงิน/ธนาคาร/บัญชี/วันที่ต้องการจ่าย/หมายเหตุ — ใช้ทั้งหน้าสร้างและหน้าแก้ไข (ต้องอยู่ใน <Form>) */
export default function PaymentMethodFields({
  bankAccounts,
  disabled,
}: {
  bankAccounts: VoucherBankAccount[];
  disabled?: boolean;
}) {
  const method = Form.useWatch("paymentMethod");
  const needsBank = method === "TRANSFER" || method === "CHEQUE";
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px" }}>
        <Form.Item name="voucherDate" label="วันที่เอกสาร" rules={[{ required: true, message: "ระบุวันที่เอกสาร" }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} disabled={disabled} />
        </Form.Item>
        <Form.Item name="paymentMethod" label="วิธีชำระ" rules={[{ required: true, message: "เลือกวิธีชำระ" }]}>
          <Select options={PAYMENT_METHOD_OPTIONS} disabled={disabled} />
        </Form.Item>
        <Form.Item name="desiredPayDate" label="วันที่ต้องการจ่าย">
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} disabled={disabled} />
        </Form.Item>
        <Form.Item
          name="companyBankAccountId"
          label="ธนาคาร / บัญชีที่ใช้จ่าย"
          extra={needsBank ? "ต้องเลือกก่อนส่งอนุมัติ" : undefined}
        >
          <Select
            allowClear
            disabled={disabled}
            placeholder={bankAccounts.length === 0 ? "ยังไม่มีบัญชีธนาคารบริษัท (ตั้งค่าที่ข้อมูลบริษัท)" : "เลือกบัญชี"}
            options={bankAccounts.map((b) => ({ value: b.id, label: bankLabel(b) }))}
          />
        </Form.Item>
      </div>
      <Form.Item name="remark" label="หมายเหตุ">
        <Input.TextArea rows={2} maxLength={5000} disabled={disabled} />
      </Form.Item>
    </>
  );
}
