export type PaymentSeller = {
  id: string;
  sellerCode: string;
  sellerName: string;
  contactName?: string;
  phone?: string;
  paymentMethod?: string;
};

export type PaymentBankAccount = {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
  isActive: boolean;
};

export type PaymentReceiptSummary = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  status: string;
  paymentStatus: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
  netWeightKg: string;
  payableWeightKg: string;
};

export type PurchasePayment = {
  id: string;
  receiptId: string;
  voucherId?: string;
  paymentDate: string;
  paymentMethod: string;
  bankAccountId?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  amount: string;
  transactionRef?: string;
  remark?: string;
  createdAt: string;
};

export type PurchasePaymentVoucher = {
  id: string;
  voucherNo: string;
  voucherDate: string;
  receiptId?: string;
  sellerId: string;
  paymentMethod: string;
  totalAmount: string;
  status: string;
  paidAt?: string;
  paidById?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentContext = {
  receipt: PaymentReceiptSummary;
  seller: PaymentSeller;
  bankAccounts: PaymentBankAccount[];
  voucher?: PurchasePaymentVoucher;
  payment?: PurchasePayment;
  slips: PaymentSlipAttachment[];
  canPay: boolean;
  /** อัปโหลดสลิปได้เฉพาะช่วงรอจ่าย — จ่ายแล้วล็อก */
  canUploadSlip: boolean;
  canPrint: boolean;
};

export type PaymentSlipAttachment = {
  id: string;
  documentType: string;
  documentId: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize: string;
  attachmentGroup?: string;
  description?: string;
  uploadedById?: string;
  uploadedByName?: string;
  createdAt: string;
};

export type PaymentSlipApiResponse = {
  statusCode?: number;
  message: string;
  data: PaymentSlipAttachment;
};

export type PaymentSlipListApiResponse = {
  statusCode?: number;
  message: string;
  data: PaymentSlipAttachment[];
};

export type PaymentContextApiResponse = {
  statusCode?: number;
  message: string;
  data: PaymentContext;
};

export type PayReceiptRequest = {
  paymentMethod: "CASH" | "TRANSFER" | "CHEQUE";
  sellerBankAccountId?: string;
  paymentDate: string;
  paymentAmount: number;
  transactionRef?: string;
  remark?: string;
};

export type PaymentPrintPreview = {
  receiptId: string;
  voucherNo: string;
  title: string;
  printMode: string;
  previewHtml: string;
  payment: PaymentContext;
};

export type PaymentPrintPreviewApiResponse = {
  statusCode?: number;
  message: string;
  data: PaymentPrintPreview;
};

export const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "เงินสด" },
  { value: "TRANSFER", label: "โอนเงิน" },
  { value: "CHEQUE", label: "เช็ค" },
] as const;
