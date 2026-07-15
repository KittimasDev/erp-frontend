export type SellerBankAccount = {
  id: string;
  sellerId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SellerBankAccountQueryParams = {
  sellerId?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  isDefault?: boolean;
  isActive?: boolean;
};

export type CreateSellerBankAccountRequest = {
  sellerId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault?: boolean;
  isActive?: boolean;
};

export type UpdateSellerBankAccountRequest =
  Partial<CreateSellerBankAccountRequest>;

export type SellerBankAccountApiResponse = {
  message: string;
  data: SellerBankAccount;
};

export type SellerBankAccountListApiResponse = {
  message: string;
  data: SellerBankAccount[];
};
