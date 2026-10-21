import { toJournalLineRows } from "@/components/ap-documents/apJournalVoucher.utils";
import type { PurchaseJournalItem } from "@/types/purchase-journal";

import { downloadPdfFromHtml, openPdfFromHtml } from "./pdf-common";

export type ApJournalVoucherPdfInput = {
  docNo: string;
  docTypeLabel: string;
  /** วันที่เอกสาร (แสดงตามที่ส่งมา เช่น 20/10/2569) */
  docDateText: string;
  creditorText: string;
  reference: string;
  description: string;
  remark?: string | null;
  internalNote?: string | null;
  entry: PurchaseJournalItem;
};

const PAGE_ID = "ap-journal-voucher-pdf";

const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneyOrBlank = (value: number) => (value > 0 ? money.format(value) : "");

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML ใบสำคัญสมุดรายวัน (A4 กว้าง 794px) หัวตารางสีฟ้าตามแบบ */
export function buildApJournalVoucherHtml(input: ApJournalVoucherPdfInput): string {
  const rows = toJournalLineRows(input.entry)
    .map((row) => {
      if (row.kind === "group") {
        return `<tr><td colspan="4" class="grp">${esc(row.label)}</td></tr>`;
      }
      if (row.kind === "total") {
        return `<tr class="tot"><td class="r">ยอดรวมสุทธิ</td><td class="n">${money.format(row.debit)}</td><td class="n">${money.format(row.credit)}</td><td></td></tr>`;
      }
      const { line } = row;
      const account = line.accountCode
        ? `<b>${esc(line.accountCode)}</b> / ${esc(line.accountName)}`
        : "<b>ยังไม่ผูกบัญชี</b>";
      const detail = line.detail ? ` <span class="sub">· ${esc(line.detail)}</span>` : "";
      return `<tr><td>${account}</td><td class="n">${moneyOrBlank(line.debit)}</td><td class="n">${moneyOrBlank(line.credit)}</td><td>${esc(line.description)}${detail}</td></tr>`;
    })
    .join("");

  return `
    <style>
      #${PAGE_ID} { width: 794px; box-sizing: border-box; padding: 40px 44px; background: #fff; color: #1f2937; font-family: inherit; }
      #${PAGE_ID} h1 { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
      #${PAGE_ID} .doc { margin: 0 0 18px; font-size: 13px; color: #6b7280; }
      #${PAGE_ID} .meta { display: grid; grid-template-columns: 110px 1fr; row-gap: 6px; font-size: 14px; }
      #${PAGE_ID} .meta b, #${PAGE_ID} .desc b, #${PAGE_ID} .foot b { font-weight: 600; }
      #${PAGE_ID} .desc { display: grid; grid-template-columns: 80px 1fr; margin: 18px 0 12px; font-size: 14px; }
      #${PAGE_ID} table { width: 100%; border-collapse: collapse; font-size: 13px; }
      #${PAGE_ID} th { background: #739816; color: #fff; font-weight: 600; text-align: left; padding: 8px 10px; }
      #${PAGE_ID} th.n { text-align: right; }
      #${PAGE_ID} td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
      #${PAGE_ID} td.n { text-align: right; white-space: nowrap; }
      #${PAGE_ID} td.r { text-align: right; font-weight: 600; }
      #${PAGE_ID} td.grp { background: #f2f6e8; font-weight: 600; }
      #${PAGE_ID} tr.tot td { border-bottom: 0; font-weight: 600; }
      #${PAGE_ID} .sub { color: #6b7280; }
      #${PAGE_ID} .note { margin-top: 10px; font-size: 11px; color: #8a94a6; }
      #${PAGE_ID} .foot { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; font-size: 14px; }
    </style>
    <div id="${PAGE_ID}">
      <h1>ใบสำคัญสมุดรายวันซื้อ</h1>
      <div class="doc">${esc(input.docTypeLabel)} ${esc(input.docNo)}</div>
      <div class="meta">
        <b>วันที่เอกสาร:</b><span>${esc(input.docDateText)}</span>
        <b>ผู้ติดต่อ:</b><span>${esc(input.creditorText)}</span>
        <b>เลขที่อ้างอิง:</b><span>${esc(input.reference)}</span>
      </div>
      <div class="desc"><b>คำอธิบาย:</b><span>${esc(input.description)}</span></div>
      <table>
        <thead><tr><th style="width:34%">รหัสบัญชี / ชื่อบัญชี</th><th class="n" style="width:15%">เดบิต</th><th class="n" style="width:15%">เครดิต</th><th>คำอธิบายรายการย่อย</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="note">เจ้าหนี้แสดงเต็มยอดตั้งหนี้ ไม่หักมัดจำ/ภาษีหัก ณ ที่จ่าย</div>
      <div class="foot">
        <div><b>หมายเหตุ:</b> ${esc(input.remark)}</div>
        <div><b>โน้ตภายในบริษัท:</b> ${esc(input.internalNote)}</div>
      </div>
    </div>`;
}

/** พิมพ์ = เปิด PDF ในแท็บใหม่ (ให้ผู้ใช้สั่งพิมพ์จากตัวดู PDF) */
export function printApJournalVoucherPdf(input: ApJournalVoucherPdfInput) {
  return openPdfFromHtml(PAGE_ID, buildApJournalVoucherHtml(input));
}

/** ดาวน์โหลดไฟล์ AP-{เลขที่}.pdf */
export function downloadApJournalVoucherPdf(input: ApJournalVoucherPdfInput) {
  return downloadPdfFromHtml(PAGE_ID, buildApJournalVoucherHtml(input), `AP-${input.docNo}.pdf`);
}
