import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PurchaseRequestItem = {
  no: number;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
};

export type PurchaseRequestPdfData = {
  prNo: string;
  requestBy: string;
  department: string;
  requestDate: string;
  requiredDate: string;
  purchaseType: string;
  items: PurchaseRequestItem[];
};

const LOGO_URL = "9315db73-509d-48a7-a8a8-deccea44bb93.png";

function formatQty(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function createPdfHtml(data: PurchaseRequestPdfData) {
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td class="text-center">${item.no}</td>
          <td class="text-center">${item.itemCode}</td>
          <td>${item.itemName}</td>
          <td class="text-center">${item.unit}</td>
          <td class="text-right">${formatQty(item.qty)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div id="purchase-request-pdf" class="pdf-page">
      <div class="header">
        <div class="logo-box">
          <img src="${LOGO_URL}" class="logo" />
        </div>

        <div class="company">
          <div class="company-name">บริษัท เอสเอ็มที เอนเนอร์ยี่ จำกัด</div>
          <div class="company-address">
            85 ถนนโยธา แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100
          </div>
          <div class="company-address">
            เบอร์ออฟฟิศ : 02-2359565-8 เลขประจำตัวผู้เสียภาษี 0 1055 63023 12 4
          </div>
        </div>
      </div>

      <div class="title">ใบขอซื้อ</div>

      <div class="doc-no">
        <span>เลขที่เอกสาร</span>
        <strong>${data.prNo}</strong>
      </div>

      <div class="info-grid">
        <div class="info-row">
          <span class="label">ชื่อผู้ขอซื้อ</span>
          <span>${data.requestBy}</span>
        </div>

        <div class="info-row">
          <span class="label">วันที่เอกสาร</span>
          <span>${data.requestDate}</span>
        </div>

        <div></div>

        <div class="info-row">
          <span class="label">ส่วนงานที่ขอซื้อ</span>
          <span>${data.department}</span>
        </div>

        <div class="info-row">
          <span class="label">ต้องการภายใน(วันที่)</span>
          <span>${data.requiredDate}</span>
        </div>

        <div></div>

        <div class="info-row">
          <span class="label"></span>
          <span>ประเภทที่ 1 : ${data.purchaseType}</span>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 70px;">ลำดับ</th>
            <th style="width: 90px;">รหัสสินค้า</th>
            <th>รายการ</th>
            <th style="width: 90px;">หน่วย</th>
            <th style="width: 110px;">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${Array.from({ length: Math.max(0, 8 - data.items.length) })
            .map(
              () => `
                <tr class="empty-row">
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>

      <div class="signature-box">
        <div class="signature">
          <div>
            <span>ผู้จัดทำ</span>
            <span class="line"></span>
          </div>
          <div class="date">วันที่&nbsp;&nbsp;&nbsp;_____/_____/_____</div>
        </div>

        <div class="signature">
          <div>
            <span>ผู้ตรวจสอบ</span>
            <span class="line"></span>
          </div>
          <div class="date">วันที่&nbsp;&nbsp;&nbsp;_____/_____/_____</div>
        </div>

        <div class="signature">
          <div>
            <span>ผู้อนุมัติ</span>
            <span class="line"></span>
          </div>
          <div class="date">วันที่&nbsp;&nbsp;&nbsp;_____/_____/_____</div>
        </div>
      </div>
    </div>
  `;
}

function createStyle() {
  return `
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, "Tahoma", "Noto Sans Thai", sans-serif;
        color: #111827;
        background: #ffffff;
      }

      .pdf-page {
        width: 794px;
        min-height: 1123px;
        padding: 32px 32px 40px;
        background: #ffffff;
        color: #111827;
        font-size: 13px;
      }

      .header {
        display: grid;
        grid-template-columns: 180px 1fr;
        align-items: start;
        gap: 16px;
      }

      .logo-box {
        display: flex;
        align-items: flex-start;
      }

      .logo {
        width: 180px;
        height: auto;
        object-fit: contain;
      }

      .company {
        text-align: center;
        padding-right: 80px;
      }

      .company-name {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 7px;
      }

      .company-address {
        font-size: 12px;
        line-height: 1.45;
        font-weight: 600;
      }

      .title {
        text-align: center;
        margin-top: 26px;
        font-size: 22px;
        font-weight: 700;
      }

      .doc-no {
        margin-top: 44px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        font-size: 12px;
      }

      .doc-no span,
      .doc-no strong {
        font-weight: 700;
      }

      .info-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr 170px;
        column-gap: 38px;
        row-gap: 7px;
        font-size: 12px;
        font-weight: 600;
      }

      .info-row {
        display: grid;
        grid-template-columns: 112px 1fr;
        gap: 6px;
        min-height: 17px;
      }

      .label {
        font-weight: 700;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 30px;
        table-layout: fixed;
        font-size: 12px;
      }

      .items-table th,
      .items-table td {
        border: 1.4px solid #000;
        padding: 8px 10px;
        vertical-align: top;
      }

      .items-table th {
        text-align: center;
        font-weight: 700;
        height: 38px;
      }

      .items-table tbody tr {
        height: 360px;
      }

      .items-table tbody tr.empty-row {
        height: 0;
      }

      .items-table tbody tr.empty-row td {
        height: 0;
        padding: 0;
        border-top: 0;
        border-bottom: 0;
      }

      .text-center {
        text-align: center;
      }

      .text-right {
        text-align: right;
      }

      .signature-box {
        border-left: 1.4px solid #000;
        border-right: 1.4px solid #000;
        border-bottom: 1.4px solid #000;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        min-height: 82px;
        padding-top: 22px;
      }

      .signature {
        padding: 0 20px;
        font-size: 12px;
        font-weight: 600;
      }

      .signature > div:first-child {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .line {
        flex: 1;
        border-bottom: 1px dashed #111827;
        height: 1px;
      }

      .date {
        margin-top: 7px;
        padding-left: 28px;
      }
    </style>
  `;
}

export async function generatePurchaseRequestPdf(data: PurchaseRequestPdfData) {
  const wrapper = document.createElement("div");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#fff";

  wrapper.innerHTML = `
    ${createStyle()}
    ${createPdfHtml(data)}
  `;

  document.body.appendChild(wrapper);

  const target = wrapper.querySelector("#purchase-request-pdf") as HTMLElement;

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;

  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);

  const blobUrl = pdf.output("bloburl");

  window.open(blobUrl, "_blank");

  document.body.removeChild(wrapper);
}