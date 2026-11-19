import dayjs from "dayjs";

import type { ArBillingNote } from "@/types/ar-billing-notes";
import type { ArDebitNote } from "@/types/ar-adjustments";
import { AR_PAYMENT_METHOD_LABEL, type ArReceipt, type ArRefund } from "@/types/ar-receipts";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
} from "./pdf-common";

/**
 * เอกสารลูกหนี้ (ฝั่งขาย) ที่พิมพ์ได้ — ใบวางบิล · ใบเสร็จรับเงิน (ใบรับชำระ) · ใบเพิ่มหนี้ · ใบคืนเงิน
 * ใช้ template เอกสารกลุ่มเดียวกับใบวางบิลเจ้าหนี้ (ตาราง 3 คอลัมน์: เลขที่ / รายละเอียด / ยอด)
 */

function thaiDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return dayjs(new Date(y, m - 1, d)).format("DD/MM/BBBB");
}

const num = (v?: string | number | null) => Number(v ?? 0) || 0;

function statusBanner(status: string, cancelReason?: string | null, draftLabel = "ร่าง — ยังไม่ยืนยัน") {
  if (status === "CANCELLED") return `ยกเลิกแล้ว${cancelReason ? ` — ${cancelReason}` : ""}`;
  if (status === "DRAFT") return draftLabel;
  return undefined;
}

export function buildArBillingNotePdfData(n: ArBillingNote): SalesCommercialPdfData {
  return {
    pageId: "ar-billing-note-pdf",
    titleTh: "ใบวางบิล",
    titleEn: "BILLING NOTE",
    docNo: n.billingNo,
    docDate: thaiDate(n.billingDate),
    draftBanner: statusBanner(n.status, n.cancelReason),
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลลูกค้า",
        pairs: true,
        rows: [
          { label: "ชื่อลูกค้า", value: n.customerName ?? "" },
          { label: "รหัสลูกค้า", value: n.customerCode ?? "" },
          { label: "วันนัดรับเงิน", value: thaiDate(n.appointmentDate) },
        ],
      },
    ],
    items: [],
    itemGroups: [
      {
        heading: "รายการใบแจ้งหนี้ที่วางบิล",
        items: n.items.map((item, index) => ({
          no: index + 1,
          itemCode: item.invoiceNo,
          itemName: `${item.salesOrderNo ? `SO ${item.salesOrderNo} · ` : ""}ครบกำหนด ${thaiDate(item.dueDate)}`,
          unit: "",
          qty: 0,
          amount: num(item.amount),
        })),
      },
    ],
    columnLabels: { no: "ลำดับ", code: "เลขที่ใบแจ้งหนี้", name: "รายละเอียด", amount: "ยอดวางบิล" },
    withPrices: false,
    lineAmountTable: true,
    totalAmount: num(n.totalAmount),
    totalsLines: [{ label: "รวมยอดวางบิลทั้งสิ้น", value: num(n.totalAmount), grand: true }],
    remark: n.remark ?? "",
    signatures: [
      { title: "ผู้จัดทำ", name: n.createdByName },
      { title: "ผู้ยืนยัน", name: n.confirmedByName },
      "ผู้รับวางบิล (ลูกค้า)",
    ],
  };
}

export function buildArReceiptPdfData(r: ArReceipt): SalesCommercialPdfData {
  const isDeposit = r.receiptType === "DEPOSIT";
  const lines = isDeposit
    ? [
        {
          no: 1,
          itemCode: "—",
          itemName: "เงินมัดจำ/รับล่วงหน้า",
          unit: "",
          qty: 0,
          amount: num(r.receivedAmount),
        },
      ]
    : r.allocations
        .filter((a) => a.isActive || r.status === "CANCELLED")
        .map((a, index) => ({
          no: index + 1,
          itemCode: a.invoiceNo,
          itemName: `${a.salesOrderNo ? `SO ${a.salesOrderNo}` : "ชำระค่าสินค้า"}${num(a.whtAmount) > 0 ? ` · หัก ณ ที่จ่าย ${num(a.whtAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}` : ""}`,
          unit: "",
          qty: 0,
          amount: num(a.amount) + num(a.whtAmount),
        }));

  const totals = [
    ...(isDeposit ? [] : [{ label: "ตัดยอดใบแจ้งหนี้ (เงินสด)", value: num(r.allocatedAmount) }]),
    ...(num(r.whtAmount) > 0 ? [{ label: "ภาษีหัก ณ ที่จ่ายที่ลูกค้าหัก", value: num(r.whtAmount) }] : []),
    ...(!isDeposit && num(r.overpayAmount) > 0
      ? [{ label: "รับเกิน (เก็บเป็นเครดิตลูกค้า)", value: num(r.overpayAmount) }]
      : []),
    { label: "รวมเงินที่รับทั้งสิ้น", value: num(r.receivedAmount), grand: true },
  ];

  return {
    pageId: "ar-receipt-pdf",
    titleTh: "ใบเสร็จรับเงิน",
    titleEn: "RECEIPT",
    docNo: r.receiptNo,
    docDate: thaiDate(r.receiptDate),
    draftBanner: statusBanner(r.status, r.cancelReason),
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลการรับเงิน",
        pairs: true,
        rows: [
          { label: "ได้รับเงินจาก", value: r.customerName ?? "" },
          { label: "รหัสลูกค้า", value: r.customerCode ?? "" },
          { label: "วิธีรับชำระ", value: AR_PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod },
          { label: "เลขอ้างอิง", value: r.transactionRef ?? "—" },
          // อ้างอิงเอกสารที่เกี่ยวข้อง (ไม่แสดงบรรทัดที่ไม่มีข้อมูล)
          ...(
            [
              ["อ้างอิงใบสั่งขาย (SO)", r.salesOrders],
              ["อ้างอิงใบส่งสินค้า (DN)", r.deliveryOrders],
              ["อ้างอิงใบวางบิล", r.billingNotes],
            ] as const
          )
            .filter(([, refs]) => (refs ?? []).length > 0)
            .map(([label, refs]) => ({ label, value: (refs ?? []).map((x) => x.no).join(", ") })),
        ],
      },
    ],
    items: [],
    itemGroups: [{ heading: isDeposit ? "รายการรับเงินล่วงหน้า" : "รายการที่ชำระ", items: lines }],
    columnLabels: { no: "ลำดับ", code: "เลขที่ใบแจ้งหนี้", name: "รายละเอียด", amount: "จำนวนเงิน" },
    withPrices: false,
    lineAmountTable: true,
    totalAmount: num(r.receivedAmount),
    totalsLines: totals,
    remark: r.remark ?? "",
    signatures: [{ title: "ผู้รับเงิน", name: r.createdByName }, "ผู้ตรวจสอบ", "ลูกค้า"],
  };
}

