import { getCompanyInfoSnapshot } from "@/lib/company/company-info";
import type { ApDocument } from "@/types/ap-documents";

import { buildApDebitNoteSheetHtml } from "@/components/ap-documents/apDebitNoteSheetHtml";

import { ensureCompanyInfo, openPdfFromHtml } from "./pdf-common";

async function waitForSarabun() {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  if (!document.getElementById("apdn-sarabun")) {
    const link = document.createElement("link");
    link.id = "apdn-sarabun";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap";
    document.head.appendChild(link);
    await new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
      setTimeout(resolve, 2500);
    });
  }
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, 2500);
  });
  const loaded = Promise.all([
    document.fonts.load('400 12px "Sarabun"'),
    document.fonts.load('700 12px "Sarabun"'),
    document.fonts.load('800 12px "Sarabun"'),
  ]).then(() => undefined);
  await Promise.race([loaded, timeout]);
}

/** ใบเพิ่มหนี้เจ้าหนี้ — HTML/CSS ชุดเดียวกับแผ่นบนหน้ารายละเอียด */
export async function generateApDebitNotePdf(doc: ApDocument) {
  await ensureCompanyInfo();
  await waitForSarabun();
  const html = buildApDebitNoteSheetHtml(doc, getCompanyInfoSnapshot(), "pdf");
  await openPdfFromHtml("ap-debit-note-pdf", html);
}
