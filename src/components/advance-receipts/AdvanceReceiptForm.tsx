"use client";

import { useEffect, useRef, useState } from "react";
import { App, DatePicker, Input, InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { useCompanyBankAccountsQuery } from "@/hooks/company-profile/useCompanyBankAccountsQuery";
import {
  useAdvanceReceiptSuggestionQuery,
  useAdvanceSalesOrderSearchQuery,
} from "@/hooks/advance-receipts/useAdvanceReceipts";
import { useT } from "@/lib/i18n/useT";
import { AR_PAYMENT_METHOD_LABEL } from "@/types/ar-receipts";
import {
  ADVANCE_TYPE_LABEL,
  type AdvanceReceipt,
  type AdvanceReceiptInput,
} from "@/types/advance-receipts";

const METHODS = ["CASH", "TRANSFER", "CHEQUE"] as const;

function money(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdvanceReceiptForm({
  formId,
  initial,
  salesOrderId: presetSalesOrderId,
  onSubmit,
}: {
  formId: string;
  initial?: AdvanceReceipt;
  /** ใบสั่งขายที่มากับลิงก์จากรายการรอรับเงิน */
  salesOrderId?: string;
  onSubmit: (body: AdvanceReceiptInput) => void;
}) {
  const t = useT();
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState("");
  const [salesOrderId, setSalesOrderId] = useState(initial?.salesOrderId ?? presetSalesOrderId);
  const [docType, setDocType] = useState(initial?.docType ?? "DEPOSIT");
  const [receiptDate, setReceiptDate] = useState<Dayjs>(
    initial?.receiptDate ? dayjs(initial.receiptDate) : dayjs(),
  );
  const [total, setTotal] = useState<number | null>(
    initial ? Number(initial.totalAmount) : null,
  );
  const [method, setMethod] = useState(initial?.paymentMethod ?? "TRANSFER");
  const [bankId, setBankId] = useState<string | undefined>(initial?.companyBankAccountId);
  const [refNo, setRefNo] = useState(initial?.transactionRef ?? "");
  const [remark, setRemark] = useState(initial?.remark ?? "");
  const filledFor = useRef(initial?.salesOrderId);
  const orders = useAdvanceSalesOrderSearchQuery(keyword);
  const suggestion = useAdvanceReceiptSuggestionQuery(salesOrderId);
  const banks = useCompanyBankAccountsQuery(method !== "CASH");
  const suggested = suggestion.data?.data;

  useEffect(() => {
    if (!suggested || filledFor.current === suggested.salesOrderId) return;
    filledFor.current = suggested.salesOrderId;
    if (suggested.suggestedTotal) setTotal(Number(suggested.suggestedTotal));
  }, [suggested]);

  const preset =
    initial?.salesOrderId
      ? { id: initial.salesOrderId, label: `${initial.soNo ?? ""} — ${initial.customerName ?? ""}`.trim() }
      : suggested && suggested.salesOrderId === salesOrderId
        ? {
            id: suggested.salesOrderId,
            label: `${suggested.soNo} — ${suggested.customerCode ? `${suggested.customerCode} ` : ""}${suggested.customerName}`,
          }
        : undefined;
  const options = [
    ...(preset ? [{ value: preset.id, label: preset.label }] : []),
    ...(orders.data?.data ?? [])
      .filter((row) => row.id !== preset?.id)
      .map((row) => ({
        value: row.id,
        label: `${row.soNo} — ${row.customerCode ? `${row.customerCode} ` : ""}${row.customerName}`,
      })),
  ];

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        if (!salesOrderId) {
          message.warning(t("เลือกใบสั่งขาย"));
          return;
        }
        if (!total || total <= 0) {
          message.warning(t("ระบุยอดรวมที่รับ"));
          return;
        }
        if (method !== "CASH" && !bankId) {
          message.warning(t("เลือกบัญชีธนาคารของบริษัท"));
          return;
        }
        onSubmit({
          salesOrderId,
          docType,
          receiptDate: receiptDate.format("YYYY-MM-DD"),
          totalAmount: total,
          paymentMethod: method,
          companyBankAccountId: method === "CASH" ? undefined : bankId,
          transactionRef: refNo.trim() || undefined,
          remark: remark.trim() || undefined,
        });
      }}
      style={{ display: "grid", gap: 12, maxWidth: 720 }}
    >
      <div>
        <label>{t("ใบสั่งขาย")}</label>
        <Select
          showSearch
          filterOption={false}
          style={{ width: "100%" }}
          placeholder={t("ค้นหาใบสั่งขายหรือลูกค้า")}
          value={salesOrderId}
          options={options}
          onSearch={setKeyword}
          onChange={setSalesOrderId}
          notFoundContent={keyword.trim().length < 2 ? t("พิมพ์อย่างน้อย 2 ตัวอักษร") : undefined}
        />
        {suggested ? (
          <p style={{ margin: "6px 0 0", color: "#595959" }}>
            {suggested.customerName}
            {suggested.termName ? ` · ${suggested.termName}` : ""}
            {` · ${t("เปอร์เซ็นต์มัดจำ")} ${suggested.percent}%`}
            {suggested.suggestedTotal
              ? ` · ${t("ยอดที่ควรรับ")} ${money(suggested.suggestedTotal)}`
              : ` · ${t("เงื่อนไขนี้ไม่กำหนดยอดรับ — ใส่ยอดรวมเอง")}`}
          </p>
        ) : null}
      </div>
      <div>
        <label>{t("ประเภท")}</label>
        <Select
          style={{ width: "100%" }}
          value={docType}
          onChange={setDocType}
          options={Object.entries(ADVANCE_TYPE_LABEL).map(([value, label]) => ({
            value,
            label: t(label),
          }))}
        />
      </div>
      <div>
        <label>{t("วันรับเงิน")}</label>
        <DatePicker
          style={{ width: "100%" }}
          format="DD/MM/BBBB"
          allowClear={false}
          value={receiptDate}
          onChange={(value) => value && setReceiptDate(value)}
        />
      </div>
      <div>
        <label>{t("ยอดรวมที่รับ")}</label>
        <InputNumber
          style={{ width: "100%" }}
          min={0.01}
          precision={2}
          value={total ?? undefined}
          onChange={(value) => setTotal(typeof value === "number" ? value : null)}
        />
        <p style={{ margin: "6px 0 0", color: "#595959" }}>
          {t("VAT คำนวณจากอัตราของใบสั่งขายตอนบันทึก")}
        </p>
      </div>
      <div>
        <label>{t("วิธีรับเงิน")}</label>
        <Select
          style={{ width: "100%" }}
          value={method}
          onChange={(value) => {
            setMethod(value);
            if (value === "CASH") setBankId(undefined);
          }}
          options={METHODS.map((value) => ({
            value,
            label: t(AR_PAYMENT_METHOD_LABEL[value]),
          }))}
        />
      </div>
      {method !== "CASH" ? (
        <div>
          <label>{t("บัญชีธนาคารที่รับเงิน")}</label>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder={t("เลือกบัญชีธนาคารของบริษัท")}
            loading={banks.isLoading}
            value={bankId}
            onChange={setBankId}
            options={(banks.data ?? [])
              .filter((bank) => bank.isActive)
              .map((bank) => ({
                value: bank.id,
                label: `${bank.bankName} ${bank.accountNumber} (${bank.accountName})`,
              }))}
          />
        </div>
      ) : null}
      <div>
        <label>{t("เลขอ้างอิง (สลิป/เลขที่เช็ค)")}</label>
        <Input value={refNo} maxLength={255} onChange={(event) => setRefNo(event.target.value)} />
      </div>
      <div>
        <label>{t("หมายเหตุ")}</label>
        <Input.TextArea
          value={remark}
          maxLength={5000}
          rows={2}
          onChange={(event) => setRemark(event.target.value)}
        />
      </div>
    </form>
  );
}
