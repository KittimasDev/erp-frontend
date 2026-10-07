import { vatAmountLabel } from "@/lib/money/vat-totals";

import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type SalesCreditNotePdfData = {
  creditNoteNo: string;
  creditNoteDate: string;
  customerName: string;
  salesOrderNo: string;
  deliveryOrderNo: string;
  reason: string;
  remark: string;
  grossAmount: number;
  discountAmount: number;
  subtotalAmount: number;
  vatAmount: number;
  vatRate?: number;
  totalAmount: number;
  items: SalesLinePdfItem[];
  createdByName?: string;
  approvedByName?: string;
};

export async function generateSalesCreditNotePdf(data: SalesCreditNotePdfData) {
  await generateSalesCommercialPdf({
    pageId: "sales-credit-note-pdf",
    titleTh: "ใบลดหนี้",
    titleEn: "CREDIT NOTE",
    docNo: data.creditNoteNo,
    docDate: data.creditNoteDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "อ้างอิง SO", value: data.salesOrderNo },
      { label: "อ้างอิงใบส่ง", value: data.deliveryOrderNo },
      { label: "เหตุผล", value: data.reason || "—" },
    ],
    items: data.items,
    withPrices: true,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    totalsLines: [
      { label: "ยอดก่อนลด", value: data.grossAmount },
      { label: "ส่วนลด", value: data.discountAmount },
      { label: "มูลค่าก่อน VAT", value: data.subtotalAmount },
      { label: vatAmountLabel(data.vatRate), value: data.vatAmount },
      { label: "ยอดรวมที่ลด", value: data.totalAmount, grand: true },
    ],
    remark: data.remark,
    signatures: [
      { title: "ผู้สร้าง", name: data.createdByName },
      { title: "ผู้อนุมัติ", name: data.approvedByName },
      "ลูกค้า",
    ],
  });
}
