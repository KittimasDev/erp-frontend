import dayjs from "dayjs";

import {
  PAYMENT_RECORD_STATUS_LABEL,
  PV_SOURCE_LABEL,
  type PaymentRecordDetail,
} from "@/types/payment-vouchers";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesCommercialPdfInfoRow,
  type SalesCommercialPdfTotalsLine,
} from "./pdf-common";

function thaiDate(value?: string | null) {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return dayjs(new Date(y, m - 1, d)).format("DD/MM/BBBB");
}

function positive(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function recorded(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function purposeText(kind?: string | null) {
  if (kind === "ADVANCE") return "จ่ายชำระล่วงหน้า";
  if (kind === "DEPOSIT") return "ชำระมัดจำ";
  if (kind === "AP_PAYMENT") return "ชำระค่าสินค้า";
  return kind?.trim() || "—";
}

/**
 * บันทึกจ่ายเงิน (Payment Record) — ใช้ template เอกสารกลุ่มเดียวกับใบสำคัญจ่าย
 * ข้อมูลทั้งหมดมาจาก GET /api/payment-vouchers/payment-records/:id ไม่เติมค่าที่ต้นทางไม่มี
 * จ่ายแล้ว = แสตมป์ "จ่ายแล้ว" · ยกเลิก = แถบเตือนพร้อมเหตุผล
 */
export function buildPaymentRecordPdfData(d: PaymentRecordDetail): SalesCommercialPdfData {
  const info = d.voucherDetail;
  const v = info.voucher;
  const net = recorded(v.netAmount);
  const payable = recorded(v.totalAmount);
  const vat = positive(info.vatAmount);
  const wht = positive(v.whtAmount);
  const deposit = positive(info.depositDeductAmount);
  const paid = recorded(d.amount);

  const methodLabel =
    (SUPPLIER_PAYMENT_METHOD_LABEL as Record<string, string>)[d.paymentMethod] ?? d.paymentMethod ?? "—";
  const bank = d.bankAccount ? `${d.bankAccount.bankName} ${d.bankAccount.accountNumber}`.trim() : "";

  const payRows: SalesCommercialPdfInfoRow[] = [
    { label: "วิธีการ", value: methodLabel },
    { label: "วันที่จ่ายจริง", value: thaiDate(d.paymentDate) || "—" },
  ];
  if (d.paymentMethod === "CHEQUE") {
    payRows.push(
      { label: "ธนาคารเช็ค", value: d.chequeBankName || "—" },
      { label: "เลขที่เช็ค", value: d.chequeNo ?? d.transactionRef ?? "—" },
      { label: "วันที่เช็ค", value: thaiDate(d.chequeDate) || "—" },
      { label: "บัญชีที่สั่งจ่าย", value: bank || "—" },
    );
  } else if (d.paymentMethod === "TRANSFER") {
    payRows.push(
      { label: "บัญชีต้นทางที่ใช้จ่าย", value: bank || "—" },
      { label: "เลขอ้างอิงธุรกรรม", value: d.transactionRef || "—" },
    );
  } else {
    payRows.push({ label: "รายละเอียดการชำระ", value: d.otherMethodDetail || "—", full: true });
  }

  const purchaseOrders = (info.purchaseOrders ?? []).map((po) => po.poNo).filter(Boolean);
  const sourceText =
    info.sources.length > 0
      ? `${PV_SOURCE_LABEL[v.sourceType ?? ""] ?? v.sourceType ?? ""}: ${info.sources.map((s) => s.documentNo).join(", ")}`
      : "—";

  const items = info.apDocuments
    .flatMap((ap) => {
      const amount = recorded(ap.allocatedAmount);
      if (amount === undefined) return [];
      const itemName = [
        `ชำระใบตั้งหนี้ ${ap.docNo}`,
        ap.invoiceNo ? `ใบแจ้งหนี้ ${ap.invoiceNo}` : null,
        ap.poNo ? `PO ${ap.poNo}` : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · ");
      return [{ no: 0, itemCode: ap.docNo, itemName, unit: "รายการ", qty: 1, unitPrice: amount, amount }];
    })
    .map((item, index) => ({ ...item, no: index + 1 }));

  const totalsLines: SalesCommercialPdfTotalsLine[] = [
    ...(payable != null ? [{ label: "ยอดเงินตามใบสำคัญจ่าย", value: payable }] : []),
    ...(vat != null ? [{ label: "ภาษีมูลค่าเพิ่ม (รวมในยอดแล้ว)", value: vat }] : []),
    ...(wht != null
      ? [
          {
            label: Number(info.whtRate) > 0 && (info.whtLines?.length ?? 0) <= 1
              ? `ภาษีหัก ณ ที่จ่าย ${Number(info.whtRate)}%`
              : "ภาษีหัก ณ ที่จ่าย",
            value: wht,
          },
        ]
      : []),
    ...(deposit != null ? [{ label: "ยอดหักมัดจำ", value: deposit }] : []),
    ...(net != null ? [{ label: "ยอดจ่ายสุทธิ (ตามใบสำคัญจ่าย)", value: net }] : []),
    ...(paid != null ? [{ label: "ยอดจ่ายจริง", value: paid, grand: true }] : []),
  ];

  const cancelled = d.status === "CANCELLED";
  const isPaid = d.status === "PAID";
  const statusLabel = PAYMENT_RECORD_STATUS_LABEL[d.status] ?? d.status;

  return {
    pageId: "payment-record-pdf",
    titleTh: "บันทึกจ่ายเงิน",
    titleEn: "PAYMENT RECORD",
    docNo: d.paymentNo ?? v.voucherNo,
    docDate: thaiDate(d.documentDate) || "—",
    draftBanner: cancelled
      ? `ยกเลิกแล้ว${d.cancelReason ? ` — ${d.cancelReason}` : ""}`
      : isPaid
        ? undefined
        : statusLabel,
    statusStamp: isPaid ? "จ่ายแล้ว" : undefined,
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลเจ้าหนี้และเอกสารอ้างอิง",
        rows: [
          {
            label: "เจ้าหนี้",
            value: `${info.supplier.creditorCode ?? ""} ${info.supplier.nameTh}`.trim(),
            emphasis: true,
          },
          { label: "เลขประจำตัวผู้เสียภาษี", value: info.supplier.taxId || "—" },
          { label: "ใบสำคัญจ่ายอ้างอิง", value: v.voucherNo },
          { label: "วัตถุประสงค์", value: purposeText(v.paymentKind) },
          { label: "เอกสารต้นทาง", value: sourceText },
          { label: "อ้างอิง PO", value: purchaseOrders.length > 0 ? purchaseOrders.join(", ") : "—" },
        ],
      },
      { title: "ข้อมูลการจ่ายเงินจริง", rows: payRows },
    ],
    items,
    columnLabels: {
      code: "เลขที่ AP",
      name: "รายการ",
      unit: "หน่วย",
      qty: "จำนวน",
      price: "ยอดจ่าย",
      amount: "จำนวนเงิน",
    },
    withPrices: true,
    totalAmount: paid ?? net ?? payable ?? 0,
    totalsLines,
    remark: d.remark ?? "",
    signatures: [
      { title: "ผู้บันทึกจ่าย", name: d.paidByName },
      { title: "ผู้อนุมัติ", name: info.approvedByAction?.name },
      "ผู้รับเงิน",
    ],
  };
}

export async function generatePaymentRecordPdf(d: PaymentRecordDetail) {
  await generateSalesCommercialPdf(buildPaymentRecordPdfData(d));
}
