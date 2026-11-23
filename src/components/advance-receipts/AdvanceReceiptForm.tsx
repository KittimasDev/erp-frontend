"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, App, DatePicker, Input, InputNumber, Select } from "antd";
import {
  BankOutlined,
  EditOutlined,
  FileSearchOutlined,
  WalletOutlined,
} from "@ant-design/icons";
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

import styles from "./AdvanceReceiptForm.module.css";

const METHODS = ["CASH", "TRANSFER", "CHEQUE"] as const;

const TYPE_HINT: Record<string, string> = {
  DEPOSIT: "เงินมัดจำตามเปอร์เซ็นต์ของใบสั่งขาย",
  PREPAYMENT: "เงินที่ลูกค้าจ่ายล่วงหน้าก่อนส่งสินค้า",
};

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
  onCanSaveChange,
}: {
  formId: string;
  initial?: AdvanceReceipt;
  /** ใบสั่งขายที่มากับลิงก์จากรายการรอรับเงิน */
  salesOrderId?: string;
  onSubmit: (body: AdvanceReceiptInput) => void;
  /** แจ้งหน้าแม่ว่าบันทึกได้หรือไม่ (เช่น ปิดปุ่มเมื่อยังรับได้อีก = 0) */
  onCanSaveChange?: (canSave: boolean) => void;
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
  const suggestion = useAdvanceReceiptSuggestionQuery(salesOrderId, initial?.id);
  const banks = useCompanyBankAccountsQuery(method !== "CASH");
  const suggested = suggestion.data?.data;

  const remainingReceivable = Number(suggested?.remainingReceivableAmount ?? NaN);
  const hasRoomInfo = Number.isFinite(remainingReceivable);
  const overCeiling =
    hasRoomInfo && total != null && total > remainingReceivable + 0.004;
  const noRoomLeft = hasRoomInfo && remainingReceivable <= 0;
  const canSave =
    Boolean(salesOrderId) &&
    total != null &&
    total > 0 &&
    !overCeiling &&
    !noRoomLeft &&
    (method === "CASH" || Boolean(bankId));

  useEffect(() => {
    onCanSaveChange?.(canSave);
  }, [canSave, onCanSaveChange]);

  useEffect(() => {
    if (!suggested || filledFor.current === suggested.salesOrderId) return;
    filledFor.current = suggested.salesOrderId;
    const remaining = Number(suggested.remainingReceivableAmount ?? NaN);
    if (suggested.suggestedTotal) {
      const want = Number(suggested.suggestedTotal);
      if (Number.isFinite(remaining)) {
        setTotal(Math.min(want, Math.max(0, remaining)));
      } else {
        setTotal(want);
      }
      return;
    }
    if (Number.isFinite(remaining) && remaining > 0 && !initial) {
      setTotal(remaining);
    }
  }, [suggested, initial]);

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

  // แถบเพดาน: รับแล้ว + ยอดครั้งนี้ เทียบเพดานทั้งหมด
  const ceiling = Number(suggested?.ceilingAmount ?? NaN);
  const received = Number(suggested?.receivedAmount ?? 0);
  const showBar = Number.isFinite(ceiling) && ceiling > 0;
  const pct = (value: number) => Math.max(0, Math.min(100, (value / ceiling) * 100));
  const thisAmount = total != null && total > 0 ? total : 0;
  const receivedPct = showBar ? pct(received) : 0;
  const thisPct = showBar ? Math.min(pct(thisAmount), 100 - receivedPct) : 0;

  const quickFills: Array<{ label: string; value: number }> = [];
  if (suggested?.suggestedTotal) {
    const want = Number(suggested.suggestedTotal);
    quickFills.push({
      label: `${t("ยอดที่ควรรับ")} ${money(hasRoomInfo ? Math.min(want, remainingReceivable) : want)}`,
      value: hasRoomInfo ? Math.min(want, Math.max(0, remainingReceivable)) : want,
    });
  }
  if (hasRoomInfo && remainingReceivable > 0) {
    quickFills.push({
      label: `${t("รับเต็มเพดาน")} ${money(remainingReceivable)}`,
      value: remainingReceivable,
    });
  }

  const methodLabel = t(AR_PAYMENT_METHOD_LABEL[method] ?? method);

  return (
    <form
      id={formId}
      className={styles.layout}
      onSubmit={(event) => {
        event.preventDefault();
        if (!salesOrderId) {
          message.warning(t("เลือกใบสั่งขาย"));
          return;
        }
        if (total == null || !(total > 0)) {
          message.warning(t("ยอดรับเงินต้องมากกว่า 0"));
          return;
        }
        if (noRoomLeft) {
          message.warning(t("ใบสั่งขายนี้รับเงินล่วงหน้าครบเพดานแล้ว"));
          return;
        }
        if (overCeiling) {
          message.warning(
            t("ยอดรับเกินเพดาน — ยังรับได้อีก {amount}", {
              amount: money(remainingReceivable),
            }),
          );
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
    >
      <div className={styles.formCard}>
        <div className={styles.formBody}>
          {/* 1. ใบสั่งขาย */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <FileSearchOutlined />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>{t("ใบสั่งขาย")}</h3>
                <p className={styles.sectionHint}>{t("เลือกใบสั่งขายที่ลูกค้าจะจ่ายเงินล่วงหน้า")}</p>
              </div>
            </div>
            <div className={styles.field}>
              <Select
                showSearch
                filterOption={false}
                style={{ width: "100%" }}
                size="large"
                placeholder={t("ค้นหาใบสั่งขายหรือลูกค้า")}
                value={salesOrderId}
                options={options}
                onSearch={setKeyword}
                onChange={(value) => {
                  filledFor.current = undefined;
                  setSalesOrderId(value);
                }}
                notFoundContent={keyword.trim().length < 2 ? t("พิมพ์อย่างน้อย 2 ตัวอักษร") : undefined}
              />
              {suggested ? (
                <p className={styles.help}>
                  {suggested.customerName}
                  {suggested.termName ? ` · ${suggested.termName}` : ""}
                  {` · ${t("เปอร์เซ็นต์มัดจำ")} ${suggested.percent}%`}
                  {suggested.suggestedTotal
                    ? ` · ${t("ยอดที่ควรรับ")} ${money(suggested.suggestedTotal)}`
                    : ` · ${t("เงื่อนไขนี้ไม่กำหนดยอดรับ — ใส่ยอดรวมเอง")}`}
                </p>
              ) : null}
            </div>
            {suggested && hasRoomInfo && (noRoomLeft || overCeiling) ? (
              <Alert
                style={{ marginTop: 12 }}
                type="warning"
                showIcon
                title={
                  noRoomLeft
                    ? t("รับครบเพดานแล้ว — ไม่สามารถบันทึกเพิ่มได้ (ยกเลิกใบเดิมก่อนถ้าต้องการรับใหม่)")
                    : t("ยอดรับเกินเพดาน — ยังรับได้อีก {amount}", {
                        amount: money(remainingReceivable),
                      })
                }
              />
            ) : null}
          </section>

          {/* 2. ประเภทและยอด */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <WalletOutlined />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>{t("ประเภทและยอดที่รับ")}</h3>
                <p className={styles.sectionHint}>{t("VAT คำนวณจากอัตราของใบสั่งขายตอนบันทึก")}</p>
              </div>
            </div>
            <div className={styles.grid}>
              <div className={`${styles.field} ${styles.full}`}>
                <label>{t("ประเภท")}</label>
                <div className={styles.typeGroup}>
                  {Object.entries(ADVANCE_TYPE_LABEL).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.typeOption} ${docType === value ? styles.typeOptionActive : ""}`}
                      aria-pressed={docType === value}
                      onClick={() => setDocType(value)}
                    >
                      <strong>{t(label)}</strong>
                      <span>{t(TYPE_HINT[value] ?? "")}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label>{t("วันรับเงิน")}</label>
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/BBBB"
                  allowClear={false}
                  value={receiptDate}
                  onChange={(value) => value && setReceiptDate(value)}
                />
              </div>
              <div className={`${styles.field} ${styles.amountInput}`}>
                <label>{t("ยอดรวมที่รับ")}</label>
                <InputNumber
                  precision={2}
                  max={hasRoomInfo ? remainingReceivable : undefined}
                  value={total ?? undefined}
                  status={(total != null && !(total > 0)) || overCeiling ? "error" : undefined}
                  disabled={noRoomLeft}
                  onChange={(value) => setTotal(typeof value === "number" ? value : null)}
                />
                {total != null && !(total > 0) ? (
                  <p className={styles.error}>{t("ยอดรับเงินต้องมากกว่า 0")}</p>
                ) : overCeiling ? (
                  <p className={styles.error}>
                    {t("ยอดรับเกินเพดาน — ยังรับได้อีก {amount}", {
                      amount: money(remainingReceivable),
                    })}
                  </p>
                ) : null}
              </div>
              {quickFills.length > 0 ? (
                <div className={`${styles.quickRow} ${styles.full}`}>
                  {quickFills.map((fill) => (
                    <button
                      key={fill.label}
                      type="button"
                      className={styles.quickBtn}
                      onClick={() => setTotal(fill.value)}
                    >
                      {fill.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {/* 3. การรับเงิน */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <BankOutlined />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>{t("วิธีรับเงิน")}</h3>
                <p className={styles.sectionHint}>{t("เงินสดไม่ต้องเลือกบัญชีธนาคาร")}</p>
              </div>
            </div>
            <div className={styles.grid}>
              <div className={`${styles.field} ${styles.full}`}>
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
                <div className={`${styles.field} ${styles.full}`}>
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
              <div className={`${styles.field} ${styles.full}`}>
                <label>{t("เลขอ้างอิง (สลิป/เลขที่เช็ค)")}</label>
                <Input value={refNo} maxLength={255} onChange={(event) => setRefNo(event.target.value)} />
              </div>
            </div>
          </section>

          {/* 4. หมายเหตุ */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <EditOutlined />
              </span>
              <h3 className={styles.sectionTitle}>{t("หมายเหตุ")}</h3>
            </div>
            <div className={styles.field}>
              <Input.TextArea
                value={remark}
                maxLength={5000}
                rows={3}
                onChange={(event) => setRemark(event.target.value)}
              />
            </div>
          </section>
        </div>
      </div>

      <aside className={styles.summaryCard}>
        <div>
          <p className={styles.summaryEyebrow}>Advance receipt</p>
          <h3 className={styles.summaryTitle}>
            {suggested ? suggested.soNo : preset ? preset.label : t("สรุปการรับเงิน")}
          </h3>
        </div>

        {suggested || preset ? (
          <>
            <div className={styles.previewBox}>
              <span className={styles.previewLabel}>{t("ยอดรวมที่รับ")}</span>
              <p className={`${styles.previewValue} ${overCeiling ? styles.previewValueOver : ""}`}>
                {total != null ? money(total) : "—"}
              </p>
            </div>

            {suggested && showBar ? (
              <div className={styles.ceiling}>
                <div className={styles.ceilingHead}>
                  <span>{t("เพดานรับเงินล่วงหน้า")}</span>
                  <strong>{money(ceiling)}</strong>
                </div>
                <div className={styles.bar} aria-hidden>
                  <div className={styles.barReceived} style={{ width: `${receivedPct}%` }} />
                  <div
                    className={overCeiling ? styles.barOver : styles.barThis}
                    style={{ width: `${overCeiling ? 100 - receivedPct : thisPct}%` }}
                  />
                </div>
                <div className={styles.legend}>
                  <span>
                    <i className={styles.dot} style={{ background: "#b7c58a" }} />
                    {t("รับแล้ว")}
                  </span>
                  <span>
                    <i
                      className={styles.dot}
                      style={{ background: overCeiling ? "#cf1322" : "#6f9720" }}
                    />
                    {t("ครั้งนี้")}
                  </span>
                </div>
              </div>
            ) : null}

            <div className={styles.summaryRows}>
              {suggested ? (
                <div className={styles.summaryRow}>
                  <span>{t("ลูกค้า")}</span>
                  <strong>{suggested.customerName}</strong>
                </div>
              ) : null}
              {suggested?.termName ? (
                <div className={styles.summaryRow}>
                  <span>{t("เงื่อนไขชำระ")}</span>
                  <strong>{suggested.termName}</strong>
                </div>
              ) : null}
              {suggested ? (
                <div className={styles.summaryRow}>
                  <span>{t("ยอดใบสั่งขาย")}</span>
                  <strong>{money(suggested.soTotalAmount)}</strong>
                </div>
              ) : null}
              {suggested && hasRoomInfo ? (
                <>
                  <div className={styles.summaryRow}>
                    <span>{t("รับแล้ว")}</span>
                    <strong>{money(suggested.receivedAmount)}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>{t("ยังรับได้อีก")}</span>
                    <strong>{money(suggested.remainingReceivableAmount)}</strong>
                  </div>
                </>
              ) : null}
              <div className={styles.summaryRow}>
                <span>{t("ประเภท")}</span>
                <strong>{t(ADVANCE_TYPE_LABEL[docType] ?? docType)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>{t("วิธีรับเงิน")}</span>
                <strong>{methodLabel}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>{t("วันรับเงิน")}</span>
                <strong>{receiptDate.format("DD/MM/BBBB")}</strong>
              </div>
            </div>

            <div className={styles.flowNote}>
              <strong>{t("บันทึกแล้วเป็นร่าง")}</strong>
              <p>{t("ตรวจสอบแล้วกด «ยืนยันรับเงิน» ที่หน้ารายละเอียด และออกใบกำกับภาษีได้หลังรับเงิน")}</p>
            </div>
          </>
        ) : (
          <div className={styles.emptyHint}>
            {t("เลือกใบสั่งขายทางซ้าย เพื่อดูเพดานรับเงินและยอดที่ควรรับ")}
          </div>
        )}
      </aside>
    </form>
  );
}
