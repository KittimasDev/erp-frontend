import type { PaymentTermType } from "@/types/payment-terms";

export type PayableItemStatus = "PENDING" | "AWAITING_ADVANCE" | "AWAITING_RECEIPT";

export const PAYABLE_ITEM_STATUS_LABEL: Record<PayableItemStatus, string> = {
  PENDING: "รอดำเนินการ",
  AWAITING_ADVANCE: "รอชำระล่วงหน้า",
  AWAITING_RECEIPT: "รอรับสินค้า",
};

export const PAYABLE_ITEM_STATUS_COLOR: Record<PayableItemStatus, string> = {
  PENDING: "blue",
  AWAITING_ADVANCE: "orange",
  AWAITING_RECEIPT: "gold",
};

/** ตัวกรองประเภทเงื่อนไข — NONE = PO ที่ไม่ได้ระบุเงื่อนไขชำระ */
export type PayableTermTypeFilter = PaymentTermType | "NONE";

export type PayablePaymentTerm = {
  id: string;
  code: string;
  name: string;
  termType: PaymentTermType;
  creditDays: number;
  advancePercent: number;
};

export type PayablePurchaseOrder = {
  id: string;
  poNo: string;
  poDate: string;
  expectedDeliveryDate: string | null;
  poStatus: string;
  receiveStatus: string;
  creditor: { id: string; creditorCode: string; nameTh: string } | null;
  paymentTerm: PayablePaymentTerm | null;
  totalAmount: number;
  amountDue: number;
  dueDate: string | null;
  payableStatus: PayableItemStatus;
};

export type PayablePurchaseOrderLine = {
  id: string;
  itemCode: string | null;
  itemName: string | null;
  description: string | null;
  quantity: number;
  unitName: string | null;
  unitPrice: number;
  discountAmount: number;
  amount: number;
};

export type PayablePurchaseOrderDetail = PayablePurchaseOrder & {
  vatMode: string;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  paymentMethod: string | null;
  remark: string | null;
  approvedAt: string | null;
  items: PayablePurchaseOrderLine[];
};

export type PayablePurchaseOrderQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  termType?: PayableTermTypeFilter;
  status?: PayableItemStatus;
};

export type PayablePurchaseOrderListData = {
  items: PayablePurchaseOrder[];
  total: number;
  page: number;
  limit: number;
};

export type PayablePurchaseOrderListResponse = {
  message: string;
  data: PayablePurchaseOrderListData;
};

export type PayablePurchaseOrderDetailResponse = {
  message: string;
  data: PayablePurchaseOrderDetail;
};
