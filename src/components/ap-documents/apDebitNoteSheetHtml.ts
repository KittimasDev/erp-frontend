import dayjs from "dayjs";

import { BE_DATE_FORMAT } from "@/lib/datetime/buddhist-era";
import type { CompanyInfoSnapshot } from "@/lib/company/company-info";
import type { ApDocument, ApDocumentItem, ApReferenceLine } from "@/types/ap-documents";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

import { formatThaiDate } from "./apDocumentConfig";

const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const round2 = (value: number) => Math.round(value * 100) / 100;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dash(value?: string | null) {
  const text = value?.trim();
  return text ? text : "—";
}

function safeLogoSrc(url?: string | null) {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

/** จับคู่บรรทัดใบเพิ่มหนี้กับบรรทัดใบตั้งหนี้ — กติกาเดียวกับใบลดหนี้ */
function findReferenceLine(
  line: ApDocumentItem,
  lines: ApDocumentItem[],
  refs: ApReferenceLine[],
): ApReferenceLine | undefined {
  const norm = (value: string) => value.trim().toLowerCase();
  const unique = (matches: ApReferenceLine[]) => (matches.length === 1 ? matches[0] : undefined);
  if (line.goodsReceiptItemId) {
    const hit = unique(refs.filter((ref) => ref.goodsReceiptItemId === line.goodsReceiptItemId));
    if (hit) return hit;
  }
  if (line.itemId) {
    const hit = unique(refs.filter((ref) => ref.itemId === line.itemId));
    if (hit) return hit;
  }
  const byName = unique(refs.filter((ref) => norm(ref.description) === norm(line.description)));
  if (byName) return byName;
  if (lines.length === 1 && refs.length === 1) return refs[0];
  return undefined;
}

function formatStamp(value?: string | null) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(BE_DATE_FORMAT) : null;
}

