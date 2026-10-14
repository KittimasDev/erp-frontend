export type PaymentTermType = "ADVANCE" | "ON_RECEIPT" | "CREDIT";

export const PAYMENT_TERM_TYPE_LABEL: Record<PaymentTermType, string> = {
  ADVANCE: "ชำระล่วงหน้า / มัดจำ",
  ON_RECEIPT: "ชำระเมื่อรับสินค้า",
  CREDIT: "เครดิต",
};

export const PAYMENT_TERM_TYPE_COLOR: Record<PaymentTermType, string> = {
  ADVANCE: "orange",
  ON_RECEIPT: "blue",
  CREDIT: "purple",
};

export type PaymentTerm = {
  id: string;
  code: string;
  name: string;
  creditDays: number;
  termType: PaymentTermType;
  advancePercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentTermQueryParams = {
  code?: string;
  name?: string;
  creditDays?: number;
  isActive?: boolean;
};

export type CreatePaymentTermRequest = {
  code: string;
  name: string;
  creditDays?: number;
  termType?: PaymentTermType;
  advancePercent?: number;
  isActive?: boolean;
};

export type UpdatePaymentTermRequest = Partial<CreatePaymentTermRequest>;

export type PaymentTermApiResponse = {
  message: string;
  data: PaymentTerm;
};

export type PaymentTermListApiResponse = {
  message: string;
  data: PaymentTerm[];
};
