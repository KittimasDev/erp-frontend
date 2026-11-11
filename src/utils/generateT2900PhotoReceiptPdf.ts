import dayjs from "dayjs";
import {
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
} from "./pdf-common";

import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { getT2900CameraPhotoBlob } from "@/lib/api/t2900";
import { getWeighbridgeTicketT2900CameraPhotos } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";
import type { T2900ErpTicketDetail } from "@/types/t2900";

const PAGE_ID = "t2900-photo-receipt-pdf";
/** A4 ที่กว้าง 794px สูง 1123px — ต้องตรึงทั้งคู่เพราะ openMultiPagePdfFromHtml วางภาพเต็มหน้า */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

/** ลำดับและชื่อรูป: เข้า (กล้อง 1-2) แล้วตามด้วยออก (กล้อง 1-2) */
const PHOTO_SLOTS = [
  { key: "OBPhotoIn1", label: "ชั่งเข้า · กล้อง 1" },
  { key: "OBPhotoIn2", label: "ชั่งเข้า · กล้อง 2" },
  { key: "OBPhoto", label: "ชั่งออก · กล้อง 1" },
  { key: "OBPhotoOut2", label: "ชั่งออก · กล้อง 2" },
] as const;

export type T2900ExportPhoto = { key: string; label: string; dataUrl: string };

export type T2900PhotoReceiptPdfData = {
  tckNo: string;
  seqNo: string;
  sellerCode: string;
  sellerName: string;
  productCode: string;
  productName: string;
  location: string;
  truckNo: string;
  dateIn: string;
  timeIn: string;
  dateOut: string;
  timeOut: string;
  grossWt: string;
  truckWt: string;
  netWt: string;
  pricePerKg: string;
  totalAmount: string;
  note: string;
  photos: T2900ExportPhoto[];
};

function dash(value?: string) {
  const text = value?.trim();
  return text ? text : "—";
}

/** 2026-10-27 → 27/10/2569 (พ.ศ.) */
export function formatThaiBuddhistDate(ymd?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? "");
  if (!match) {
    return "";
  }
  return dayjs(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).format("DD/MM/BBBB");
}