function rateLabel(rate: number) {
  return Number(rate).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

const SHEET_CSS = `
.apdn, .apdn * { box-sizing: border-box; }
.apdn {
  --green: #6ba83f;
  --green-dark: #315e24;
  --green-light: #f1f7ed;
  --ink: #263039;
  --muted: #66727d;
  --line: #d5dce1;
  --light: #f4f6f5;
  color: var(--ink);
  font-family: "Sarabun", "TH Sarabun New", "Noto Sans Thai", Tahoma, Arial, sans-serif;
  font-size: 12px;
  line-height: 1.55;
}
.apdn-stage { background: #e8ebea; padding: 18px 12px 20px; overflow-x: auto; }
.apdn-sheet {
  width: 794px;
  min-height: 1123px;
  padding: 64px 60px 57px;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 4px 24px #1112;
  position: relative;
}
.apdn-pdf { margin: 0; box-shadow: none; }
.apdn-company { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 10px; border-bottom: 1.5px solid var(--green); }
.apdn-brand { display: flex; gap: 10px; align-items: center; min-width: 0; }
.apdn-logo {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}
.apdn-logo img { height: 46px; width: auto; max-width: 84px; object-fit: contain; display: block; }
.apdn-logo-symbol { font-size: 28px; color: var(--green); line-height: 1; font-weight: 800; }
.apdn-company-name { font-size: 14px; font-weight: 800; line-height: 1.2; color: #333; }
.apdn-sub { font-size: 11px; color: #555; line-height: 1.45; }
.apdn-doc-title { text-align: right; flex-shrink: 0; }
.apdn-doc-title h1 { margin: 0; color: var(--green-dark); font-weight: 800; font-size: 22px; line-height: 1.15; }
.apdn-en { font-size: 11px; letter-spacing: 0.4px; color: #7c848b; font-weight: 600; }
.apdn-meta { margin-top: 12px; border: 1px solid var(--line); border-radius: 5px; display: grid; grid-template-columns: 1.3fr 1fr; overflow: hidden; }
.apdn-meta > div { padding: 8px 10px; }
.apdn-meta > div + div { border-left: 1px solid var(--line); }
.apdn-label { font-size: 10px; color: var(--muted); }
.apdn-value { font-size: 12px; font-weight: 700; }
.apdn-section { margin-top: 18px; }
.apdn-section-title { font-size: 12px; font-weight: 700; color: var(--green-dark); padding-bottom: 5px; margin: 0 0 9px; border-bottom: 1px solid var(--line); }
.apdn-two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.apdn-details { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 5px 8px; margin: 0; }
.apdn-details dt { color: var(--muted); font-size: 11px; }
.apdn-details dd { margin: 0; font-size: 11px; min-width: 0; overflow-wrap: anywhere; }
.apdn-note { background: var(--light); border-left: 3px solid var(--green); padding: 10px 12px; }
.apdn-note strong { display: block; font-size: 11px; margin-bottom: 2px; }
.apdn table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px; }
.apdn th { background: #eef0ee; font-weight: 700; text-align: left; padding: 9px 8px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.apdn td { padding: 10px 8px; border-bottom: 1px solid #dfe4e1; vertical-align: top; overflow-wrap: anywhere; }
.apdn-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.apdn-center { text-align: center; }
.apdn-item-code { color: var(--muted); font-size: 9.5px; }
.apdn-totals { display: flex; justify-content: flex-end; margin-top: 16px; }
.apdn-summary { width: 355px; max-width: 100%; }
.apdn-summary-line { display: flex; justify-content: space-between; gap: 14px; padding: 5px 9px; }
.apdn-summary-line span:last-child { font-variant-numeric: tabular-nums; white-space: nowrap; }
.apdn-grand { background: var(--green-light); border-top: 1px solid #d7e3cf; border-bottom: 1px solid #d7e3cf; color: var(--green-dark); font-size: 15px; font-weight: 800; margin-top: 5px; padding: 10px 9px; }
.apdn-words { text-align: right; font-size: 10px; color: var(--muted); margin-top: 5px; }
.apdn-signatures { margin-top: 43px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; text-align: center; break-inside: avoid; }
.apdn-sig-role { font-weight: 700; font-size: 11px; margin-bottom: 8px; }
.apdn-sig-line { border-bottom: 1px solid #93999e; margin: 28px 9px 5px; }
.apdn-sig-detail { font-size: 10px; color: var(--muted); line-height: 2; }
.apdn-footer { display: flex; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 8px; margin-top: 24px; color: var(--muted); font-size: 9px; }
.apdn-hint { margin-top: 9px; color: #9a6e34; font-size: 9px; }
`;

function detailRow(label: string, value?: string | null) {
  return `<dt>${label}</dt><dd>${escapeHtml(dash(value))}</dd>`;
}

function signatureSlot(role: string, name?: string | null, date?: string | null) {
  const who = name?.trim() ? escapeHtml(name.trim()) : "........................................";
  const when = date ? escapeHtml(date) : "....../....../......";
  return `<div><div class="apdn-sig-role">${role}</div><div class="apdn-sig-line"></div><div class="apdn-sig-detail">(${who})<br>วันที่ ${when}</div></div>`;
}

function companyLines(company: CompanyInfoSnapshot | null) {
  const address = company?.addressText?.replace(/\s*\n\s*/g, " ").trim() ?? "";
  const phone = company?.phone?.trim() ?? "";
  const contact = [address, phone].filter(Boolean).join(" · ");
  const tax = company?.taxId?.trim() || "—";
  return {
    name: dash(company?.nameTh),
    contact: contact || "—",
    tax: `เลขประจำตัวผู้เสียภาษี: ${tax}`,
  };
}

function logoHtml(company: CompanyInfoSnapshot | null) {
  const src = safeLogoSrc(company?.logoDataUrl ?? company?.logoUrl);
  if (!src) {
    return `<div class="apdn-logo" aria-hidden="true"><div class="apdn-logo-symbol">◈</div></div>`;
  }
  return `<div class="apdn-logo"><img src="${escapeHtml(src)}" alt="" /></div>`;
}

function sheetBody(doc: ApDocument, company: CompanyInfoSnapshot | null) {
  const refs = doc.referenceItems ?? [];
  const comparable =
    Boolean(doc.referenceVatMode) &&
    doc.referenceVatMode === doc.vatMode &&
    doc.vatMode !== "INCLUSIVE";
  const lines = doc.items.map((item, index) => {
    const ref = comparable ? findReferenceLine(item, doc.items, refs) : undefined;
    const original = ref ? round2(ref.amount) : null;
    const correct = ref ? round2(ref.amount + item.amount) : null;
    const code = item.itemCode?.trim();
    const sub = [code, ref ? "อ้างอิงรายการ AP เดิม" : ""].filter(Boolean).join(" · ");
    return `<tr>
      <td class="apdn-center">${index + 1}</td>
      <td>${escapeHtml(item.description || "—")}${sub ? `<div class="apdn-item-code">${escapeHtml(sub)}</div>` : ""}</td>
      <td class="apdn-num">${original == null ? "—" : money.format(original)}</td>
      <td class="apdn-num">${correct == null ? "—" : money.format(correct)}</td>
      <td class="apdn-num">${money.format(item.amount)}</td>
    </tr>`;
  });
  const words = numberToThaiBahtText(doc.totalAmount);
  const companyText = companyLines(company);
  const rows =
    lines.join("") ||
    `<tr><td class="apdn-center">—</td><td>—</td><td class="apdn-num">—</td><td class="apdn-num">—</td><td class="apdn-num">—</td></tr>`;

  return `
    <header class="apdn-company">
      <div class="apdn-brand">
        ${logoHtml(company)}
        <div>
          <div class="apdn-company-name">${escapeHtml(companyText.name)}</div>
          <div class="apdn-sub">${escapeHtml(companyText.contact)}</div>
          <div class="apdn-sub">${escapeHtml(companyText.tax)}</div>
        </div>
      </div>
      <div class="apdn-doc-title">
        <h1>ใบเพิ่มหนี้เจ้าหนี้</h1>
        <div class="apdn-en">AP DEBIT NOTE</div>
      </div>
    </header>
    <div class="apdn-meta">
      <div><div class="apdn-label">เลขที่เอกสาร</div><div class="apdn-value">${escapeHtml(dash(doc.docNo))}</div></div>
      <div><div class="apdn-label">วันที่เอกสาร</div><div class="apdn-value">${escapeHtml(formatThaiDate(doc.docDate))}</div></div>
    </div>
    <section class="apdn-section apdn-two">
      <div>
        <h2 class="apdn-section-title">ข้อมูลเจ้าหนี้ / ผู้ขาย</h2>
        <dl class="apdn-details">
          ${detailRow("รหัสเจ้าหนี้", doc.creditorCode)}
          ${detailRow("ชื่อเจ้าหนี้", doc.creditorName)}
          ${detailRow("เลขประจำตัวผู้เสียภาษี", doc.creditorTaxId)}
          ${detailRow("ที่อยู่", doc.creditorAddress)}
        </dl>
      </div>
      <div>
        <h2 class="apdn-section-title">เอกสารอ้างอิง</h2>
        <dl class="apdn-details">
          ${detailRow("เลขที่ AP Invoice", doc.referenceDocumentNo)}
          ${detailRow("ใบกำกับภาษีเดิม", doc.referenceTaxInvoiceNo)}
          ${detailRow("วันที่ใบกำกับภาษี", doc.referenceTaxInvoiceDate ? formatThaiDate(doc.referenceTaxInvoiceDate) : null)}
          ${detailRow("ใบสั่งซื้อ (PO)", doc.purchaseOrderNo)}
          ${detailRow("เลขใบเพิ่มหนี้ผู้ขาย", doc.supplierDocNo)}
        </dl>
      </div>
    </section>
    <section class="apdn-section"><div class="apdn-note"><strong>สาเหตุการเพิ่มหนี้</strong>${escapeHtml(dash(doc.reason))}</div></section>
    <section class="apdn-section">
      <h2 class="apdn-section-title">รายละเอียดรายการเพิ่มหนี้</h2>
      <table aria-label="รายการเพิ่มหนี้">
        <thead>
          <tr>
            <th style="width:6%" class="apdn-center">#</th>
            <th style="width:34%">รายละเอียดรายการ</th>
            <th style="width:18%" class="apdn-num">มูลค่าเดิม (บาท)</th>
            <th style="width:18%" class="apdn-num">มูลค่าที่ถูกต้อง (บาท)</th>
            <th style="width:24%" class="apdn-num">ส่วนต่างเพิ่มหนี้ (บาท)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
    <div class="apdn-totals">
      <div class="apdn-summary">
        <div class="apdn-summary-line"><span>มูลค่าเพิ่มหนี้ก่อน VAT</span><span>${money.format(doc.subtotalAmount)}</span></div>
        <div class="apdn-summary-line"><span>ภาษีมูลค่าเพิ่ม ${escapeHtml(rateLabel(doc.vatRate))}%</span><span>${money.format(doc.vatAmount)}</span></div>
        <div class="apdn-summary-line apdn-grand"><span>รวมยอดเพิ่มหนี้ทั้งสิ้น</span><span>${money.format(doc.totalAmount)} บาท</span></div>
        ${words ? `<div class="apdn-words">(${escapeHtml(words)})</div>` : ""}
      </div>
    </div>
    <section class="apdn-section"><h2 class="apdn-section-title">หมายเหตุ</h2><div style="font-size:11px">${escapeHtml(dash(doc.remark))}</div></section>
    <section class="apdn-signatures" aria-label="ผู้ลงนาม">
      ${signatureSlot("ผู้จัดทำ", doc.createdByName, formatStamp(doc.createdAt))}
      ${signatureSlot("ผู้ตรวจสอบ", doc.submittedByName, formatStamp(doc.submittedAt))}
      ${signatureSlot("ผู้อนุมัติ", doc.approvedByName, formatStamp(doc.approvedAt))}
    </section>
    <footer class="apdn-footer"><span>เอกสารบันทึกเพิ่มหนี้ฝั่งเจ้าหนี้ภายในระบบ SMT ENERGY ERP</span><span>หน้า 1 / 1</span></footer>
    <div class="apdn-hint">* เอกสารนี้ไม่ใช่ใบเพิ่มหนี้ภาษีที่ออกโดยผู้ขาย · กรณีต้องใช้ใบเพิ่มหนี้ทางภาษี ให้แนบเอกสารจากผู้ขายที่มีข้อมูลถูกต้องตามข้อกำหนด</div>
  `;
}

/** HTML ของแผ่นใบเพิ่มหนี้ — หน้าจอและ PDF ใช้ก้อนนี้ร่วมกัน */
export function buildApDebitNoteSheetHtml(
  doc: ApDocument,
  company: CompanyInfoSnapshot | null,
  mode: "screen" | "pdf",
) {
  const style = `<style>@import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap");${SHEET_CSS}</style>`;
  const body = sheetBody(doc, company);
  if (mode === "pdf") {
    return `${style}<article id="ap-debit-note-pdf" class="apdn apdn-sheet apdn-pdf">${body}</article>`;
  }
  return `${style}<div class="apdn apdn-stage"><article class="apdn-sheet">${body}</article></div>`;
}