export function buildArDebitNotePdfData(n: ArDebitNote): SalesCommercialPdfData {
  return {
    pageId: "ar-debit-note-pdf",
    titleTh: "ใบเพิ่มหนี้",
    titleEn: "DEBIT NOTE",
    docNo: n.debitNoteNo,
    docDate: thaiDate(n.debitNoteDate),
    draftBanner: statusBanner(n.status, n.cancelReason),
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลเอกสาร",
        pairs: true,
        rows: [
          { label: "ลูกค้า", value: n.customerName ?? "" },
          { label: "อ้างอิงใบแจ้งหนี้", value: n.invoiceNo ?? "" },
          { label: "เหตุผล", value: n.reason, full: true },
        ],
      },
    ],
    items: [],
    itemGroups: [
      {
        heading: "รายการเพิ่มหนี้",
        items: [
          {
            no: 1,
            itemCode: n.invoiceNo ?? "—",
            itemName: n.reason,
            unit: "",
            qty: 0,
            amount: num(n.subtotalAmount),
          },
        ],
      },
    ],
    columnLabels: { no: "ลำดับ", code: "อ้างอิงใบแจ้งหนี้", name: "รายละเอียด", amount: "จำนวนเงิน" },
    withPrices: false,
    lineAmountTable: true,
    totalAmount: num(n.totalAmount),
    totalsLines: [
      { label: "มูลค่าที่เพิ่ม (ก่อน VAT)", value: num(n.subtotalAmount) },
      { label: `ภาษีมูลค่าเพิ่ม ${num(n.vatPercent)}%`, value: num(n.vatAmount) },
      { label: "รวมยอดเพิ่มหนี้ทั้งสิ้น", value: num(n.totalAmount), grand: true },
    ],
    remark: n.remark ?? "",
    signatures: ["ผู้จัดทำ", "ผู้อนุมัติ", "ลูกค้า"],
  };
}

export function buildArRefundPdfData(f: ArRefund): SalesCommercialPdfData {
  return {
    pageId: "ar-refund-pdf",
    titleTh: "ใบคืนเงิน",
    titleEn: "REFUND VOUCHER",
    docNo: f.refundNo,
    docDate: thaiDate(f.refundDate),
    draftBanner: statusBanner(f.status, f.cancelReason),
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลการคืนเงิน",
        pairs: true,
        rows: [
          { label: "คืนเงินให้", value: f.customerName ?? "" },
          { label: "วิธีคืนเงิน", value: AR_PAYMENT_METHOD_LABEL[f.paymentMethod] ?? f.paymentMethod },
          { label: "เลขอ้างอิง", value: f.transactionRef ?? "—" },
        ],
      },
    ],
    items: [],
    itemGroups: [
      {
        heading: "รายการคืนเงิน",
        items: [
          {
            no: 1,
            itemCode: "—",
            itemName: "คืนเงินจากเครดิตลูกค้า (เงินรับเกิน/มัดจำ/ใบลดหนี้)",
            unit: "",
            qty: 0,
            amount: num(f.amount),
          },
        ],
      },
    ],
    columnLabels: { no: "ลำดับ", code: "อ้างอิง", name: "รายละเอียด", amount: "จำนวนเงิน" },
    withPrices: false,
    lineAmountTable: true,
    totalAmount: num(f.amount),
    totalsLines: [{ label: "รวมเงินที่คืนทั้งสิ้น", value: num(f.amount), grand: true }],
    remark: f.remark ?? "",
    signatures: ["ผู้จ่ายเงิน", "ผู้อนุมัติ", "ผู้รับเงิน"],
  };
}

export const generateArBillingNotePdf = (n: ArBillingNote) =>
  generateSalesCommercialPdf(buildArBillingNotePdfData(n));
export const generateArReceiptPdf = (r: ArReceipt) =>
  generateSalesCommercialPdf(buildArReceiptPdfData(r));
export const generateArDebitNotePdf = (n: ArDebitNote) =>
  generateSalesCommercialPdf(buildArDebitNotePdfData(n));
export const generateArRefundPdf = (f: ArRefund) =>
  generateSalesCommercialPdf(buildArRefundPdfData(f));
