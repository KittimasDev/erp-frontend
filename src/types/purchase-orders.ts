import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import { tNow } from "@/lib/i18n/useT";
import { translate } from "@/lib/i18n/translate";
import {
  STANDARD_STATUS,
  standardStatusColor,
  standardStatusLabel,
} from "@/lib/status/standard-status";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REVISING"
  | "CONFIRMED"
  | "REJECTED"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CLOSED_PARTIAL"
  | "RECEIVE_CANCELLED"
  | "CANCELLED"
  | string;

/** ป้ายสถานะมาตรฐาน (ไทย → อังกฤษ) — ไม่รวม DELIVERED เพราะ "ส่งแล้ว" ในบริบทอื่นอาจแปลว่าส่งอนุมัติ */
const STANDARD_STATUS_EN: Record<string, string> = Object.fromEntries(
  ("DRAFT PENDING_APPROVAL APPROVED REJECTED IN_PROGRESS COMPLETED CANCELLED" as string)
    .split(" ")
    .map((k) => [STANDARD_STATUS[k as keyof typeof STANDARD_STATUS].th, STANDARD_STATUS[k as keyof typeof STANDARD_STATUS].en]),
);

const STATUS_LABEL_EN_OVERRIDE: Record<string, string> = {
  ...STANDARD_STATUS_EN,
  /* ในบริบทสถานะ "ยกเลิก" = Cancelled (ไม่ใช่ปุ่ม Cancel) และ "แก้ไข" = Revising (ไม่ใช่ปุ่ม Edit) */
  ยกเลิก: "Cancelled",
  แก้ไข: "Revising",
};

/** แปลป้ายสถานะเอกสาร (PO/GR/flow) ตามภาษา — เรียกตอนเรนเดอร์ในคอมโพเนนต์ที่ใช้ useT()/useLanguage() อยู่แล้ว */
export function tStatus(label: string, lang?: Language): string {
  const current = lang ?? getStoredLanguage();
  if (current === "en" && STATUS_LABEL_EN_OVERRIDE[label]) {
    return STATUS_LABEL_EN_OVERRIDE[label];
  }
  return translate(current, label);
}

export const PURCHASE_ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: standardStatusLabel("DRAFT"),
  PENDING_APPROVAL: standardStatusLabel("PENDING_APPROVAL"),
  // ถูกหัวหน้าส่งกลับมาแก้ — ต้องแยกจาก "ร่าง" ให้เห็นว่ามีงานค้างอยู่
  REVISING: "แก้ไข",
  // อนุมัติแล้ว = ส่ง PO ให้ Supplier ได้ และรอของเข้า
  CONFIRMED: "อนุมัติแล้ว · รอส่งสินค้า",
  REJECTED: standardStatusLabel("REJECTED"),
  PARTIALLY_RECEIVED: "รับของบางส่วน",
  COMPLETED: standardStatusLabel("COMPLETED"),
  CLOSED_PARTIAL: "ปิดรับบางส่วน",
  RECEIVE_CANCELLED: "ยกเลิกการรับ",
  CANCELLED: standardStatusLabel("CANCELLED"),
};

/**
 * สีป้ายสถานะใบสั่งซื้อ — ตามมาตรฐานกลาง
 * CONFIRMED = อนุมัติแล้ว (เขียว) · COMPLETED = เสร็จสิ้น · รับบางส่วน = กำลังดำเนินการ (ฟ้า)
 * REVISING ไม่ใช่สถานะมาตรฐาน (gold) · ยกเลิกการรับ = เทา
 */
export const PURCHASE_ORDER_STATUS_COLOR: Record<string, string> = {
  DRAFT: standardStatusColor("DRAFT"),
  PENDING_APPROVAL: standardStatusColor("PENDING_APPROVAL"),
  REVISING: "gold",
  CONFIRMED: standardStatusColor("APPROVED"),
  REJECTED: standardStatusColor("REJECTED"),
  PARTIALLY_RECEIVED: standardStatusColor("IN_PROGRESS"),
  COMPLETED: standardStatusColor("COMPLETED"),
  CLOSED_PARTIAL: standardStatusColor("COMPLETED"),
  RECEIVE_CANCELLED: standardStatusColor("CANCELLED"),
  CANCELLED: standardStatusColor("CANCELLED"),
};

