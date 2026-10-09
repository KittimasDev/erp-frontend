export type TabularReport = {
  title: string;
  filename: string;
  /** บรรทัดหัวรายงานใต้ชื่อ เช่น วันที่รายงาน / วันที่ออกรายงาน */
  meta?: string[];
  headers: string[];
  rows: string[][];
  /** index ของแถวสรุปใน `rows` — Excel/PDF ทำตัวหนา */
  groupRows?: number[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(report: TabularReport) {
  const metaLines = report.meta?.length
    ? [csvCell(report.title), ...report.meta.map(csvCell), ""]
    : [];
  const lines = [
    ...metaLines,
    report.headers.map(csvCell).join(","),
    ...report.rows.map((row) => row.map(csvCell).join(",")),
  ];
  downloadBlob(
    `${report.filename}.csv`,
    new Blob([`\uFEFF${lines.join("\n")}`], {
      type: "text/csv;charset=utf-8",
    }),
  );
}

async function downloadExcel(report: TabularReport) {
  const exceljs = await import("exceljs");
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet(report.title.slice(0, 31));
  if (report.meta?.length) {
    sheet.addRow([report.title]).font = { bold: true, size: 14 };
    for (const line of report.meta) {
      sheet.addRow([line]);
    }
    sheet.addRow([]);
  }
  sheet.addRow(report.headers).font = { bold: true };
  const groupRows = new Set(report.groupRows ?? []);
  report.rows.forEach((row, index) => {
    const added = sheet.addRow(row);
    if (groupRows.has(index)) {
      added.font = { bold: true };
    }
  });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    `${report.filename}.xlsx`,
    new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
}

async function downloadPdf(report: TabularReport) {
  const { openPdfFromHtml } = await import("@/utils/pdf-common");
  const groupRows = new Set(report.groupRows ?? []);
  const head = report.headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const body = report.rows
    .map(
      (row, index) =>
        `<tr${groupRows.has(index) ? ' class="group"' : ""}>${row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const meta = (report.meta ?? [])
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  const html = `
    <section id="procurement-report-pdf" style="width:794px;padding:24px;background:#fff;color:#222;font-family:Tahoma,sans-serif;">
      <h1 style="margin:0 0 8px;font-size:18px;">${escapeHtml(report.title)}</h1>
      ${meta ? `<div style="margin:0 0 12px;font-size:11px;">${meta}</div>` : ""}
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      <style>
        #procurement-report-pdf th,
        #procurement-report-pdf td {
          border: 1px solid #d9d9d9;
          padding: 4px 6px;
          text-align: left;
          vertical-align: top;
        }
        #procurement-report-pdf th { background: #f3f6ee; }
        #procurement-report-pdf tr.group td { font-weight: 700; background: #fafafa; }
      </style>
    </section>`;
  await openPdfFromHtml("procurement-report-pdf", html);
}

export async function downloadTabularReport(
  format: "csv" | "xlsx" | "pdf",
  report: TabularReport,
) {
  if (format === "csv") {
    downloadCsv(report);
    return;
  }
  if (format === "xlsx") {
    await downloadExcel(report);
    return;
  }
  await downloadPdf(report);
}
