export const CUSTOMER_TYPES = ["DOMESTIC", "EXPORT", "DEALER", "GENERAL"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export type Customer = {
  id: string;
  customerCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  customerType?: string;
  defaultCreditDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerQueryParams = {
  q?: string;
  customerType?: string;
  isActive?: boolean;
};

export type CreateCustomerRequest = {
  customerCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  customerType?: string;
  defaultCreditDays?: number;
  isActive?: boolean;
};

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export type CustomerApiResponse = {
  statusCode: number;
  message: string;
  data: Customer;
};

export type CustomerListApiResponse = {
  statusCode: number;
  message: string;
  data: Customer[];
};
