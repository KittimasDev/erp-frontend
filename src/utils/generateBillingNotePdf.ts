import dayjs from "dayjs";
import type { BillingNoteDetail } from "@/types/billing-notes";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
} from "./pdf-common";

function thaiDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return dayjs(new Date(y, m - 1, d)).format("DD/MM/BBBB");
}

/** ใบวางบิล (เจ้าหนี้) — ใช้ template เอกสารกลุ่มเดียวกับใบตั้งหนี้ */
export function buildBillingNotePdfData(n: BillingNoteDetail): SalesCommercialPdfData {
  const draftBanner =
    n.status === "CONFIRMED"
      ? undefined
      : n.status === "CANCELLED"
        ? `ยกเลิกแล้ว${n.cancelReason ? ` — ${n.cancelReason}` : ""}`
        : "ร่าง — ยังไม่ยืนยัน";

  const lines = n.items.map((item, index) => ({
    no: index + 1,
    itemCode: item.docNo,
    itemName: thaiDate(item.dueDate),
    unit: "",
    qty: 0,
    amount: item.amount,
  }));

  return {
    pageId: "billing-note-pdf",
    titleTh: "ใบวางบิล",
    titleEn: "BILLING NOTE",
    docNo: n.billingNo,
    docDate: thaiDate(n.billingDate),
    draftBanner,
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลเจ้าหนี้",
        pairs: true,
        rows: [
          { label: "ชื่อเจ้าหนี้", value: n.creditorName },
          { label: "รหัสเจ้าหนี้", value: n.creditorCode },
          { label: "ผู้ติดต่อ", value: n.contactName ?? "" },
          { label: "เบอร์โทรศัพท์", value: n.contactPhone ?? "" },
          { label: "ที่อยู่", value: n.creditorAddress ?? "" },
          { label: "วันที่นัดชำระ", value: thaiDate(n.appointmentDate) },
          { label: "เงื่อนไขการชำระเงิน", value: n.paymentTerm ?? "" },
        ],
      },
    ],
    items: [],
    itemGroups: [{ heading: "รายการเอกสารที่วางบิล", items: lines }],
    columnLabels: {
      no: "ลำดับ",
      code: "เลขที่ใบแจ้งหนี้",
      name: "กำหนดชำระ",
      amount: "ยอดวางบิล",
    },
    withPrices: false,
    lineAmountTable: true,
    totalAmount: n.totalAmount,
    totalsLines: [{ label: "รวมยอดวางบิลทั้งสิ้น", value: n.totalAmount, grand: true }],
    remark: n.remark ?? "",
    signatures: [
      { title: "ผู้จัดทำ", name: n.createdByName },
      { title: "ผู้ยืนยัน", name: n.confirmedByName },
      "ผู้รับวางบิล",
    ],
  };
}

export async function generateBillingNotePdf(n: BillingNoteDetail) {
  await generateSalesCommercialPdf(buildBillingNotePdfData(n));
}
