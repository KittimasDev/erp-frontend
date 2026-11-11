"use client";

import { DatePicker, Form, Input, Select } from "antd";

import { useT, tNow } from "@/lib/i18n/useT";
import type { VoucherBankAccount } from "@/types/payment-vouchers";

export const PAYMENT_METHOD_OPTIONS = [
  { value: "TRANSFER", label: "โอนเงิน" },
  { value: "CHEQUE", label: "เช็ค" },
  { value: "CASH", label: "อื่น ๆ (เงินสด)" },
];

export const paymentMethodLabel = (v?: string) =>
  tNowOpt(PAYMENT_METHOD_OPTIONS.find((o) => o.value === v)?.label) ?? v ?? "—";

const tNowOpt = (s?: string) => (s ? tNow(s) : undefined);

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
  const t = useT();
  const method = Form.useWatch("paymentMethod");
  const needsBank = method === "TRANSFER" || method === "CHEQUE";
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px" }}>
        <Form.Item name="voucherDate" label={t("วันที่เอกสาร")} rules={[{ required: true, message: t("ระบุวันที่เอกสาร") }]}>
          <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} disabled={disabled} />
        </Form.Item>
        <Form.Item name="paymentMethod" label={t("วิธีชำระ")} rules={[{ required: true, message: t("เลือกวิธีชำระ") }]}>
          <Select options={PAYMENT_METHOD_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} disabled={disabled} />
        </Form.Item>
        <Form.Item name="desiredPayDate" label={t("วันที่ต้องการจ่าย")}>
          <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} disabled={disabled} />
        </Form.Item>
        <Form.Item
          name="companyBankAccountId"
          label={t("ธนาคาร / บัญชีที่ใช้จ่าย")}
          extra={needsBank ? t("ต้องเลือกก่อนส่งอนุมัติ") : undefined}
        >
          <Select
            allowClear
            disabled={disabled}
            placeholder={bankAccounts.length === 0 ? t("ยังไม่มีบัญชีธนาคารบริษัท (ตั้งค่าที่ข้อมูลบริษัท)") : t("เลือกบัญชี")}
            options={bankAccounts.map((b) => ({ value: b.id, label: bankLabel(b) }))}
          />
        </Form.Item>
      </div>
      <Form.Item name="remark" label={t("หมายเหตุ")}>
        <Input.TextArea rows={2} maxLength={5000} disabled={disabled} />
      </Form.Item>
    </>
  );
}
