import dayjs from "dayjs";

import {
  escapeHtml,
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type DeliveryOrderPdfData = {
  deliveryOrderNo: string;
  deliveryDate: string;
  salesOrderNo: string;
  /** ใบส่งที่รวมหลายใบบรรจุ → เลขที่ทุกใบคั่นด้วย ", " */
  packingNo: string;
  customerName: string;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  vehiclePlate: string;
  weighTicketNo: string;
  weighBeforeAt: string;
  weighAfterAt: string;
  vehicleWeightBeforeKg: string;
  vehicleWeightAfterKg: string;
  cargoNetWeightKg: string;
  remark: string;
  items: SalesLinePdfItem[];
};

function shown(value?: string) {
  const text = value?.trim();
  return text && text !== "—" ? text : "—";
}

function formatKg(value?: string) {
  const text = value?.trim();
  if (!text || text === "—") return "—";
  const n = Number(text.replace(/,/g, ""));
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} กก.`;
}

function formatTon(value?: string) {
  const text = value?.trim();
  if (!text || text === "—") return "";
  const n = Number(text.replace(/,/g, ""));
  if (Number.isNaN(n)) return "";
  return `${(n / 1000).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ตัน`;
}

function formatWeighAt(value?: string) {
  const text = value?.trim();
  if (!text || text === "—") return "—";
  const parsed = dayjs(text);
  if (!parsed.isValid()) return text;
  return parsed.format("DD/MM/BBBB HH:mm");
}

function pair(label: string, value?: string) {
  return `<div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(shown(value))}</div>`;
}

function weightRow(label: string, valueHtml: string) {
  return `<div class="weight-row"><span>${escapeHtml(label)}</span><span class="wv">${valueHtml}</span></div>`;
}

function netWeightHtml(value?: string) {
  const kilos = formatKg(value);
  const tons = formatTon(value);
  if (!tons) return escapeHtml(kilos);
  return `${escapeHtml(kilos)}<br>${escapeHtml(tons)}`;
}

function codeAndName(code: string, name: string) {
  const parts = [code, name]
    .map((part) => part?.trim())
    .filter((part) => Boolean(part) && part !== "—");
  return parts.join(" / ") || "—";
}

function transportHtml(data: DeliveryOrderPdfData) {
  return `
    <section class="info-card after-table">
      <div class="card-title">ข้อมูลการขนส่งและชั่งน้ำหนัก</div>
      <div class="info-grid pairs">
        ${pair("ทะเบียนรถ", data.vehiclePlate)}
        ${pair("เลขที่ใบชั่ง", data.weighTicketNo)}
        ${pair("วันเวลาชั่งก่อนบรรทุก", formatWeighAt(data.weighBeforeAt))}
        ${pair("วันเวลาชั่งหลังบรรทุก", formatWeighAt(data.weighAfterAt))}
      </div>
      <div class="weight-lines">
        ${weightRow("น้ำหนักรถก่อนบรรทุก (Tare)", escapeHtml(formatKg(data.vehicleWeightBeforeKg)))}
        ${weightRow("น้ำหนักรถหลังบรรทุก (Gross)", escapeHtml(formatKg(data.vehicleWeightAfterKg)))}
        ${weightRow("น้ำหนักสุทธิ (Net Weight)", netWeightHtml(data.cargoNetWeightKg))}
      </div>
    </section>`;
}

export async function generateDeliveryOrderPdf(data: DeliveryOrderPdfData) {
  await generateSalesCommercialPdf({
    pageId: "delivery-order-pdf",
    titleTh: "ใบส่งสินค้า",
    titleEn: "DELIVERY ORDER",
    docNo: data.deliveryOrderNo,
    docDate: data.deliveryDate,
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลลูกค้าและการจัดส่ง",
        pairs: true,
        rows: [
          { label: "ชื่อลูกค้า", value: data.customerName },
          { label: "เลขที่ใบสั่งขาย (SO)", value: data.salesOrderNo },
          { label: "สถานที่จัดส่ง", value: data.shippingAddress },
          { label: "เลขที่ใบบรรจุ", value: data.packingNo },
          { label: "ผู้ติดต่อ", value: data.contactName },
          { label: "เบอร์โทรศัพท์", value: data.contactPhone },
          { label: "วันที่จัดส่ง", value: data.deliveryDate },
        ],
      },
    ],
    codeWithName: true,
    columnLabels: {
      no: "ลำดับ",
      name: "รหัส / ชื่อสินค้า",
      qty: "จำนวน",
      unit: "หน่วย",
    },
    itemGroups: [
      {
        heading: "รายการสินค้าที่จัดส่ง",
        items: data.items.map((item) => ({
          ...item,
          itemName: codeAndName(item.itemCode, item.itemName),
        })),
      },
    ],
    items: [],
    withPrices: false,
    afterTableHtml: transportHtml(data),
    remark: data.remark,
    signatures: ["ผู้ส่ง", "ผู้ขับ", "ผู้รับสินค้า"],
  });
}