/** สีป้ายสถานะ PO — ใบที่ CONFIRMED แต่ยังไม่มีของเข้า ใช้สีเดียวกับ CONFIRMED */
export function purchaseOrderStatusColor(status: string): string {
  return PURCHASE_ORDER_STATUS_COLOR[status] ?? "default";
}

/** ใบที่อนุมัติแล้วแต่ยังไม่มีของเข้า (รวมกรณีมีรอบยกเลิกการรับปน) — ใบเก่าที่ไม่มี receiveStatus คงป้ายเดิม */
export function purchaseOrderStatusLabel(
  po: Pick<PurchaseOrder, "status" | "receiveStatus">,
) {
  if (po.status === "CONFIRMED" && po.receiveStatus === "NOT_RECEIVED") {
    return "ยังไม่ได้รับสินค้า";
  }
  return PURCHASE_ORDER_STATUS_LABEL[po.status] ?? po.status;
}

/** รับของได้เฉพาะใบที่ยังเปิดรับ และยังมี Qty คงเหลือในรอบที่เปิด */
export function isPoReceivableStatus(status: string) {
  return status === "CONFIRMED" || status === "PARTIALLY_RECEIVED";
}

/** จ่ายเงินได้เมื่อรับครบ หรือปิดรับบางส่วน — ไม่รวมยกเลิกการรับ */
export function isPoPayableStatus(status: string) {
  return status === "COMPLETED" || status === "CLOSED_PARTIAL";
}

export type PurchaseOrderCreditorSummary = {
  id: string;
  creditorCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
};

export type PurchaseOrderPaymentTermSummary = {
  id: string;
  code: string;
  name: string;
  termType?: string;
  creditDays?: number;
};

export type PurchaseOrderApInvoiceSummary = {
  id: string;
  docNo: string;
  status: string;
  dueDate?: string | null;
  totalAmount: number;
};

export type PurchaseOrderTaxRateSummary = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

export type PurchaseOrderPrSummary = {
  id: string;
  prNo: string;
  status: string;
};

export type PurchaseOrderUserSummary = {
  id: string;
  username: string;
  displayName: string;
  phone?: string;
  departmentName?: string;
};

export type PurchaseOrderItem = {
  id: string;
  purchaseRequestItemId?: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  expectedWarehouseId?: string;
  expectedWarehouseCode?: string;
  expectedWarehouseName?: string;
  expectedLocationId?: string;
  expectedLocationCode?: string;
  expectedLocationName?: string;
  sortOrder: number;
};

export const PO_CHARGE_TYPE_LABEL: Record<string, string> = {
  FREIGHT: "ค่าขนส่ง",
  SERVICE: "ค่าบริการ",
  OTHER: "ค่าใช้จ่ายอื่น ๆ",
};

/** ค่าใช้จ่ายเพิ่มเติมของ PO (แยกจากรายการสินค้า) + ยอดที่ตั้งหนี้แล้ว/คงเหลือ */
export type PurchaseOrderCharge = {
  id: string;
  chargeType: string;
  /** ประเภทค่าใช้จ่ายจาก Master (null = รายการเดิมที่ใช้ chargeType) */
  expenseTypeId?: string | null;
  expenseTypeCode?: string | null;
  expenseTypeName?: string | null;
  description: string;
  amountBeforeVat: string;
  /** NONE / EXCLUSIVE / INCLUSIVE */
  vatMode: string;
  taxRateId?: string | null;
  taxRatePercent: string;
  vatAmount: string;
  totalAmount: string;
  whtApplicable: boolean;
  whtIncomeType?: string | null;
  whtRate: string;
  sortOrder: number;
  /** ยอดก่อน VAT ที่นำไปตั้งหนี้แล้ว (AP ที่ยังมีผล) */
  allocatedAmount: number;
  /** ยอดก่อน VAT ที่ยังนำไปตั้งหนี้ได้ */
  remainingAmount: number;
};