function formatInt(value: unknown) {
  const n = Number(value);
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(n)
  ) {
    return "-";
  }
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function formatMoney2(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** แปลงข้อมูลหน้ารายละเอียดบัตรเป็นข้อมูลสำหรับใบรับสินค้า (ยังไม่รวมรูป) */
export function mapT2900DetailToPhotoReceipt(
  detail: T2900ErpTicketDetail,
  photos: T2900ExportPhoto[],
): T2900PhotoReceiptPdfData {
  const t = detail.ticket;
  const price = detail.pricing;
  const note = [t.Note1, t.Note2]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" · ");
  const location = [t.LoctID, t.LoctDetl]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");

  return {
    tckNo: String(t.TckNo),
    seqNo: String(t.SeqNo ?? ""),
    sellerCode: String(t.CustID ?? ""),
    sellerName: String(t.CustomerName ?? ""),
    productCode: String(t.ProdID ?? ""),
    productName: String(t.ProdName ?? ""),
    location,
    truckNo: String(t.TruckNo ?? ""),
    dateIn: formatThaiBuddhistDate(t.DateIn),
    timeIn: t.TimeIn ?? "",
    dateOut: formatThaiBuddhistDate(t.DateOut),
    timeOut: t.TimeOut ?? "",
    grossWt: formatInt(t.GrossWt),
    truckWt: formatInt(t.TruckWt),
    netWt: formatInt(t.NetWt),
    pricePerKg:
      price.pricePerKg === null ? "-" : formatMoney2(price.pricePerKg),
    totalAmount: formatMoney2(price.estimatedAmount),
    note,
    photos,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("อ่านรูปไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

/**
 * ดึงรูปกล้อง 4 ช่องของบัตร — รูปจากบัตรก่อน ถ้าไม่มีใช้ไฟล์แนบของตั๋ว ERP (ที่เก็บรูปรอบเก่าไว้)
 * ช่องไหนไม่มีรูปก็ข้าม ไม่ทำให้ทั้งใบล้ม
 */
export async function loadT2900ExportPhotos(
  detail: T2900ErpTicketDetail,
): Promise<T2900ExportPhoto[]> {
  const token = getAccessToken();
  const tckNo = String(detail.ticket.TckNo);
  const present = new Set(
    detail.cameraPhotos.filter((photo) => photo.present).map((p) => p.key),
  );

  const attachmentByKey = new Map<string, string>();
  if (detail.erpTicketId) {
    try {
      const list = await getWeighbridgeTicketT2900CameraPhotos(
        token,
        detail.erpTicketId,
      );
      for (const file of list.data) {
        const base = (file.originalFileName ?? "").replace(/\.[^.]+$/, "");
        if (base && !attachmentByKey.has(base)) {
          attachmentByKey.set(base, file.id);
        }
      }
    } catch {
      // ไม่มีสิทธิ์/ไม่มีไฟล์แนบ — ใช้รูปจากบัตรอย่างเดียว
    }
  }

  const photos: T2900ExportPhoto[] = [];
  for (const slot of PHOTO_SLOTS) {
    let blob: Blob | null = null;
    if (present.has(slot.key)) {
      try {
        blob = (await getT2900CameraPhotoBlob(token, tckNo, slot.key)).blob;
      } catch {
        blob = null;
      }
    }
    const attachmentId = attachmentByKey.get(slot.key);
    if (!blob && attachmentId) {
      try {
        blob = (await downloadDocumentAttachment(token, attachmentId)).blob;
      } catch {
        blob = null;
      }
    }
    if (blob) {
      photos.push({
        key: slot.key,
        label: slot.label,
        dataUrl: await blobToDataUrl(blob),
      });
    }
  }
  return photos;
}

function styles() {
  return `
    <style>
      .t29-page {
        width: ${PAGE_WIDTH}px;
        height: ${PAGE_HEIGHT}px;
        box-sizing: border-box;
        padding: 32px 40px 24px;
        background: #fff;
        color: #1f2937;
        font-family: "Sarabun", "Tahoma", "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.45;
        display: flex;
        flex-direction: column;
      }
      /* หัวบริษัท */
      .t29-head { display: grid; grid-template-columns: 66px 1fr 66px; gap: 12px; align-items: center; }
      .t29-logo { max-width: 62px; max-height: 62px; object-fit: contain; }
      .t29-head .company-name { font-size: 18px; font-weight: 600; color: #111827; text-align: center; }
      .t29-head .company-address { font-size: 11px; color: #6b7280; text-align: center; }
      .t29-rule { margin: 12px 0 10px; border-top: 3px solid #6f9720; border-bottom: 1px solid #d9e6b8; height: 3px; }

      /* ชื่อเอกสาร */
      .t29-title { text-align: center; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; color: #111827; }
      .t29-title-sub { text-align: center; font-size: 11px; color: #9ca3af; margin-bottom: 12px; }

      /* ข้อมูลลูกค้า / บัตร */
      .t29-meta { display: grid; grid-template-columns: 1fr 230px; gap: 16px; align-items: stretch; }
      .t29-info { display: grid; grid-template-columns: 62px 1fr; row-gap: 3px; align-content: start; }
      .t29-info .k { color: #6b7280; }
      .t29-info .v { color: #111827; font-weight: 500; }
      .t29-card { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; background: #f9fafb; }
      .t29-card .no-label { font-size: 11px; color: #6b7280; }
      .t29-card .no { font-size: 20px; font-weight: 600; color: #111827; letter-spacing: 0.5px; line-height: 1.2; }
      .t29-card .row { display: flex; justify-content: space-between; margin-top: 3px; font-size: 12px; }
      .t29-card .row .k { color: #6b7280; }

      /* ตารางเข้า/ออก + กล่องน้ำหนัก */
      .t29-table { width: 100%; margin-top: 12px; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
      .t29-table td, .t29-table th { height: 36px; padding: 0 10px; font-weight: 400; font-size: 13px; color: #374151; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
      .t29-table th { height: 32px; font-weight: 500; font-size: 12px; text-align: center; color: #3f5410; background: #f1f6e3; border-top: 1px solid #cbd5e1; }
      .t29-table tr > :first-child { border-left: 1px solid #cbd5e1; }
      .t29-table .c { text-align: center; font-weight: 500; color: #111827; }
      .t29-table .r { text-align: right; }
      /* กล่องน้ำหนักถือเส้นซ้ายของตัวเอง (ไม่พึ่งเส้นขวาของช่องเวลา) เพื่อให้แถวราคาฝั่งซ้ายไม่มีกรอบได้ */
      .t29-table td:nth-child(4), .t29-table th:nth-child(4) { border-right: 0; }
      .t29-table td.t29-w, .t29-table th.t29-wh { border-left: 1px solid #cbd5e1; }
      /* แถวราคา: ฝั่งซ้ายไม่มีกรอบเลย (ต้องจำเพาะกว่ากฎ :first-child ด้านบน) */
      .t29-table tr > td.t29-free { border: 0; padding: 0 4px; }
      .t29-free .k { color: #6b7280; }
      .t29-free .v { color: #111827; font-weight: 600; }
      .t29-w { font-size: 14px !important; color: #374151 !important; }
      .t29-w .t29-wrow { display: flex; justify-content: space-between; align-items: center; }
      .t29-w .t29-wrow .val { font-size: 17px; font-weight: 600; color: #111827; }
      .t29-w.net { background: #f1f6e3; border-bottom: 2px solid #6f9720; }
      .t29-w.net .t29-wrow .val { font-size: 20px; color: #3f5410; }
      .t29-note { margin-top: 8px; color: #374151; }
      .t29-note .k { color: #6b7280; }

      /* รูปกล้อง */
      .t29-sec { margin-top: 12px; display: flex; align-items: center; gap: 10px; color: #6b7280; font-size: 12px; }
      .t29-sec-line { flex: 1; border-top: 1px solid #e5e7eb; }
      .t29-photos { margin-top: 8px; flex: 1 1 auto; min-height: 0; display: grid; gap: 10px; align-content: start; }
      .t29-photos.one-col { grid-template-columns: 1fr; }
      .t29-photos.two-col { grid-template-columns: 1fr 1fr; }
      .t29-photo { display: flex; flex-direction: column; align-items: center; min-height: 0; }
      /* กรอบรูปสูงตายตัว รูปอยู่กึ่งกลางและคงสัดส่วนเอง (ไม่พึ่ง object-fit) — กันรูปสูงเกินจนทับลายเซ็น */
      .t29-frame { width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
      .t29-frame img { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; }
      .t29-photos.one-col .t29-frame { height: 226px; }
      .t29-photos.two-col .t29-frame { height: 188px; }
      .t29-caption { font-size: 11px; color: #4b5563; margin-top: 4px; }
      .t29-nophoto { margin-top: 14px; text-align: center; color: #9ca3af; }

      /* ลายเซ็น + ท้ายเอกสาร */
      .t29-sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin-top: 14px; }
      .t29-sign-slot { text-align: center; }
      .t29-sign-line { height: 30px; border-bottom: 1px dotted #6b7280; }
      .t29-sign-label { margin-top: 4px; font-size: 12px; color: #4b5563; }
      .t29-foot { margin-top: 10px; padding-top: 5px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
    </style>`;
}

export function buildT2900PhotoReceiptPageHtml(
  data: T2900PhotoReceiptPdfData,
  printedAt: string = new Date().toLocaleString("th-TH"),
): string {
  const photos = data.photos;
  const layout = photos.length <= 2 ? "one-col" : "two-col";
  const photosHtml =
    photos.length === 0
      ? `<div class="t29-nophoto">ไม่มีรูปจากกล้องเครื่องชั่ง</div>`
      : `<div class="t29-sec"><span>รูปจากกล้องเครื่องชั่ง</span><span class="t29-sec-line"></span></div>
         <div class="t29-photos ${layout}">${photos
           .map(
             (photo) => `
          <div class="t29-photo">
            <div class="t29-frame"><img src="${photo.dataUrl}" alt="${escapeHtml(photo.label)}" /></div>
            <div class="t29-caption">${escapeHtml(photo.label)}</div>
          </div>`,
           )
           .join("")}</div>`;

  return `
    <div id="${PAGE_ID}-0" class="t29-page">
      <div class="t29-head">
        <img src="${companyLogoUrl()}" class="t29-logo" alt="" crossorigin="anonymous" />
        <div>${companyIdentityLinesHtml()}</div>
        <div></div>
      </div>
      <div class="t29-rule"></div>

      <div class="t29-title">ใบรับสินค้า</div>
      <div class="t29-title-sub">Goods Receipt</div>

      <div class="t29-meta">
        <div class="t29-info">
          <span class="k">ลูกค้า</span><span class="v">${escapeHtml(dash(data.sellerCode))} ${escapeHtml(data.sellerName)}</span>
          <span class="k">สินค้า</span><span class="v">${escapeHtml(dash(data.productCode))} ${escapeHtml(data.productName)}</span>
          <span class="k">สถานที่</span><span class="v">${escapeHtml(dash(data.location))}</span>
        </div>
        <div class="t29-card">
          <div class="no-label">เลขที่บัตร</div>
          <div class="no">${escapeHtml(data.tckNo)}</div>
          <div class="row"><span class="k">แบบบัตร</span><span>ทั่วไป</span></div>
          <div class="row"><span class="k">ลักษณะการค้า</span><span>ขาย</span></div>
        </div>
      </div>

      <table class="t29-table">
        <colgroup>
          <col style="width: 11%" />
          <col style="width: 19%" />
          <col style="width: 17%" />
          <col style="width: 14%" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>รายการ</th>
            <th>ทะเบียนรถ</th>
            <th>วันที่</th>
            <th>เวลา</th>
            <th class="t29-wh">น้ำหนัก</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="c">เข้า</td>
            <td>${escapeHtml(dash(data.truckNo))}</td>
            <td class="r">${escapeHtml(dash(data.dateIn))}</td>
            <td class="r">${escapeHtml(dash(data.timeIn))}</td>
            <td class="t29-w"><div class="t29-wrow"><span>น้ำหนักรวม (กก.)</span><span class="val">${escapeHtml(data.grossWt)}</span></div></td>
          </tr>
          <tr>
            <td class="c">ออก</td>
            <td>${escapeHtml(dash(data.truckNo))}</td>
            <td class="r">${escapeHtml(dash(data.dateOut))}</td>
            <td class="r">${escapeHtml(dash(data.timeOut))}</td>
            <td class="t29-w"><div class="t29-wrow"><span>น้ำหนักรถ (กก.)</span><span class="val">${escapeHtml(data.truckWt)}</span></div></td>
          </tr>
          <tr>
            <td class="t29-free" colspan="2"><span class="k">ราคา/กก. :</span> <span class="v">${escapeHtml(data.pricePerKg)}</span> <span class="k">บาท</span></td>
            <td class="t29-free r" colspan="2"><span class="k">รวมเป็นเงิน :</span> <span class="v">${escapeHtml(data.totalAmount)}</span> <span class="k">บาท</span></td>
            <td class="t29-w net"><div class="t29-wrow"><span>น้ำหนักสุทธิ (กก.)</span><span class="val">${escapeHtml(data.netWt)}</span></div></td>
          </tr>
        </tbody>
      </table>
      <div class="t29-note"><span class="k">หมายเหตุ :</span> ${escapeHtml(dash(data.note))}</div>

      ${photosHtml}

      <div class="t29-sign">
        <div class="t29-sign-slot"><div class="t29-sign-line"></div><div class="t29-sign-label">พนักงานชั่ง</div></div>
        <div class="t29-sign-slot"><div class="t29-sign-line"></div><div class="t29-sign-label">พนักงานส่ง</div></div>
        <div class="t29-sign-slot"><div class="t29-sign-line"></div><div class="t29-sign-label">ผู้รับสินค้า</div></div>
      </div>
      <div class="t29-foot">
        <span>บัตรชั่ง T2900 เลขที่ ${escapeHtml(data.tckNo)} · ออกจากระบบ ERP</span>
        <span>พิมพ์เมื่อ ${escapeHtml(printedAt)}</span>
      </div>
    </div>`;
}

/** Export เอกสารแนบรูปเข้า-ออก (ใบรับสินค้า) ของบัตร T2900 — เปิดเป็น PDF ในแท็บใหม่ */
export async function generateT2900PhotoReceiptPdf(
  detail: T2900ErpTicketDetail,
) {
  await ensureCompanyInfo();
  const photos = await loadT2900ExportPhotos(detail);
  const data = mapT2900DetailToPhotoReceipt(detail, photos);

  await openMultiPagePdfFromHtml(
    PAGE_ID,
    [`${styles()}${buildT2900PhotoReceiptPageHtml(data)}`],
    { wrapperWidth: `${PAGE_WIDTH}px`, includeBaseStyles: false },
  );
}
