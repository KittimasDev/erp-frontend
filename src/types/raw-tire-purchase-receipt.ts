export type ReceiptSeller = {
  id: string;
  sellerCode: string;
  sellerName: string;
  contactName?: string;
  phone?: string;
  paymentMethod?: string;
};

export type ReceiptTruck = {
  id: string;
  truckCode: string;
  licensePlate: string;
  province?: string;
  truckType?: string;
  driverName?: string;
  driverPhone?: string;
};

export type ReceiptTicket = {
  id: string;
  ticketNo: string;
  ticketType: string;
  truckLicensePlate?: string;
  driverName?: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  weighInAt?: string;
  weighOutAt?: string;
};

export type ReceiptItem = {
  id: string;
  tireClassificationId: string;
  classificationCode?: string;
  classificationName?: string;
  weightKg: string;
  postedWeightKg?: string;
  remainingWeightKg?: string;
  pricePerKg: string;
  amount: string;
  description?: string;
  sortOrder: number;
};

export type ReceiptDeduction = {
  id: string;
  deductionType: string;
  description?: string;
  deductionWeightKg: string;
  deductionPricePerKg?: string;
  deductionAmount: string;
};

export type ReceiptSummary = {
  netWeightKg: string;
  classifiedWeightKg: string;
  deductionWeightKg: string;
  payableWeightKg: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
};

export type ReceiptDetail = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  status: string;
  paymentStatus: string;
  stockPostingStatus: string;
  currentStep?: string;
  nextAction?: string;
  nextActionHref?: string;
  remark?: string;
  weighbridgeTicketId?: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  deductionWeightKg: string;
  payableWeightKg: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
  seller: ReceiptSeller;
  truck?: ReceiptTruck;
  ticket?: ReceiptTicket;
  items: ReceiptItem[];
  deductions: ReceiptDeduction[];
  summary: ReceiptSummary;
  canConfirm: boolean;
  canCancel: boolean;
  canEditClassification: boolean;
  canPrint: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptDetailApiResponse = {
  statusCode?: number;
  message: string;
  data: ReceiptDetail;
};

export type ReceiptPrintPreview = {
  receiptId: string;
  receiptNo: string;
  title: string;
  status: string;
  printMode: string;
  previewHtml: string;
  receipt: ReceiptDetail;
};

export type ReceiptPrintPreviewApiResponse = {
  statusCode?: number;
  message: string;
  data: ReceiptPrintPreview;
};

export type CancelReceiptRequest = {
  reason?: string;
};

export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายแล้ว",
};

export const STOCK_POSTING_STATUS_LABELS: Record<string, string> = {
  NOT_POSTED: "ยังไม่รับเข้าสต๊อก",
  PARTIALLY_POSTED: "รับเข้าสต๊อกบางส่วน",
  POSTED: "รับเข้าสต๊อกแล้ว",
  CANCELLED: "ยกเลิกรับเข้า",
};

export const RAW_TIRE_FLOW_STEP_LABELS: Record<string, string> = {
  WEIGH_IN: "ชั่งเข้า",
  WEIGH_OUT: "ชั่งออก",
  RECEIPT: "คัดแยก / ใบรับซื้อ",
  PAYMENT: "จ่ายเงิน",
  STOCK_IN: "เข้าคลัง",
  COMPLETED: "เข้าคลังแล้ว",
  CANCELLED: "ยกเลิก",
};

export const DEDUCTION_TYPE_LABELS: Record<string, string> = {
  WATER: "น้ำ",
  SOIL: "ดิน",
  METAL: "โลหะ",
  OTHER: "อื่นๆ",
};

export function formatDeductionDisplayName(row: {
  deductionType: string;
  description?: string;
}) {
  const name = row.description?.trim();
  if (name) {
    return name;
  }
  return DEDUCTION_TYPE_LABELS[row.deductionType] ?? row.deductionType;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
};
