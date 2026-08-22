export type AuthRole = {
  id: string;
  roleCode: string;
  roleName: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginUser = {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  roles: AuthRole[];
  /** มีลายเซ็น PNG อัปโหลดไว้แล้วหรือไม่ (มาจาก GET /auth/me) */
  hasSignature?: boolean;
  /** ใช้เป็น cache buster ตอนโหลดรูปลายเซ็น */
  signatureUpdatedAt?: string | null;
};

export type LoginData = {
  access_token: string;
  token_type: string;
  expires_in: string;
  user: LoginUser;
};

export type LoginApiResponse = {
  statusCode?: number;
  message: string;
  data: LoginData;
};

/**
 * ข้อมูลตัวเองจาก GET /auth/me — กว้างกว่า LoginUser เพราะหน้าโปรไฟล์ต้องใช้
 * แยก type กันเพราะ response ของ login ไม่มีฟิลด์ HR เหล่านี้
 */
export type MeUser = LoginUser & {
  email?: string;
  phone?: string;
  employeeCode?: string;
  departmentId?: string;
  departmentName?: string;
  position?: string;
  hireDate?: string;
  canLogin?: boolean;
  isLocked?: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MeApiResponse = {
  statusCode?: number;
  message: string;
  data: MeUser;
};
