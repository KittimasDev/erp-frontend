export type AdvanceRequestStatus = "DRAFT" | "PENDING_PV" | "CANCELLED";

export const ADVANCE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  PENDING_PV: "รอสร้างใบสำคัญจ่าย",
  CANCELLED: "ยกเลิก",
};

export const ADVANCE_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING_PV: "green",
  CANCELLED: "red",
};

export const WHT_TYPE_LABEL: Record<string, string> = {
  NONE: "ไม่มี",
  PCT_1: "หัก 1%",
  PCT_3: "หัก 3%",
  CUSTOM: "กำหนดอัตราเอง",
};

export type AdvanceCalcMode = "PERCENT" | "AMOUNT";

export type EligiblePayable = {
  purchaseOrderId: string;
  poNo: string;
  poDate: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  paymentTermName: string;
  poTotalAmount: number;
  poAmountBeforeVat: number;
  advancePercent: number;
  advanceLimitAmount: number;
  alreadyRequestedAmount: number;
  remainingAmount: number;
  whtType: string;
  whtRate: number;
};

export type AdvanceRequest = {
  id: string;
  requestNo: string;
  requestDate: string;
  status: AdvanceRequestStatus | string;
  purchaseOrderId: string;
  poNo: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  advanceType: string;
  poTotalAmount: number;
  poAmountBeforeVat: number;
  advancePercent: number;
  advanceLimitAmount: number;
  /** วงเงินที่ขอเพิ่มได้ (ไม่นับรายการนี้) */
  remainingLimitAmount: number;
  calcMode: AdvanceCalcMode | string;
  percent?: number;
  requestedAmount: number;
  desiredPayDate?: string;
  reason?: string;
  whtApplicable: boolean;
  whtType: string;
  whtIncomeType?: string;
  whtBaseAmount: number;
  whtBaseOverridden: boolean;
  whtRate: number;
  whtAmount: number;
  netTransferAmount: number;
  whtVerified: boolean;
  whtVerifiedByName?: string;
  whtVerifiedAt?: string;
  requestedById?: string;
  requestedByName?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
};

export type AdvanceRequestList = { items: AdvanceRequest[]; total: number; page: number; limit: number };

export type CreateAdvanceRequestBody = {
  purchaseOrderId: string;
  requestDate?: string;
  calcMode: AdvanceCalcMode;
  percent?: number;
  amount?: number;
  desiredPayDate?: string;
  reason?: string;
};

export type UpdateAdvanceRequestBody = Partial<Omit<CreateAdvanceRequestBody, "purchaseOrderId">>;

export type UpdateAdvanceWhtBody = {
  whtApplicable: boolean;
  whtType?: string;
  whtIncomeType?: string;
  /** ไม่ส่ง = ใช้ฐานเริ่มต้น (สัดส่วนยอดก่อน VAT ของ PO) */
  whtBaseAmount?: number;
  whtRate?: number;
  whtVerified: boolean;
};

export type AdvanceRequestQuery = { search?: string; status?: string; page?: number; limit?: number };

export const ADVANCE_DOCUMENT_TYPE = "ADVANCE_PAYMENT_REQUEST";
