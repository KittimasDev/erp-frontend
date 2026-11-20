"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";

import { ensureCompanyInfo } from "@/lib/company/company-info";
import { BE_DATE_FORMAT } from "@/lib/datetime/buddhist-era";
import { useT } from "@/lib/i18n/useT";
import { tStatus } from "@/types/purchase-orders";
import type { PaymentVoucherDetail } from "@/types/payment-vouchers";
import type {
  SupplierPaymentBankAccount,
  SupplierPaymentVoucher,
} from "@/types/purchase-payments";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL,
} from "@/types/purchase-payments";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

import styles from "./PurchasePaymentDetailPage.module.css";

type Props = {
  voucher: SupplierPaymentVoucher;
  detail?: PaymentVoucherDetail;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(BE_DATE_FORMAT) : "";
}

function formatMoney(value?: string | number | null) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function unique(values: string[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function bankText(bank?: Pick<SupplierPaymentBankAccount, "bankName" | "accountNumber"> | null) {
  if (!bank) return "";
  return [bank.bankName, bank.accountNumber].filter(Boolean).join(" / ");
}

function purposeText(
  kind: string | undefined,
  t: (thai: string, params?: Record<string, string | number>) => string,
) {
  if (kind === "ADVANCE") return t("จ่ายชำระล่วงหน้า");
  if (kind === "DEPOSIT") return t("ชำระมัดจำ");
  if (kind === "AP_PAYMENT") return t("ชำระค่าสินค้า");
  return "";
}

export default function PurchasePaymentSheet({ voucher, detail }: Props) {
  const t = useT();
  const [brand, setBrand] = useState("");

  useEffect(() => {
    let active = true;
    void ensureCompanyInfo()
      .then((info) => {
        if (active) setBrand(info.shortName);
      })
      .catch(() => {
        if (active) setBrand("");
      });
    return () => {
      active = false;
    };
  }, []);

  const activePayments = (voucher.payments ?? []).filter(
    (payment) => payment.status !== "CANCELLED",
  );
  const purpose = purposeText(voucher.paymentKind, t);
  const creditorCode = detail?.supplier.creditorCode ?? voucher.creditor?.creditorCode;
  const creditorName = detail?.supplier.nameTh || voucher.creditor?.nameTh;
  const creditorLine = [creditorCode, creditorName].filter(Boolean).join(" ") || "—";
  const taxId = detail?.supplier.taxId?.trim() || "—";
  const purchaseOrders =
    detail?.purchaseOrders && detail.purchaseOrders.length > 0
      ? detail.purchaseOrders
      : voucher.purchaseOrder
        ? [{ id: voucher.purchaseOrder.id, poNo: voucher.purchaseOrder.poNo }]
        : [];
  const methodLabel =
    SUPPLIER_PAYMENT_METHOD_LABEL[voucher.paymentMethod] ?? voucher.paymentMethod;
  const payDates = unique(
    activePayments.map((payment) => formatDate(payment.paymentDate)),
  );
  const payDate = payDates.length > 0 ? payDates.join(", ") : formatDate(voucher.paidAt);
  const paymentBanks = unique(
    activePayments.map((payment) => bankText(payment.bankAccount)),
  );
  const banks =
    paymentBanks.length > 0
      ? paymentBanks
      : unique([
          bankText(voucher.companyBankAccount) || bankText(detail?.bankAccount),
        ]);
  const refs = unique(
    activePayments.map((payment) => payment.transactionRef?.trim() ?? ""),
  );
  const statusLabel =
    SUPPLIER_PAYMENT_STATUS_LABEL[voucher.status] ?? voucher.status;
  const statusClass =
    voucher.status === "PAID"
      ? styles.sheetStatusPaid
      : voucher.status === "CANCELLED" || voucher.status === "REJECTED"
        ? styles.sheetStatusMuted
        : styles.sheetStatus;

  const apLines = detail?.apDocuments ?? [];
  const paidDocs = voucher.paidDocuments ?? [];
  const lines =
    apLines.length > 0
      ? apLines.map((row) => ({
          key: row.id,
          docNo: row.docNo,
          detail: [purpose, row.invoiceNo].filter(Boolean).join(" · ") || "—",
          payable: row.payableAmount ?? row.allocatedAmount,
          paid: row.allocatedAmount,
        }))
      : paidDocs.length > 0
        ? paidDocs.map((row, index) => ({
            key: `${row.apDocumentNo}-${index}`,
            docNo: row.apDocumentNo,
            detail:
              [purpose, row.invoiceNo, row.creditNoteNo].filter(Boolean).join(" · ") ||
              "—",
            payable: row.amount,
            paid: row.amount,
          }))
        : [
            {
              key: "source",
              docNo: voucher.purchaseOrder?.poNo || voucher.sourceNo || "—",
              detail: purpose || "—",
              payable: voucher.totalAmount,
              paid: voucher.totalAmount,
            },
          ];

  const words = numberToThaiBahtText(voucher.netAmount);
  const paidNames = unique([
    ...activePayments.map((payment) => payment.paidBy?.displayName ?? ""),
    voucher.paidBy?.displayName ?? "",
  ]);

  return (
    <div className={styles.sheetStage}>
      <article className={styles.sheet}>
        <header className={styles.sheetHead}>
          <div>
            <div className={styles.sheetLabel}>{t("เลขที่เอกสาร")}</div>
            <div className={styles.sheetHeadValue}>{voucher.voucherNo}</div>
          </div>
          <div>
            <div className={styles.sheetLabel}>{t("วันที่เอกสาร")}</div>
            <div className={styles.sheetHeadValue}>
              {formatDate(voucher.voucherDate) || "—"}
            </div>
          </div>
          <div>
            <div className={styles.sheetLabel}>{t("สถานะ")}</div>
            <div className={statusClass}>{tStatus(statusLabel)}</div>
          </div>
        </header>

        <div className={styles.sheetCols}>
          <section>
            <h2 className={styles.sheetTitle}>{t("ข้อมูลเจ้าหนี้")}</h2>
            <p className={styles.partyName}>{creditorLine}</p>
            <p className={styles.field}>
              <span className={styles.fieldLabel}>{t("เลขประจำตัวผู้เสียภาษี")}: </span>
              {taxId}
            </p>
            <p className={styles.field}>
              <span className={styles.fieldLabel}>{t("วัตถุประสงค์")}: </span>
              {purpose || "—"}
            </p>
            <p className={styles.field}>
              <span className={styles.fieldLabel}>{t("อ้างอิง PO")}: </span>
              {purchaseOrders.length === 0
                ? "—"
                : purchaseOrders.map((po, index) => (
                    <span key={po.id}>
                      {index > 0 ? ", " : ""}
                      <Link href={`/purchase-orders/${po.id}`}>{po.poNo}</Link>
                    </span>
                  ))}
            </p>
          </section>
          <section>
            <h2 className={styles.sheetTitle}>{t("ข้อมูลการชำระเงิน")}</h2>
            <p className={styles.field}>
              <span className={styles.fieldLabel}>{t("วิธีการ")}: </span>
              {methodLabel ? t(methodLabel) : "—"}
            </p>
            <p className={styles.field}>
              <span className={styles.fieldLabel}>{t("วันที่จ่าย")}: </span>
              {payDate || "—"}
            </p>
            <p className={styles.field}>
              <span className={styles.fieldLabel}>{t("ธนาคาร / เลขบัญชีจ่าย")}: </span>
              {banks.join(" · ") || "—"}
            </p>
            <p className={styles.field}>
              <span className={styles.fieldLabel}>{t("เลขอ้างอิงธุรกรรม")}: </span>
              {refs.join(" · ") || "—"}
            </p>
          </section>
        </div>

        <section className={styles.sheetSection}>
          <h2 className={styles.sheetTitle}>{t("รายละเอียดเอกสารที่ชำระ")}</h2>
          <table className={styles.sheetTable}>
            <thead>
              <tr>
                <th>{t("เลขที่ AP / รายละเอียด")}</th>
                <th className={styles.sheetNum}>{t("ยอดเจ้าหนี้")}</th>
                <th className={styles.sheetNum}>{t("ยอดจ่าย")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key}>
                  <td>
                    <div className={styles.lineNo}>{line.docNo}</div>
                    <div className={styles.lineSub}>{line.detail}</div>
                  </td>
                  <td className={styles.sheetNum}>{formatMoney(line.payable)}</td>
                  <td className={styles.sheetNum}>{formatMoney(line.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.totals}>
            <div className={styles.totalLine}>
              <span>{t("ยอดรวมรายการจ่าย")}</span>
              <span>{formatMoney(voucher.totalAmount)}</span>
            </div>
            <div className={styles.totalLine}>
              <span>{t("VAT (รวมในยอดแล้ว)")}</span>
              <span>{formatMoney(voucher.vatAmount ?? detail?.vatAmount)}</span>
            </div>
            <div className={styles.totalLine}>
              <span>{t("หัก ณ ที่จ่าย")}</span>
              <span>{formatMoney(voucher.whtAmount)}</span>
            </div>
            <div className={styles.netBox}>
              <span>{t("ยอดจ่ายสุทธิ")}</span>
              <strong>{formatMoney(voucher.netAmount)}</strong>
            </div>
            {words ? <div className={styles.bahtWords}>{words}</div> : null}
          </div>
        </section>

        <section className={styles.sheetSection}>
          <h2 className={styles.sheetTitle}>{t("หมายเหตุ / หลักฐานประกอบ")}</h2>
          <p className={styles.noteBody}>{voucher.remark?.trim() || "—"}</p>
        </section>

        <div className={styles.sigs}>
          <Signature
            role={t("ผู้จัดทำ")}
            name={detail?.createdByAction?.name ?? voucher.createdBy?.displayName}
            at={detail?.createdByAction?.at ?? voucher.createdAt}
          />
          <Signature
            role={t("ผู้ตรวจสอบ")}
            name={detail?.reviewedByAction?.name}
            at={detail?.reviewedByAction?.at}
          />
          <Signature
            role={t("ผู้อนุมัติ")}
            name={detail?.approvedByAction?.name}
            at={detail?.approvedByAction?.at ?? voucher.approvedAt}
          />
          <Signature
            role={t("ผู้จ่ายเงิน")}
            name={paidNames.join(", ")}
            at={voucher.paidAt ?? activePayments[0]?.paymentDate}
          />
        </div>

        <footer className={styles.sheetFooter}>
          <span>
            {brand
              ? t("เอกสารออกจากระบบ ERP - {name}", { name: brand })
              : t("เอกสารออกจากระบบ ERP")}
          </span>
          <span>{t("หน้า 1 / 1")}</span>
        </footer>
      </article>
    </div>
  );
}

function Signature({
  role,
  name,
  at,
}: {
  role: string;
  name?: string;
  at?: string;
}) {
  const t = useT();
  const date = formatDate(at);
  const who = name?.trim();
  return (
    <div>
      <div className={styles.sigRole}>{role}</div>
      <div className={styles.sigLine} />
      {who ? <div className={styles.sigName}>{who}</div> : null}
      <div className={styles.sigDate}>
        {date ? t("วันที่ {date}", { date }) : t("วันที่ / /")}
      </div>
    </div>
  );
}
