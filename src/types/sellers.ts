export type Seller = {
  id: string;
  sellerCode: string;
  sellerTypeId?: string;
  sellerName: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactName?: string;
  paymentMethod?: string;
  remark?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SellerQueryParams = {
  code?: string;
  name?: string;
  sellerTypeId?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  paymentMethod?: string;
  isActive?: boolean;
};

export type CreateSellerRequest = {
  code: string;
  name: string;
  sellerTypeId?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactName?: string;
  paymentMethod?: string;
  remark?: string;
  isActive?: boolean;
};

export type UpdateSellerRequest = Partial<CreateSellerRequest>;

export type SellerApiResponse = {
  message: string;
  data: Seller;
};

export type SellerListApiResponse = {
  message: string;
  data: Seller[];
};
