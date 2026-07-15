export type PurchaseRequestType = {
  id: string;
  code: string;
  nameTh: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseRequestTypeQueryParams = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreatePurchaseRequestTypeRequest = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdatePurchaseRequestTypeRequest =
  Partial<CreatePurchaseRequestTypeRequest>;

export type PurchaseRequestTypeApiResponse = {
  message: string;
  data: PurchaseRequestType;
};

export type PurchaseRequestTypeListApiResponse = {
  message: string;
  data: PurchaseRequestType[];
};
