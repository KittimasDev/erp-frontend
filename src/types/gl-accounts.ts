export type GlAccount = {
  id: string;
  code: string;
  nameTh: string;
  isActive: boolean;
};

export type GlAccountQuery = {
  search?: string;
  isActive?: boolean;
};

export type SaveGlAccountRequest = {
  code: string;
  name: string;
  isActive?: boolean;
};

export type AccountSettingKey =
  | "PURCHASE_DEFAULT"
  | "INPUT_VAT"
  | "AP_TRADE"
  | "CHARGE_FREIGHT"
  | "CHARGE_SERVICE"
  | "CHARGE_OTHER"
  | "ADVANCE_PAID"
  | "DEPOSIT_PAID"
  | "WHT_PAYABLE"
  | "CASH_ON_HAND"
  | "CHEQUE_PAYABLE"
  | "AR_TRADE"
  | "SALES_REVENUE"
  | "OUTPUT_VAT"
  | "WHT_RECEIVABLE"
  | "CUSTOMER_DEPOSIT"
  | "CHEQUE_RECEIVED";

export type AccountSetting = {
  settingKey: AccountSettingKey;
  glAccountId: string | null;
  label: string;
};
