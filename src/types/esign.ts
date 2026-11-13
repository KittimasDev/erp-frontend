export type ESignMode = "OFF" | "PASSWORD" | "LOGIN";

export type ESignVerifyBody = {
  screenCode: string;
  password: string;
  /** ใช้เฉพาะโหมด LOGIN — ต้องตรงกับ username ของผู้ที่ล็อกอินอยู่ */
  username?: string;
};

export type ESignVerifyResult = {
  mode: ESignMode;
  grantToken: string | null;
  expiresInSeconds: number;
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
