import { salesOrderRevisionStamp, formatThaiBuddhistDate } from "@/lib/datetime/thai-buddhist-date";
import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";
import { getUserSignatureDataUrl } from "@/lib/user/user-signature";
import {
  SALES_ORDER_PAYMENT_METHOD_LABEL,
  type SalesOrderPaymentMethod,
} from "@/types/sales-orders";

import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type SalesOrderPdfRound = {
  roundNo: number;
  deliveryDate: string;
  items: SalesLinePdfItem[];
};

export type SalesOrderPdfData = {
  soNo: string;
  soDate: string;
  customerName: string;
  customerCode: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerPhone?: string;
  contactName?: string;
  customerPoNo: string;
  customerPoDate?: string;
  quotationNo: string;
  paymentMethod?: string;
  paymentDueDate?: string;
  paymentTerm?: string;
  requestedDeliveryDate: string;
  remark: string;
  taxRatePercent?: number;
  revisedAt?: string;
  confirmedAt?: string;
  /** เลขฉบับเอกสาร — ฉบับเก่าพิมพ์เลขของตัวเอง ไม่ใช่เลขปัจจุบัน */
  revisionNo?: number;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: SalesLinePdfItem[];
  rounds?: SalesOrderPdfRound[];
  isDraftPreview?: boolean;
  /** ผู้จัดทำเอกสาร — ถ้ามี id และคนนั้นอัปลายเซ็นไว้ จะเอารูปไปแสดงในช่องเซ็น */
  preparedBy?: { id?: string; name?: string };
  /** ใช้ลายเซ็นจาก snapshot — ถ้าไม่ส่งจะดึงจาก API ตาม preparedBy.id */
  preparedBySignatureDataUrl?: string | null;
  /** ผู้ยืนยันใบสั่งขาย → ช่องผู้อนุมัติบน PDF */
  approvedBy?: { id?: string; name?: string };
  approvedBySignatureDataUrl?: string | null;
};

function paymentMethodLabel(value?: string) {
  if (!value) return "—";
  return (
    SALES_ORDER_PAYMENT_METHOD_LABEL[value as SalesOrderPaymentMethod] ?? value
  );
}

export async function generateSalesOrderPdf(data: SalesOrderPdfData) {
  const preparedSignature =
    data.preparedBySignatureDataUrl !== undefined
      ? data.preparedBySignatureDataUrl
      : await getUserSignatureDataUrl(data.preparedBy?.id);

  const approvedSignature =
    data.approvedBySignatureDataUrl !== undefined
      ? data.approvedBySignatureDataUrl
      : await getUserSignatureDataUrl(data.approvedBy?.id);

  const vatRate =
    typeof data.taxRatePercent === "number" && Number.isFinite(data.taxRatePercent)
      ? data.taxRatePercent
      : undefined;
  const afterDiscount = Math.max(
    0,
    Number((data.subtotalAmount - data.discountAmount).toFixed(2)),
  );
  const remarkHtml = sanitizeDocumentHtml(data.remark);

  const itemGroups =
    data.rounds && data.rounds.length > 0
      ? data.rounds.map((round) => ({
          heading: `รอบที่ ${round.roundNo} — ${formatThaiBuddhistDate(round.deliveryDate, round.deliveryDate)}`,
          items: round.items,
        }))
      : undefined;

  await generateSalesCommercialPdf({
    pageId: "sales-order-pdf",
    titleTh: "ใบสั่งขาย",
    docNo: data.soNo,
    docDate: data.soDate,
    revisionLabel:
      salesOrderRevisionStamp(data.revisionNo, data.revisedAt),
    draftBanner: data.isDraftPreview
      ? "ตัวอย่างจากข้อมูลปัจจุบัน รวมส่วนที่กำลังแก้ไขยังไม่ได้บันทึก"
      : undefined,
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลลูกค้า",
        rows: [
          { label: "ลูกค้า", value: data.customerName },
          { label: "รหัสลูกค้า", value: data.customerCode },
          { label: "เลขที่ผู้เสียภาษี", value: data.customerTaxId || "—" },
          {
            label: "ที่อยู่",
            value: data.customerAddress || "—",
            full: true,
          },
          { label: "เบอร์โทร", value: data.customerPhone || "—" },
          { label: "ผู้ติดต่อ", value: data.contactName || "—" },
        ],
      },
      {
        title: "ข้อมูลเอกสาร",
        rows: [
          {
            label: "เลข PO ลูกค้า",
            value: data.customerPoNo,
            emphasis: true,
          },
          {
            label: "วันที่เอกสาร PO",
            value: data.customerPoDate || "—",
          },
          { label: "อ้างอิง QT", value: data.quotationNo },
          { label: "วิธีการชำระเงิน", value: paymentMethodLabel(data.paymentMethod) },
          { label: "เงื่อนไขการชำระ", value: data.paymentTerm || "—" },
          { label: "ครบกำหนดชำระ", value: data.paymentDueDate || "—" },
          // {
          //   label: "เงื่อนไขเอกสาร",
          //   value: remarkHtml || "—",
          //   full: true,
          //   html: Boolean(remarkHtml),
          // },
        ],
      },
    ],
    items: data.items,
    itemGroups,
    columnLabels: {
      no: "ลำดับ",
      code: "รหัสสินค้า",
      name: "รายการสินค้า",
      unit: "หน่วย",
      qty: "จำนวน",
      price: "ราคาต่อหน่วย",
      disc: "ส่วนลด",
      amount: "จำนวนเงิน",
    },
    withPrices: true,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    totalsLines: [
      { label: "ยอดรวมก่อนส่วนลด", value: data.subtotalAmount },
      { label: "ส่วนลดท้ายบิล", value: data.discountAmount },
      { label: "ยอดหลังหักส่วนลด", value: afterDiscount },
      { label: vatRate && vatRate > 0 ? `ภาษีมูลค่าเพิ่ม ${vatRate}%` : "ภาษีมูลค่าเพิ่ม", value: data.vatAmount },
      { label: "ยอดสุทธิ", value: data.totalAmount, grand: true },
    ],
    remark: remarkHtml,
    remarkLabel: "หมายเหตุ",
    remarkIsHtml: true,
    signatures: [
      {
        title: "ผู้จัดทำ",
        name: data.preparedBy?.name,
        signatureDataUrl: preparedSignature,
      },
      "ผู้ตรวจสอบ",
      {
        title: "ผู้อนุมัติ",
        name: data.approvedBy?.name,
        signatureDataUrl: approvedSignature,
      },
    ],
  });
}
