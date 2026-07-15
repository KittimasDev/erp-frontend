export type TaxRate = {
  id: string;
  code: string;
  name: string;
  rate: number | string;
  taxType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaxRateQueryParams = {
  code?: string;
  name?: string;
  rate?: number;
  taxType?: string;
  isActive?: boolean;
};

export type CreateTaxRateRequest = {
  code: string;
  name: string;
  rate: number;
  taxType?: string;
  isActive?: boolean;
};

export type UpdateTaxRateRequest = Partial<CreateTaxRateRequest>;

export type TaxRateApiResponse = {
  message: string;
  data: TaxRate;
};

export type TaxRateListApiResponse = {
  message: string;
  data: TaxRate[];
};
