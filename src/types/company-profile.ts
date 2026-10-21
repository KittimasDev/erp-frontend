export type CompanyBankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName?: string | null;
  /** บัญชีหลัก — มีได้บัญชีเดียว เอกสารที่แสดงบัญชีเดียวจะใช้บัญชีนี้ */
  isDefault: boolean;
  isActive: boolean;
  /** บัญชีแยกประเภท (เงินฝากธนาคาร) ที่ผูกไว้ — ใช้ในสมุดรายวันจ่าย */
  glAccountId?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CompanyProfile = {
  id: string;
  nameTh: string;
  nameEn?: string | null;
  shortName?: string | null;
  taxId?: string | null;
  businessType?: string | null;
  /** path โลโก้ที่พิมพ์เอง — ใช้เมื่อ hasLogoFile = false */
  logoUrl?: string | null;
  /** มีไฟล์โลโก้ที่อัปโหลดไว้ — ถ้า true ให้โหลดรูปจาก GET .../logo แทน logoUrl */
  hasLogoFile: boolean;
  logoUpdatedAt?: string | null;
  addressLine?: string | null;
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  lineId?: string | null;
  isVatRegistered: boolean;
  defaultVatRate: number;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
  /** เดือนเริ่มปีบัญชี 1-12 */
  fiscalYearStartMonth: number;
  isActive: boolean;
  /** ที่อยู่รวมบรรทัดเดียว — backend ต่อมาให้แล้ว เอกสารใช้ค่านี้ได้เลย */
  addressText: string;
  bankAccounts: CompanyBankAccount[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateCompanyProfileRequest = Partial<
  Omit<
    CompanyProfile,
    | "id"
    | "addressText"
    | "bankAccounts"
    | "createdAt"
    | "updatedAt"
    | "defaultVatRate"
    // โลโก้ที่อัปโหลดแก้ผ่าน endpoint /logo ไม่ใช่ PATCH ตัวนี้
    | "hasLogoFile"
    | "logoUpdatedAt"
  >
> & {
  defaultVatRate?: number;
};

export type CreateCompanyBankAccountRequest = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  glAccountId?: string | null;
  sortOrder?: number;
};

export type UpdateCompanyBankAccountRequest =
  Partial<CreateCompanyBankAccountRequest>;

export type CompanyProfileApiResponse = {
  statusCode: number;
  message: string;
  data: CompanyProfile;
};

export type CompanyBankAccountApiResponse = {
  statusCode: number;
  message: string;
  data: CompanyBankAccount;
};

export type CompanyBankAccountListApiResponse = {
  statusCode: number;
  message: string;
  data: CompanyBankAccount[];
};
