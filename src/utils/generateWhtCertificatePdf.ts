import {
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
} from "./pdf-common";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

export type WhtCertificatePdfData = {
  certNo: string;
  taxForm: "PND1" | "PND3" | "PND53" | string;
  incomeType: string;
  /** วันที่จ่ายเงิน (YYYY-MM-DD) */
  paymentDate: string;
  baseAmount: number;
  rate: number;
  whtAmount: number;
  /** รายการแยกประเภทเงินได้/อัตราจริง — ไม่ส่งมา = บรรทัดเดียวจากค่าหัวเอกสาร */
  lines?: Array<{ incomeType: string; baseAmount: number; rate: number | null; whtAmount: number }>;
  /** รายการเงินสะสมใต้ตาราง เช่น ประกันสังคม/กองทุนสำรองเลี้ยงชีพ (ใช้กับ 50 ทวิ เงินเดือน) */
  fundLines?: Array<{ label: string; amount: number }>;
  issuedAt: string;
  issuedByName?: string;
  payer: { name: string; taxId?: string; address?: string };
  payee: { name: string; taxId?: string; address?: string };
  /** เลขที่รายการจ่าย / เลข PV อ้างอิง (แสดงท้ายเอกสาร) */
  referenceText?: string;
};

const PAGE_ID = "wht-certificate-pdf";
const PAGE_WIDTH = 594;
const PAGE_HEIGHT = 842;

const money = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function thaiDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

const dash = (v?: string) => (v?.trim() ? v.trim() : "—");

function party(title: string, p: WhtCertificatePdfData["payer"]) {
  return `
    <div class="wht-box">
      <div class="wht-box-title">${escapeHtml(title)}</div>
      <div class="wht-row"><span>ชื่อ</span><b>${escapeHtml(dash(p.name))}</b></div>
      <div class="wht-row"><span>เลขประจำตัวผู้เสียภาษีอากร</span><b>${escapeHtml(dash(p.taxId))}</b></div>
      <div class="wht-row"><span>ที่อยู่</span><b>${escapeHtml(dash(p.address))}</b></div>
    </div>`;
}

