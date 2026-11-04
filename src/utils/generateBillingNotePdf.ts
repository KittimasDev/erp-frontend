import {
  BILLING_NOTE_STATUS_LABEL,
  BILLING_PV_STATUS_LABEL,
  type BillingNoteDetail,
} from "@/types/billing-notes";

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

/** ใบวางบิล (เจ้าหนี้) — ใช้ template เอกสารกลุ่มเดียวกับใบตั้งหนี้ */
export function buildBillingNotePdfData(n: BillingNoteDetail): SalesCommercialPdfData {
  const infoRows: SalesCommercialPdfInfoRow[] = [
    { label: "เจ้าหนี้", value: `${n.creditorCode} ${n.creditorName}`.trim(), emphasis: true },
    { label: "วันที่นัดชำระ", value: thaiDate(n.appointmentDate) },
    { label: "สถานะ", value: BILLING_NOTE_STATUS_LABEL[n.status] ?? n.status },
    { label: "สถานะใบสำคัญจ่าย", value: BILLING_PV_STATUS_LABEL[n.pvStatus] ?? n.pvStatus },
  ];

  const draftBanner =
    n.status === "CONFIRMED"
      ? undefined
      : n.status === "CANCELLED"
        ? `ยกเลิกแล้ว${n.cancelReason ? ` — ${n.cancelReason}` : ""}`
        : "ร่าง — ยังไม่ยืนยัน";

  return {
    pageId: "billing-note-pdf",
    titleTh: "ใบวางบิล",
    titleEn: "BILLING NOTE",
    docNo: n.billingNo,
    docDate: thaiDate(n.billingDate),
    draftBanner,
    infoRows,
    items: n.items.map((item, index) => ({
      no: index + 1,
      itemCode: item.docNo,
      itemName: `ใบตั้งหนี้ ${item.docNo}${item.poNo ? ` (PO ${item.poNo})` : ""}${item.dueDate ? ` · ครบกำหนด ${thaiDate(item.dueDate)}` : ""}`,
      unit: "ใบ",
      qty: 1,
      unitPrice: item.amount,
      amount: item.amount,
    })),
    columnLabels: {
      code: "เลขที่ AP",
      name: "รายการ",
      unit: "หน่วย",
      qty: "จำนวน",
      price: "ยอดวางบิล",
      amount: "จำนวนเงิน",
    },
    withPrices: true,
    totalAmount: n.totalAmount,
    totalsLines: [
      { label: "ยอดวางบิลรวม", value: n.totalAmount, grand: true },
      { label: "ออกใบสำคัญจ่ายแล้ว", value: n.issuedPvAmount },
      { label: "คงเหลือที่ออกได้", value: n.remainingAmount },
    ],
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
