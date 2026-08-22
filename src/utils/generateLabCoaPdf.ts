import {
  companyBrandName,
  companyHeaderHtml,
  ensureCompanyInfo,
  escapeHtml,
  openPdfFromHtml,
} from "./pdf-common";

export type LabCoaPdfData = {
  sampleNo: string;
  sampleType: string;
  collectedDate: string;
  referenceDocNo: string;
  approvedByName: string;
  approvedAt: string;
  remark: string;
  qrCodeDataUri?: string;
  results: Array<{
    parameterName: string;
    resultValue: string;
    unit: string;
    specMin: string;
    specMax: string;
  }>;
};

export async function generateLabCoaPdf(data: LabCoaPdfData) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const rows = data.results
    .map(
      (row, index) => `
      <tr class="data-row">
        <td class="text-center col-no">${index + 1}</td>
        <td class="col-name">${escapeHtml(row.parameterName)}</td>
        <td class="text-center">${escapeHtml(row.resultValue)}</td>
        <td class="text-center col-unit">${escapeHtml(row.unit)}</td>
        <td class="text-center">${escapeHtml(row.specMin)}</td>
        <td class="text-center">${escapeHtml(row.specMax)}</td>
      </tr>`,
    )
    .join("");

  const emptyRows = Array.from({
    length: Math.max(0, 4 - data.results.length),
  })
    .map(
      () => `
      <tr class="empty-row">
        <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
      </tr>`,
    )
    .join("");

  const qrHtml = data.qrCodeDataUri
    ? `<div class="qr-box"><img src="${data.qrCodeDataUri}" alt="QR" /><div>QR · ${escapeHtml(data.sampleNo)}</div></div>`
    : "";

  const html = `
    <div id="lab-coa-pdf" class="pdf-page">
      ${companyHeaderHtml()}
      <div class="title-block">
        <div class="title">ใบรับรองผลวิเคราะห์</div>
        <div class="title-sub">CERTIFICATE OF ANALYSIS (COA)</div>
      </div>
      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">เลขที่ตัวอย่าง</span>
          <strong class="meta-value">${escapeHtml(data.sampleNo)}</strong>
        </div>
        <div class="meta-item">
          <span class="meta-label">วันที่เก็บ</span>
          <strong class="meta-value">${escapeHtml(data.collectedDate)}</strong>
        </div>
      </div>
      <div class="info-card">
        <div class="info-grid">
          <div class="info-row">
            <span class="label">ประเภทตัวอย่าง</span>
            <span class="value">${escapeHtml(data.sampleType)}</span>
          </div>
          <div class="info-row">
            <span class="label">เอกสารอ้างอิง</span>
            <span class="value">${escapeHtml(data.referenceDocNo)}</span>
          </div>
          <div class="info-row">
            <span class="label">ผู้อนุมัติ</span>
            <span class="value">${escapeHtml(data.approvedByName)}</span>
          </div>
          <div class="info-row">
            <span class="label">วันที่อนุมัติ</span>
            <span class="value">${escapeHtml(data.approvedAt)}</span>
          </div>
        </div>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-no">#</th>
            <th class="col-name">พารามิเตอร์</th>
            <th>ผลตรวจ</th>
            <th class="col-unit">หน่วย</th>
            <th>Spec Min</th>
            <th>Spec Max</th>
          </tr>
        </thead>
        <tbody>${rows}${emptyRows}</tbody>
      </table>
      ${
        data.remark
          ? `<div class="remark-box"><strong>หมายเหตุ</strong><div>${escapeHtml(data.remark)}</div></div>`
          : ""
      }
      ${qrHtml}
      <div class="signature-box">
        <div class="signature">
          <div class="sig-title">ผู้วิเคราะห์</div>
          <div class="sig-line"></div>
          <div class="sig-date">วันที่ ....../....../..........</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้อนุมัติ</div>
          <div class="sig-line"></div>
          <div class="sig-date">${escapeHtml(data.approvedByName)}</div>
        </div>
        <div class="signature">
          <div class="sig-title">ลูกค้า / ผู้รับ</div>
          <div class="sig-line"></div>
          <div class="sig-date">วันที่ ....../....../..........</div>
        </div>
      </div>
      <div class="footer-note">Certificate of Analysis · ${escapeHtml(companyBrandName())} Laboratory</div>
    </div>
  `;

  await openPdfFromHtml("lab-coa-pdf", html);
}