function pageHtml(d: WhtCertificatePdfData, index = 0) {
  const form3 = d.taxForm === "PND3";
  const rows = d.lines?.length
    ? d.lines
    : [{ incomeType: d.incomeType, baseAmount: d.baseAmount, rate: d.rate, whtAmount: d.whtAmount }];
  return `
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");
      * { box-sizing: border-box; }
      .wht-page { width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px; overflow: hidden; background: #fff;
        padding: 34px 32px 36px; color: #333; font-family: "Sarabun", Tahoma, sans-serif; font-size: 12px; }
      .wht-top { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #5a7a1f; padding-bottom: 10px; }
      .wht-logo { width: 54px; height: 54px; object-fit: contain; }
      .wht-title { flex: 1; text-align: center; }
      .wht-title .th { font-size: 17px; font-weight: 700; }
      .wht-title .sub { font-size: 11px; color: #666; }
      .wht-no { text-align: right; font-size: 11px; line-height: 1.6; }
      .wht-box { border: 1px solid #bbb; border-radius: 6px; padding: 8px 12px; margin-top: 12px; }
      .wht-box-title { font-weight: 700; margin-bottom: 4px; color: #5a7a1f; }
      .wht-row { display: flex; gap: 8px; padding: 2px 0; line-height: 1.5; }
      .wht-row span { width: 190px; flex: none; color: #666; }
      .wht-row b { font-weight: 600; flex: 1; overflow-wrap: anywhere; }
      .wht-form { margin-top: 12px; font-size: 12px; }
      .wht-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      .wht-table th, .wht-table td { border: 1px solid #bbb; padding: 7px 8px; }
      .wht-table th { background: #f1f5e8; font-weight: 600; }
      .wht-table td.r, .wht-table th.r { text-align: right; }
      .wht-total td { font-weight: 700; background: #fafafa; }
      .wht-baht { margin-top: 8px; font-size: 12px; }
      .wht-foot { margin-top: 56px; display: flex; justify-content: flex-end; }
      .wht-sign { width: 230px; text-align: center; line-height: 1.7; }
      .wht-sign .line { border-bottom: 1px solid #555; height: 34px; margin-bottom: 4px; }
      .wht-ref { margin-top: 28px; font-size: 10px; color: #888; }
    </style>
    <div class="wht-page" id="${PAGE_ID}-${index}">
      <div class="wht-top">
        <img class="wht-logo" src="${companyLogoUrl()}" alt="" crossorigin="anonymous" />
        <div class="wht-title">
          <div class="th">หนังสือรับรองการหักภาษี ณ ที่จ่าย</div>
          <div class="sub">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</div>
        </div>
        <div class="wht-no">
          <div>เลขที่ <b>${escapeHtml(d.certNo)}</b></div>
          <div>วันที่ออก ${escapeHtml(thaiDate(d.issuedAt))}</div>
        </div>
      </div>

      ${party("ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (ผู้จ่ายเงิน)", d.payer)}
      ${party("ผู้ถูกหักภาษี ณ ที่จ่าย (ผู้รับเงิน)", d.payee)}

      <div class="wht-form">
        แบบยื่น : ${d.taxForm === "PND1" ? "☑" : "☐"} ภ.ง.ด.1 (เงินเดือน) &nbsp;&nbsp; ${form3 ? "☑" : "☐"} ภ.ง.ด.3 (บุคคลธรรมดา) &nbsp;&nbsp; ${d.taxForm === "PND1" || form3 ? "☐" : "☑"} ภ.ง.ด.53 (นิติบุคคล)
      </div>

      <table class="wht-table">
        <thead>
          <tr>
            <th>ประเภทเงินได้ที่จ่าย</th>
            <th>วันที่จ่าย</th>
            <th class="r">จำนวนเงินที่จ่าย (ฐานภาษี)</th>
            <th class="r">อัตรา</th>
            <th class="r">ภาษีที่หักและนำส่งไว้</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (l) => `
          <tr>
            <td>${escapeHtml(dash(l.incomeType))}</td>
            <td>${escapeHtml(thaiDate(d.paymentDate))}</td>
            <td class="r">${money(l.baseAmount)}</td>
            <td class="r">${l.rate == null ? "ตามขั้นบันได" : `${l.rate}%`}</td>
            <td class="r">${money(l.whtAmount)}</td>
          </tr>`,
            )
            .join("")}
          <tr class="wht-total">
            <td colspan="2">รวมเงินที่จ่ายและภาษีที่หักนำส่ง</td>
            <td class="r">${money(d.baseAmount)}</td>
            <td></td>
            <td class="r">${money(d.whtAmount)}</td>
          </tr>
        </tbody>
      </table>
      <div class="wht-baht">รวมภาษีที่หักนำส่ง ( ${escapeHtml(numberToThaiBahtText(d.whtAmount))} )</div>
      ${
        d.fundLines?.length
          ? `<div class="wht-baht">${d.fundLines
              .map((f) => `${escapeHtml(f.label)} ${money(f.amount)} บาท`)
              .join(" &nbsp;·&nbsp; ")}</div>`
          : ""
      }

      <div class="wht-foot">
        <div class="wht-sign">
          <div class="line"></div>
          <div>ผู้จ่ายเงิน (ลงชื่อ / ประทับตรา)</div>
          <div>วันที่ ${escapeHtml(thaiDate(d.issuedAt))}</div>
        </div>
      </div>
      <div class="wht-ref">
        ${d.referenceText ? `อ้างอิง ${escapeHtml(d.referenceText)} · ` : ""}ออกโดยระบบ${d.issuedByName ? ` โดย ${escapeHtml(d.issuedByName)}` : ""}
      </div>
    </div>`;
}

/** เปิดหนังสือรับรองหัก ณ ที่จ่ายเป็น PDF ในแท็บใหม่ — ดู ดาวน์โหลด และพิมพ์ได้จากตัวแสดง PDF */
export async function openWhtCertificatePdf(data: WhtCertificatePdfData) {
  await ensureCompanyInfo();
  await openMultiPagePdfFromHtml(PAGE_ID, [pageHtml(data)], {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}

/** หลายใบในไฟล์เดียว — หนึ่งหน้าต่อใบ (ใช้พิมพ์ 50 ทวิ เงินเดือนทั้งบริษัท) */
export async function openWhtCertificatesPdf(list: WhtCertificatePdfData[]) {
  if (list.length === 0) {
    throw new Error("ไม่มีหนังสือรับรองให้พิมพ์");
  }
  await ensureCompanyInfo();
  await openMultiPagePdfFromHtml(
    PAGE_ID,
    list.map((d, i) => pageHtml(d, i)),
    { wrapperWidth: `${PAGE_WIDTH}px`, includeBaseStyles: false },
  );
}
