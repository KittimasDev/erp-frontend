export type PaymentTerm = {
  id: string;
  code: string;
  name: string;
  creditDays: number;
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
