export type RawTirePriceRule = {
  id: string;
  ruleCode: string;
  tireClassificationId: string;
  pricePerKg: string | number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RawTirePriceRuleQueryParams = {
  code?: string;
  tireClassificationId?: string;
  effectiveOn?: string;
  isActive?: boolean;
};

export type CreateRawTirePriceRuleRequest = {
  code: string;
  tireClassificationId: string;
  pricePerKg: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
};

export type UpdateRawTirePriceRuleRequest =
  Partial<CreateRawTirePriceRuleRequest>;

export type RawTirePriceRuleApiResponse = {
  message: string;
  data: RawTirePriceRule;
};

export type RawTirePriceRuleListApiResponse = {
  message: string;
  data: RawTirePriceRule[];
};
