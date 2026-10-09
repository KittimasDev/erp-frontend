export type TabularPdfColumn = {
  header: string;
  /** index ของช่องใน rows — หลายช่องรวมเป็นช่องเดียว เช่น [รหัส, ชื่อ] → "RM-001 ยางรถยนต์" (รหัสตัวหนา) */
  cells: number[];
  /** px บนกระดาษกว้าง 794 (พื้นที่ตาราง 746) */
  width: number;
  align?: "left" | "center" | "right";
  /** ตัวเลข: ชิดขวา, ไม่ตัดบรรทัด, tabular-nums, ค่าลบสีแดง */
  numeric?: boolean;
};

export type TabularReport = {
  title: string;
  filename: string;
  /** บรรทัดหัวรายงานใต้ชื่อ เช่น วันที่รายงาน / วันที่ออกรายงาน */
  meta?: string[];
  headers: string[];
  rows: string[][];
  /** index ของแถวสรุปใน `rows` — Excel/PDF ทำตัวหนา */
  groupRows?: number[];
  /** แถวหัวกลุ่มย่อยใต้แถวสรุป (เช่น SO ใต้ลูกค้า) — ตัวหนา พื้นอ่อนกว่าแถวสรุป */
  subGroupRows?: number[];
  /** คอลัมน์เฉพาะ PDF — ไม่ส่ง = ใช้ headers กว้างเท่ากัน */
  pdfColumns?: TabularPdfColumn[];
};

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
  const subGroupRows = new Set(report.subGroupRows ?? []);
  // พื้นสีแยกชั้นเฉพาะเมื่อมีกลุ่มย่อย รายงานสองชั้นเดิมคงหน้าตาเดิม
  const groupFill = subGroupRows.size ? "FFEEF4E4" : null;
  report.rows.forEach((row, index) => {
    const added = sheet.addRow(row);
    if (groupRows.has(index) || subGroupRows.has(index)) {
      added.font = { bold: true };
    }
    if (groupFill && groupRows.has(index)) {
      added.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: groupFill },
        };
      });
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
  const { openTabularReportPdf } = await import("@/utils/tabularReportPdf");
  await openTabularReportPdf(report);
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
