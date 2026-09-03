import {
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
} from "./pdf-common";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PurchaseOrderPdfItem = {
  no: number;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  amount: number;
};

export type PurchaseOrderPdfData = {
  poNo: string;
  poDate: string;
  vendorName: string;
  vendorCode: string;
  vendorTaxId: string;
  vendorAddress: string;
  vendorPhone: string;
  vendorContact: string;
  paymentTerm: string;
  taxRateLabel: string;
  vatRate?: number;
  withholdingTaxLabel: string;
  paymentMethodLabel: string;
  createdBy: string;
  createdByPhone: string;
  expectedDeliveryDate: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  afterDiscount?: number;
  vatAmount: number;
  totalAmount: number;
  items: PurchaseOrderPdfItem[];
};

function dash(value?: string) {
  const text = value?.trim();
  return text ? text : "—";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatQty(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function infoRow(label: string, value?: string, valueClass = "") {
  const extra = valueClass ? ` ${valueClass}` : "";
  return `<div class="label">${escapeHtml(label)}</div><div class="value${extra}">${escapeHtml(dash(value))}</div>`;
}

function createPdfHtml(data: PurchaseOrderPdfData) {
  const rows = data.items
    .map(
      (item) => `
        <div class="tr tbody">
          <div class="cell center">${item.no}</div>
          <div class="cell center">${escapeHtml(item.itemCode)}</div>
          <div class="cell cell-name">${escapeHtml(item.itemName)}</div>
          <div class="cell center">${escapeHtml(item.unit)}</div>
          <div class="cell center">${formatQty(item.qty)}</div>
          <div class="cell right">${formatMoney(item.unitPrice)}</div>
          <div class="cell right">${formatMoney(item.discountAmount)}</div>
          <div class="cell right">${formatMoney(item.amount)}</div>
        </div>
      `,
    )
    .join("");

  const remarkText = dash(data.remark);

  return `
    <div id="purchase-order-pdf" class="page">
      <div class="topbar">
        <img src="${companyLogoUrl()}" class="logo" alt="" crossorigin="anonymous" />
        <div class="company">${companyIdentityLinesHtml({
          phoneLabel: "เบอร์ติดต่อ",
          taxIdStyle: "grouped",
        })}
        </div>
      </div>

      <div class="rule"></div>

      <div class="headrow">
        <div class="titlebox">
          <div class="title-th">ใบสั่งซื้อ</div>
          <div class="title-en">Purchase Order</div>
        </div>
        <div class="docbox">
          <div>
            <div class="doclabel">เลขที่เอกสาร</div>
            <div class="docval">${escapeHtml(data.poNo)}</div>
          </div>
          <div>
            <div class="doclabel">วันที่ออกเอกสาร</div>
            <div class="docval">${escapeHtml(data.poDate)}</div>
          </div>
        </div>
      </div>

      <div class="section-rule"></div>

      <div class="info-wrap">
        <section class="info-card">
          <div class="card-title">ข้อมูลผู้ขาย</div>
          <div class="info-grid">
            ${infoRow("ลูกค้า :", data.vendorName)}
            ${infoRow("รหัสลูกค้า:", data.vendorCode)}
            ${infoRow("เลขผู้เสียภาษี :", data.vendorTaxId)}
            ${infoRow("ที่อยู่ :", data.vendorAddress)}
            ${infoRow("เบอร์โทร :", data.vendorPhone)}
            ${infoRow("ผู้ติดต่อ :", data.vendorContact)}
          </div>
        </section>

        <section class="info-card">
          <div class="card-title">ข้อมูลการสั่งซื้อ</div>
          <div class="info-grid">
            ${infoRow("เงื่อนไขการชำระเงิน:", data.paymentTerm)}
            ${infoRow("วิธีชำระเงิน / Payment:", data.paymentMethodLabel)}
            ${infoRow("ผู้ติดต่อ / Contact:", data.createdBy)}
            ${infoRow("เบอร์โทร / Phone:", data.createdByPhone)}
            ${infoRow("วันที่ส่งของ:", data.expectedDeliveryDate)}
            ${infoRow("หมายเหตุ / Remarks:", data.remark, "value-clamp")}
          </div>
        </section>
      </div>

      <div class="table">
        <div class="tr thead">
          <div class="cell center">ลำดับ</div>
          <div class="cell center">รหัสสินค้า</div>
          <div class="cell cell-name">รายการสินค้า / Description</div>
          <div class="cell center">หน่วย</div>
          <div class="cell center">จำนวน</div>
          <div class="cell right">ราคาต่อหน่วย</div>
          <div class="cell right">ส่วนลด</div>
          <div class="cell right">จำนวนเงิน</div>
        </div>
        ${rows}
      </div>

      <div class="totals">
        <div class="tot-row">
          <div class="k">ยอดรวมก่อนส่วนลด:</div>
          <div class="v">${formatMoney(data.subtotalAmount)}</div>
        </div>
        <div class="tot-row">
          <div class="k">ส่วนลดท้ายบิล:</div>
          <div class="v">${formatMoney(data.discountAmount)}</div>
        </div>
        <div class="tot-row">
          <div class="k">ยอดหลังหักส่วนลด:</div>
          <div class="v">${formatMoney(
            data.afterDiscount ??
              Math.max(0, data.subtotalAmount - data.discountAmount),
          )}</div>
        </div>
        <div class="tot-row">
          <div class="k">${
            data.vatRate && data.vatRate > 0
              ? `ภาษีมูลค่าเพิ่ม ${data.vatRate}%:`
              : "ภาษีมูลค่าเพิ่ม:"
          }</div>
          <div class="v">${formatMoney(data.vatAmount)}</div>
        </div>
        <div class="tot-row grand">
          <div class="k">ยอดสุทธิที่ต้องชำระ:</div>
          <div class="v">${formatMoney(data.totalAmount)}</div>
        </div>
      </div>

      <div class="note-rule"></div>
      <div class="note-title">หมายเหตุ :</div>
      <div class="note-value">${escapeHtml(remarkText)}</div>

      <div class="page-end">
        <div class="signatures">
          <div class="sig">
            <div>ผู้จัดทำ (Prepared By)</div>
            <div class="line"></div>
            <div class="date">วันที่ ___/___/___</div>
          </div>
          <div class="sig">
            <div>ผู้อนุมัติ / (Approved By)</div>
            <div class="line"></div>
            <div class="date">วันที่ ___/___/___</div>
          </div>
        </div>

        <div class="footer">เอกสารออกจากระบบ ERP - SMT</div>
      </div>
    </div>
  `;
}

function createStyle() {
  return `
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");

      * { box-sizing: border-box; }

      .page {
        width: 594px;
        min-height: 842px;
        background: #fff;
        padding: 34px 23px 36px;
        position: relative;
        color: #7A7A7A;
        font-family: "Sarabun", Tahoma, sans-serif;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .logo {
        width: auto;
        height: 56px;
        max-width: 120px;
        object-fit: contain;
        object-position: left top;
        display: block;
        flex: 0 0 auto;
        margin-top: -10px;
      }

      .company {
        line-height: 1.26;
      }

      .company-name {
        font-size: 15px;
        margin: 0 0 4px;
        font-weight: 700;
        color: #343434;
      }

      .company-address {
        font-size: 7.4px;
        margin: 0;
        color: #7A7A7A;
        font-weight: 400;
        line-height: 1.26;
      }

      .company-address + .company-address {
        margin-top: 3px;
      }

      .rule {
        height: 1px;
        background: #D8DCE0;
        margin: 14px 0;
      }

      .headrow {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
      }

      .titlebox {
        margin-left: 111px;
        margin-top: -2px;
      }

      .title-th {
        font-size: 24px;
        color: #78b64c;
        font-weight: 700;
        line-height: 1;
      }

      .title-en {
        font-size: 10px;
        color: #AA9F97;
        margin-top: 7px;
        text-align: center;
      }

      .docbox {
        width: 233px;
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        overflow: hidden;
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .docbox > div {
        padding: 9px 10px 8px;
      }


      .doclabel {
        font-size: 7px;
        color: #343434;
        margin-bottom: 5px;
      }

      .docval {
        font-size: 10px;
        color: #343434;
        font-weight: 700;
      }

      .section-rule {
        height: 1px;
        background: #D8DCE0;
        margin: 14px 0;
      }

      .info-wrap {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        flex-shrink: 0;
      }

      .info-card {
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        padding: 10px 10px 9px;
        min-height: 121px;
      }

      .card-title {
        font-size: 8.5px;
        color: #343434;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 70px 1fr;
        row-gap: 6px;
      }

      .label {
        font-size: 7px;
        color: #7A7A7A;
      }

      .value {
        font-size: 7.2px;
        color: #7A7A7A;
        word-break: break-word;
        min-width: 0;
      }

      .value-clamp,
      .note-value {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
        max-height: 32px;
        line-height: 1.35;
        white-space: pre-wrap;
      }

      .table {
        width: 100%;
        margin-top: 14px;
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .tr {
        display: grid;
        width: 100%;
        grid-template-columns: 34px 60px 1fr 40px 42px 78px 50px 64px;
        align-items: center;
      }

      .cell-name {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .thead {
        background: #ececeb;
        min-height: 33px;
        font-size: 7.6px;
        color: #343434;
        font-weight: 700;
      }

      .tbody {
        min-height: 31px;
        font-size: 7.5px;
        color: #7A7A7A;
        border-top: 1px solid #D8DCE0;
      }

      .cell {
        padding: 8px 7px;
      }

      .thead .cell {
        padding: 10px 4px 9px;
        white-space: nowrap;
      }

      .center { text-align: center; }
      .right {
        text-align: right;
        white-space: nowrap;
      }

      .totals {
        width: 229px;
        margin-left: auto;
        margin-top: 20px;
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        padding: 10px 8px 9px;
        flex-shrink: 0;
      }

      .tot-row {
        display: grid;
        grid-template-columns: 1fr 78px;
        min-height: 18px;
        align-items: center;
        font-size: 7.5px;
      }

      .tot-row .k { color: #343434; }
      .tot-row .v {
        text-align: right;
        color: #7A7A7A;
        font-weight: 700;
      }

      .grand {
        margin-top: 4px;
        background: #f2f8ec;
        border-radius: 4px;
        padding: 6px 7px;
        font-size: 8px;
      }

      .grand .k {
        color: #343434;
        font-weight: 700;
      }

      .grand .v {
        color: #73b645;
        font-weight: 700;
      }

      .note-rule {
        height: 1px;
        background: #D8DCE0;
        margin: 14px 0;
      }

      .note-title {
        font-size: 7.5px;
        color: #343434;
        margin-bottom: 3px;
      }

      .note-value {
        font-size: 8px;
        color: #7A7A7A;
        word-break: break-word;
        flex-shrink: 0;
      }

      .page-end {
        margin-top: auto;
        flex-shrink: 0;
      }

      .signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 74px;
        margin-top: 24px;
        padding: 0 66px;
      }

      .sig {
        text-align: center;
        color: #7A7A7A;
        font-size: 6.7px;
      }

      .sig .line {
        width: 122px;
        border-bottom: 1px dotted #D8DCE0;
        margin: 24px auto 10px;
      }

      .sig .date {
        margin-top: 0;
        color: #7A7A7A;
      }

      .footer {
        margin-top: 28px;
        text-align: center;
        font-size: 6.8px;
        color: #7A7A7A;
      }
    </style>
  `;
}

async function waitForSarabun() {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, 2500);
  });
  const loaded = Promise.all([
    document.fonts.load('400 12px "Sarabun"'),
    document.fonts.load('700 12px "Sarabun"'),
  ]).then(() => undefined);
  await Promise.race([loaded, timeout]);
}

async function waitForLogo(wrapper: HTMLElement) {
  const logo = wrapper.querySelector(".logo") as HTMLImageElement | null;
  if (!logo) return;

  if (logo.complete && logo.naturalWidth > 0) return;

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    logo.onload = done;
    logo.onerror = done;
    setTimeout(done, 3000);
  });
}

export async function generatePurchaseOrderPdf(data: PurchaseOrderPdfData) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const wrapper = document.createElement("div");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "594px";
  wrapper.style.background = "#fff";
  wrapper.style.fontFamily = '"Sarabun", Tahoma, sans-serif';

  wrapper.innerHTML = `
    ${createStyle()}
    ${createPdfHtml(data)}
  `;

  document.body.appendChild(wrapper);

  const target = wrapper.querySelector("#purchase-order-pdf") as HTMLElement;
  await waitForSarabun();
  await waitForLogo(wrapper);

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // ถ้าพอดีหน้าเดียว ไม่สร้างหน้าสองจากเศษพิกเซล
  if (imgHeight <= pageHeight + 1) {
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  } else {
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 2) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  window.open(pdf.output("bloburl"), "_blank");
  document.body.removeChild(wrapper);
}
