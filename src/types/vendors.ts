export type Vendor = {
  id: string;
  creditorCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  defaultCreditDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VendorQueryParams = {
  name?: string;
  taxId?: string;
  contactName?: string;
  contactPhone?: string;
  creditDays?: number;
  isActive?: boolean;
};

export type CreateVendorRequest = {
  code: string;
  name: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  defaultCreditDays?: number;
  isActive?: boolean;
};

export type UpdateVendorRequest = Partial<CreateVendorRequest>;

export type VendorApiResponse = {
  message: string;
  data: Vendor;
};

export type VendorListApiResponse = {
  message: string;
  data: Vendor[];
};
