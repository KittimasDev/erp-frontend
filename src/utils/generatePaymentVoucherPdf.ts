import {
  EXPRESS_STATUS_LABEL,
  PV_KIND_LABEL,
  PV_SOURCE_LABEL,
  VOUCHER_STATUS_LABEL,
  type PaymentVoucherDetail,
} from "@/types/payment-vouchers";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesCommercialPdfInfoRow,
} from "./pdf-common";

function thaiDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y + 543}`;
}

/**
 * ใบสำคัญจ่าย (Payment Voucher) — ใช้ template เอกสารกลุ่มเดียวกับใบตั้งหนี้/ใบสั่งซื้อ
 * ใบที่ยังไม่อนุมัติหรือยกเลิกจะพิมพ์ป้ายเตือนไว้หัวกระดาษ กันเอาใบร่างไปใช้เป็นใบจริง
 */
export function buildPaymentVoucherPdfData(d: PaymentVoucherDetail): SalesCommercialPdfData {
  const v = d.voucher;
  const total = Number(v.totalAmount) || 0;
  const wht = Number(v.whtAmount) || 0;
  const net = Number(v.netAmount) || total - wht;
  const multiRate = (d.whtLines?.length ?? 0) > 1;

  const bank = d.bankAccount;
  const infoRows: SalesCommercialPdfInfoRow[] = [
    {
      label: "เจ้าหนี้",
      value: `${d.supplier.creditorCode ?? ""} ${d.supplier.nameTh}`.trim(),
      emphasis: true,
    },
    { label: "เลขประจำตัวผู้เสียภาษี", value: d.supplier.taxId || "—" },
    {
      label: "เอกสารต้นทาง",
      value: `${PV_SOURCE_LABEL[v.sourceType ?? "PURCHASE_ORDER"] ?? v.sourceType ?? "—"} ${v.sourceNo ?? ""}`.trim(),
    },
    { label: "ประเภทการจ่าย", value: PV_KIND_LABEL[v.paymentKind ?? ""] ?? v.paymentKind ?? "—" },
    {
      label: "วิธีชำระเงิน",
      value:
        (SUPPLIER_PAYMENT_METHOD_LABEL as Record<string, string>)[v.paymentMethod] ??
        v.paymentMethod ??
        "—",
    },
    { label: "วันที่ต้องการจ่าย", value: thaiDate(d.desiredPayDate ?? v.desiredPayDate) },
    { label: "สถานะ", value: VOUCHER_STATUS_LABEL[v.status] ?? v.status },
    { label: "สถานะ Express", value: EXPRESS_STATUS_LABEL[d.expressStatus] ?? d.expressStatus ?? "—" },
  ];
  if (bank) {
    infoRows.push({
      label: "บัญชีบริษัทที่จ่าย",
      value: `${bank.bankName} ${bank.accountNumber} (${bank.accountName})`,
      full: true,
    });
  }

  const draftBanner =
    v.status === "APPROVED" || v.status === "PAID"
      ? undefined
      : v.status === "CANCELLED"
        ? "ยกเลิกแล้ว"
        : v.status === "PENDING_APPROVAL"
          ? "รออนุมัติ — ยังไม่อนุมัติ"
          : v.status === "REJECTED"
            ? "ไม่อนุมัติ"
            : "ร่าง — ยังไม่อนุมัติ";

  const apLines = d.apDocuments.map((ap, index) => ({
    no: index + 1,
    itemCode: ap.docNo,
    itemName: ap.poNo ? `ชำระใบตั้งหนี้ ${ap.docNo} (PO ${ap.poNo})` : `ชำระใบตั้งหนี้ ${ap.docNo}`,
    unit: "รายการ",
    qty: 1,
    unitPrice: Number(ap.allocatedAmount) || 0,
    amount: Number(ap.allocatedAmount) || 0,
  }));
  const items =
    apLines.length > 0
      ? apLines
      : [
          {
            no: 1,
            itemCode: v.sourceNo ?? "—",
            itemName: `${PV_SOURCE_LABEL[v.sourceType ?? "PURCHASE_ORDER"] ?? "เอกสารต้นทาง"} ${v.sourceNo ?? ""}`.trim(),
            unit: "รายการ",
            qty: 1,
            unitPrice: total,
            amount: total,
          },
        ];

  // WHT หลายอัตราแสดงแยกบรรทัดตามอัตราจริง ไม่ใช้อัตราเฉลี่ย
  const whtLines = multiRate
    ? (d.whtLines ?? []).map((l) => ({
        label: `ภาษีหัก ณ ที่จ่าย${l.incomeType ? ` ${l.incomeType}` : ""} ${Number(l.rate)}% (ฐาน ${Number(l.baseAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })})`,
        value: Number(l.whtAmount) || 0,
      }))
    : [{ label: wht > 0 ? `ภาษีหัก ณ ที่จ่าย ${Number(d.whtRate)}%` : "ภาษีหัก ณ ที่จ่าย", value: wht }];

  return {
    pageId: "payment-voucher-pdf",
    titleTh: "ใบสำคัญจ่าย",
    titleEn: "PAYMENT VOUCHER",
    docNo: v.voucherNo,
    docDate: thaiDate(v.voucherDate),
    draftBanner,
    infoRows,
    items,
    columnLabels: {
      code: "เลขที่เอกสาร",
      name: "รายการ",
      unit: "หน่วย",
      qty: "จำนวน",
      price: "ยอดจ่าย",
      amount: "จำนวนเงิน",
    },
    withPrices: true,
    totalAmount: net,
    totalsLines: [
      { label: "ยอดตามใบสำคัญจ่าย", value: total },
      ...(Number(d.vatAmount) > 0
        ? [{ label: "ภาษีมูลค่าเพิ่ม (รวมในยอดแล้ว)", value: Number(d.vatAmount) }]
        : []),
      ...whtLines,
      { label: "ยอดโอนสุทธิ", value: net, grand: true },
    ],
    remark: v.remark ?? "",
    signatures: [
      { title: "ผู้จัดทำ", name: d.createdByAction?.name },
      { title: "ผู้อนุมัติ", name: d.approvedByAction?.name },
      "ผู้รับเงิน",
    ],
  };
}

export async function generatePaymentVoucherPdf(d: PaymentVoucherDetail) {
  await generateSalesCommercialPdf(buildPaymentVoucherPdfData(d));
}
