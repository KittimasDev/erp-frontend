import { vatAmountLabel } from "@/lib/money/vat-totals";
import type { SalesTaxInvoice } from "@/types/sales-tax-invoices";
import { advanceDeductionTotalLines } from "@/utils/advance-deduction-totals";

import { generateSalesCommercialPdf, type SalesLinePdfItem } from "./pdf-common";

function money(value?: string | number) {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
}

export async function generateSalesTaxInvoicePdf(doc: SalesTaxInvoice) {
  const rate = doc.vatRate != null ? Number(doc.vatRate) : undefined;
  const items: SalesLinePdfItem[] = (doc.items ?? []).map((item, index) => ({
    no: index + 1,
    itemCode: item.itemCode || "—",
    itemName: item.itemName,
    unit: item.unitName || "—",
    qty: money(item.quantity),
    unitPrice: money(item.unitPrice),
    discountAmount: money(item.discountAmount),
    amount: money(item.amount),
  }));
  const afterDiscount = Math.max(0, money(doc.subtotalAmount) - money(doc.discountAmount));
  const advanceLines = (doc.advanceDeductions ?? []).map((row) => ({
    docNo: row.docNo,
    baseAmount: money(row.baseAmount),
    vatAmount: money(row.vatAmount),
    amount: money(row.amount),
  }));

  await generateSalesCommercialPdf({
    pageId: "sales-tax-invoice-pdf",
    titleTh: "ใบกำกับภาษี",
    titleEn: "TAX INVOICE",
    docNo: doc.taxInvoiceNo,
    docDate: doc.taxInvoiceDate,
    infoRows: [
      { label: "ผู้ขาย", value: doc.sellerName },
      { label: "เลขผู้เสียภาษีผู้ขาย", value: doc.sellerTaxId },
      { label: "สาขาผู้ขาย", value: doc.sellerBranch },
      { label: "ผู้ซื้อ", value: doc.buyerName },
      { label: "เลขผู้เสียภาษีผู้ซื้อ", value: doc.buyerTaxId },
      { label: "สาขาผู้ซื้อ", value: doc.buyerBranch },
      { label: "อ้างอิงใบแจ้งหนี้", value: doc.invoiceNo },
    ],
    items,
    withPrices: true,
    subtotalAmount: money(doc.subtotalAmount),
    discountAmount: money(doc.discountAmount),
    vatAmount: money(doc.vatAmount),
    totalAmount: money(doc.totalAmount),
    totalsLines: [
      { label: "ยอดก่อน VAT", value: afterDiscount },
      ...advanceDeductionTotalLines(doc.vatMode, advanceLines),
      ...(advanceLines.length > 0
        ? [
            {
              label: "ฐานภาษีหลังหักมัดจำ",
              value:
                money(doc.taxBaseAmount ?? money(doc.totalAmount) - money(doc.vatAmount)),
            },
          ]
        : []),
      { label: vatAmountLabel(rate), value: money(doc.vatAmount) },
      { label: "ยอดรวม", value: money(doc.totalAmount), grand: true },
    ],
    signatures: ["ผู้ออกใบ", "ผู้ตรวจสอบ", "ผู้รับใบ"],
  });
}
