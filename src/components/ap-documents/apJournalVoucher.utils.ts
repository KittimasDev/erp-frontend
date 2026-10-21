import type { JournalLine, PurchaseJournalItem } from "@/types/purchase-journal";

export type JournalLineRow =
  | { key: string; kind: "group"; label: string }
  | { key: string; kind: "line"; line: JournalLine }
  | { key: string; kind: "total"; debit: number; credit: number };

type LinesSource = Pick<PurchaseJournalItem, "lines" | "totalDebit" | "totalCredit">;

/** บรรทัดบัญชี + หัวกลุ่ม "รายการมี VAT / ไม่มี VAT" + แถวยอดรวมสุทธิ (ใช้ทั้งหน้าจอและ PDF) */
export function toJournalLineRows(doc: LinesSource): JournalLineRow[] {
  const rows: JournalLineRow[] = [];
  let lastGroup: string | null = null;
  for (const line of doc.lines) {
    if ((line.taxGroup === "VAT" || line.taxGroup === "NON_VAT") && lastGroup !== line.taxGroup) {
      rows.push({
        key: `g-${line.taxGroup}-${line.no}`,
        kind: "group",
        label:
          line.taxGroup === "VAT"
            ? `รายการมี VAT${line.vatRate ? ` (${line.vatRate}%)` : ""}`
            : "รายการไม่มี VAT",
      });
      lastGroup = line.taxGroup;
    } else if (line.taxGroup === "TAX" || line.taxGroup === "PAYABLE") {
      lastGroup = line.taxGroup;
    }
    rows.push({ key: `l-${line.no}`, kind: "line", line });
  }
  rows.push({ key: "total", kind: "total", debit: doc.totalDebit, credit: doc.totalCredit });
  return rows;
}

type DescribeInput = {
  purchaseOrderNo?: string | null;
  creditorName: string;
  supplierDocNo?: string | null;
  taxInvoiceNo?: string | null;
  hasItems: boolean;
};

/** คำอธิบายใบสำคัญ เช่น "ค่าซื้อสินค้า ตามเอกสาร PO-… จาก บริษัท … #INV-001" */
export function buildVoucherDescription(d: DescribeInput): string {
  const what = d.hasItems ? "ค่าซื้อสินค้า" : "ค่าใช้จ่ายเพิ่มเติม";
  const ref = d.supplierDocNo || d.taxInvoiceNo;
  return [
    what,
    d.purchaseOrderNo ? `ตามเอกสาร ${d.purchaseOrderNo}` : null,
    `จาก ${d.creditorName}`,
    ref ? `#${ref}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** เลขที่อ้างอิงบนหัวใบสำคัญ: เลขใบของผู้ขาย → เลขใบกำกับภาษี → เลข PO */
export function pickVoucherReference(d: {
  supplierDocNo?: string | null;
  taxInvoiceNo?: string | null;
  purchaseOrderNo?: string | null;
}): string {
  return d.supplierDocNo || d.taxInvoiceNo || d.purchaseOrderNo || "—";
}
