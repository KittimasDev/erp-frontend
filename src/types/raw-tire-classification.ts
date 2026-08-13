export type ClassificationSummary = {
  netWeightKg: string;
  classifiedWeightKg: string;
  deductionWeightKg: string;
  payableWeightKg: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
};

export type ClassificationItem = {
  id: string;
  tireClassificationId: string;
  classificationCode?: string;
  classificationName?: string;
  weightKg: string;
  pricePerKg: string;
  amount: string;
  description?: string;
  sortOrder: number;
};

export type ClassificationDeduction = {
  id: string;
  deductionType: string;
  description?: string;
  deductionWeightKg: string;
  deductionAmount: string;
};

export type RawTirePurchaseReceipt = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  status: string;
  paymentStatus?: string;
  stockPostingStatus?: string;
  remark?: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  deductionWeightKg: string;
  payableWeightKg: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
  items: ClassificationItem[];
  deductions: ClassificationDeduction[];
  summary: ClassificationSummary;
};

export type ClassificationTicket = {
  id: string;
  ticketNo: string;
  status: string;
  displayStatus: string;
  sellerId?: string;
  sellerCode?: string;
  sellerName?: string;
  truckId?: string;
  truckLicensePlate?: string;
  truckProvince?: string;
  driverName?: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  weighInAt?: string;
  weighOutAt?: string;
};

export type ClassificationContext = {
  ticket: ClassificationTicket;
  receipt?: RawTirePurchaseReceipt;
  canClassify: boolean;
  canEdit: boolean;
  missingPriceClassifications?: string[];
};

export type ClassificationContextApiResponse = {
  statusCode?: number;
  message: string;
  data: ClassificationContext;
};

export type RawTirePurchaseReceiptApiResponse = {
  statusCode?: number;
  message: string;
  data: RawTirePurchaseReceipt;
};

export type ClassificationItemInput = {
  tireClassificationId: string;
  weightKg: number;
  description?: string;
};

export type ClassificationDeductionInput = {
  deductionType: string;
  deductionWeightKg: number;
  deductionPricePerKg?: number;
  deductionAmount?: number;
  description?: string;
};

export type SaveClassificationRequest = {
  items: ClassificationItemInput[];
  deductions?: ClassificationDeductionInput[];
  remark?: string;
};

export type CreateRawTirePurchaseReceiptRequest = SaveClassificationRequest & {
  weighbridgeTicketId: string;
};

export const DEDUCTION_TYPE_OPTIONS = [
  { value: "WATER", label: "น้ำ" },
  { value: "SOIL", label: "ดิน" },
  { value: "METAL", label: "โลหะ" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;

export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};
