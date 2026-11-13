export type ESignMode = "OFF" | "PASSWORD" | "LOGIN";

export type ESignAction = "APPROVE" | "REJECT" | "RETURN";

export type ESignVerifyBody = {
  screenCode: string;
  /** grant ผูกกับการกระทำนี้เท่านั้น */
  action: ESignAction;
  /** เอกสารที่ grant นี้อนุมัติได้ (1..200) — ใช้ได้เอกสารละครั้ง */
  documentIds: string[];
  password: string;
  /** ใช้เฉพาะโหมด LOGIN — ต้องตรงกับ username ของผู้ที่ล็อกอินอยู่ */
  username?: string;
};

export type ESignVerifyResult = {
  mode: ESignMode;
  grantToken: string | null;
  expiresInSeconds: number;
  documentIds?: string[];
};

export type ESignRequirementApiResponse = {
  message?: string;
  data: { screenCode: string; mode: ESignMode };
};

export type ESignVerifyApiResponse = {
  message?: string;
  data: ESignVerifyResult;
};

export type ESignSetting = {
  screenCode: string;
  mode: ESignMode;
  isDefault: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
};

export type ESignSettingsApiResponse = {
  message?: string;
  data: ESignSetting[];
};

export type UpdateESignSettingApiResponse = {
  message?: string;
  data: { screenCode: string; mode: ESignMode; changed: boolean };
};

export type ESignatureRecord = {
  id: string;
  documentType: string;
  documentId: string;
  documentNo?: string | null;
  screenCode?: string | null;
  action?: ESignAction | null;
  mode?: "PASSWORD" | "LOGIN" | null;
  signedById: string;
  signedByName?: string;
  signatureMethod: string;
  /** ISO */
  signedAt: string;
  remark?: string;
};

export type ESignatureHistoryApiResponse = {
  message?: string;
  data: ESignatureRecord[];
};
