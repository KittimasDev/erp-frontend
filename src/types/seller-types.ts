export type SellerType = {
  id: string;
  sellerTypeCode: string;
  sellerTypeName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SellerTypeQueryParams = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateSellerTypeRequest = {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateSellerTypeRequest = Partial<CreateSellerTypeRequest>;

export type SellerTypeApiResponse = {
  message: string;
  data: SellerType;
};

export type SellerTypeListApiResponse = {
  message: string;
  data: SellerType[];
};