export type PurchaseOrderChargeBody = {
  id?: string;
  /** ไม่ส่งเมื่อมี expenseTypeId — backend กำหนดให้ตามประเภทค่าใช้จ่าย */
  chargeType?: string;
  /** null = ใช้ chargeType แบบเดิม · รายการเดิมที่ไม่ส่ง = คงค่าเดิม */
  expenseTypeId?: string | null;
  description: string;
  amountBeforeVat: number;
  vatMode?: string;
  taxRateId?: string | null;
  whtApplicable?: boolean;
  whtIncomeType?: string | null;
  whtRate?: number;
};

export type PoPaymentAdjustmentItem = {
  id: string;
  docNo: string;
  docType: "DEBIT_NOTE" | "CREDIT_NOTE";
  docDate: string;
  totalAmount: number;
  signedAmount: number;
  appliedAt: string;
  apDocumentId: string;
  apDocumentNo: string;
};

/** สรุปยอดชำระหลังรวมใบปรับหนี้ — ไม่แก้ totalAmount ของ PO */
export type PoPaymentAdjustment = {
  originalAmount: number;
  appliedDebits: number;
  appliedCredits: number;
  payableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  adjustments: PoPaymentAdjustmentItem[];
};

export type PurchaseOrder = {
  id: string;
  poNo: string;
  poDate: string;
  purchaseRequestId?: string;
  /** ใบขอซื้อใบแรก — ใบที่รวมมาหลายใบให้ใช้ `purchaseRequests` */
  purchaseRequest?: PurchaseOrderPrSummary;
  /** ใบขอซื้อต้นทางทั้งหมด (backend อ่านจากบรรทัด) */
  purchaseRequests?: PurchaseOrderPrSummary[];
  creditorId: string;
  creditor?: PurchaseOrderCreditorSummary;
  paymentTermId?: string;
  paymentTerm?: PurchaseOrderPaymentTermSummary;
  taxRateId?: string;
  taxRate?: PurchaseOrderTaxRateSummary;
  vatMode?: string;
  expectedDeliveryDate?: string;
  paymentMethod?: string;
  withholdingTaxType?: string;
  withholdingTaxPercent?: string;
  status: PurchaseOrderStatus;
  receiveStatus?: string;
  paymentStatus?: string;
  /** ยอดจ่ายจริงสะสมจาก supplier_payments (หน้า detail) */
  paidAmount?: string;
  /** สรุปการชำระเงินและการปรับหนี้ (หน้า detail — ไม่แก้ยอด PO ต้นฉบับ) */
  paymentAdjustment?: PoPaymentAdjustment;
  /** ใบตั้งหนี้ที่ผูก PO (หน้า detail) — วันครบกำหนดแยกตามใบ */
  apInvoices?: PurchaseOrderApInvoiceSummary[];
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  /** ยอดรวม PO = ค่าสินค้า + ค่าใช้จ่ายเพิ่มเติม + VAT ทั้งหมด */
  totalAmount: string;
  /** ค่าใช้จ่ายเพิ่มเติมรวม (ก่อน VAT) — รวมใน totalAmount แล้ว */
  extraChargesAmount?: string;
  /** VAT ของค่าใช้จ่ายเพิ่มเติม — รวมใน vatAmount แล้ว */
  extraChargesVat?: string;
  charges?: PurchaseOrderCharge[];
  remark?: string;
  submittedAt?: string;
  approvedById?: string;
  approvedBy?: PurchaseOrderUserSummary;
  approvedAt?: string;
  rejectedReason?: string;
  createdById?: string;
  createdBy?: PurchaseOrderUserSummary;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderListData = {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
};

export type PurchaseOrderQueryParams = {
  poNo?: string;
  status?: string;
  purchaseRequestId?: string;
  poDateFrom?: string;
  poDateTo?: string;
  itemIds?: string[];
  page?: number;
  limit?: number;
};

export type CreatePurchaseOrderItemFromPrBody = {
  purchaseRequestItemId: string;
  unitPrice: number;
  discountAmount?: number;
  description?: string;
};

export type CreatePurchaseOrderFromPrBody = {
  poDate: string;
  creditorId: string;
  paymentTermId?: string;
  taxRateId?: string;
  vatMode?: string;
  expectedDeliveryDate?: string;
  paymentMethod?: string;
  withholdingTaxType?: string;
  withholdingTaxPercent?: number;
  discountAmount?: number;
  remark?: string;
  items: CreatePurchaseOrderItemFromPrBody[];
  charges?: PurchaseOrderChargeBody[];
};

/** รวมใบขอซื้อหลายใบเป็นใบสั่งซื้อใบเดียว — โครงเดิม เพิ่มรายการใบขอซื้อต้นทาง */
export type CreatePurchaseOrderFromPrsBody = CreatePurchaseOrderFromPrBody & {
  purchaseRequestIds: string[];
};

export type UpdatePurchaseOrderItemBody = {
  id?: string;
  purchaseRequestItemId?: string;
  itemId?: string;
  quantity?: number;
  unitId?: string;
  unitPrice?: number;
  discountAmount?: number;
  description?: string;
  sortOrder?: number;
};

export type UpdatePurchaseOrderBody = {
  poDate?: string;
  creditorId?: string;
  paymentTermId?: string | null;
  taxRateId?: string | null;
  vatMode?: string;
  expectedDeliveryDate?: string | null;
  paymentMethod?: string | null;
  withholdingTaxType?: string;
  withholdingTaxPercent?: number;
  discountAmount?: number;
  remark?: string;
  items?: UpdatePurchaseOrderItemBody[];
  /** ไม่ส่ง = ไม่แตะค่าเดิม · [] = ลบทั้งหมด · รายการ = upsert ตาม id */
  charges?: PurchaseOrderChargeBody[];
  /** ไม่ส่ง = ไม่แตะรอบเดิม · ส่งมา = เขียนทับทั้งชุด */
  deliverySchedules?: Array<{
    deliveryDate: string;
    items: Array<{ purchaseRequestItemId: string; quantity: number }>;
  }>;
};

/** ปฏิเสธ / ส่งกลับแก้ไข ใบสั่งซื้อ */
export type RejectPurchaseOrderBody = {
  reason?: string;
};

export type PurchaseOrderApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseOrder;
};

export type PurchaseOrderListApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseOrderListData;
};

export type PurchaseOrderByPrApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseOrder | null;
};

/**
 * ใบขอซื้อต้นทางของใบสั่งซื้อ
 *
 * ใบที่สร้างก่อนมีฟีเจอร์รวมหลายใบ (และ response เก่าที่ยัง cache อยู่) จะมีแค่
 * `purchaseRequest` เดี่ยว จึง fallback ให้ด้วย ผู้เรียกทุกที่จะได้เห็นรูปเดียวกัน
 */
export function listPurchaseRequests(
  po: Pick<PurchaseOrder, "purchaseRequest" | "purchaseRequests">,
): PurchaseOrderPrSummary[] {
  if (po.purchaseRequests?.length) {
    return po.purchaseRequests;
  }
  return po.purchaseRequest ? [po.purchaseRequest] : [];
}

/** ป้าย "ภาษีมูลค่าเพิ่ม n%" แบบแปลภาษาตามหน้าจอ (ตัวเดิมใน lib/money ใช้กับ PDF ซึ่งเป็นไทยเสมอ) */
export function vatAmountLabelT(rate?: number | null): string {
  const base = tNow("ภาษีมูลค่าเพิ่ม");
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0
    ? `${base} ${rate}%`
    : base;
}
