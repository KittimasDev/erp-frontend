import type { AuthRole } from "./auth";

export type UserRole = AuthRole;

/** ประเภทการจ้าง — รหัสตรงกับ backend (users/constants/employment-type.ts) */
export type EmploymentType = "MONTHLY" | "DAILY" | "CONTRACT" | "PROBATION" | "OUTSOURCE";

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  MONTHLY: "รายเดือน",
  DAILY: "รายวัน",
  CONTRACT: "สัญญาจ้าง",
  PROBATION: "ทดลองงาน",
  OUTSOURCE: "เหมา / Outsource",
};

export const EMPLOYMENT_TYPE_OPTIONS = (
  Object.keys(EMPLOYMENT_TYPE_LABEL) as EmploymentType[]
).map((value) => ({ value, label: EMPLOYMENT_TYPE_LABEL[value] }));

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  departmentId?: string;
  departmentName?: string;
  /** แผนกย่อย (sections) — อยู่ในแผนกเดียวกับ departmentId เสมอ */
  sectionId?: string;
  sectionName?: string;
  /** หัวหน้างานโดยตรง (users.id) */
  supervisorId?: string;
  supervisorName?: string;
  position?: string;
  /** ตำแหน่งจาก master (positions) */
  positionId?: string;
  employmentType?: EmploymentType;
  hireDate?: string;
  employmentRemark?: string;
  /** ฐานค่าจ้าง: รายเดือน = เงินเดือน, รายวัน = ค่าแรงต่อวัน — มีเฉพาะ API จัดการผู้ใช้งาน */
  basePay?: number | null;
  /** หักประกันสังคมในงวดเงินเดือนหรือไม่ */
  socialSecurityEnabled?: boolean;
  /** % กองทุนสำรองเลี้ยงชีพที่หักจากเงินเดือน (0 = ไม่เข้า) */
  providentFundRatePercent?: number;
  /** หักภาษี ณ ที่จ่ายในงวดเงินเดือนหรือไม่ */
  taxEnabled?: boolean;
  /** ลดหย่อนภาษีเพิ่มเติมต่อปี */
  taxExtraAllowance?: number;
  /** เลขประจำตัวประชาชน 13 หลัก — ใช้ออก 50 ทวิ */
  nationalId?: string | null;
  address?: string | null;
  canLogin: boolean;
  isActive: boolean;
  isLocked: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** มีลายเซ็น PNG อัปโหลดไว้แล้วหรือไม่ */
  hasSignature: boolean;
  signatureUpdatedAt?: string;
  roles: UserRole[];
};

export type UserQueryParams = {
  q?: string;
  isActive?: boolean;
  roleId?: string;
  departmentId?: string;
  positionId?: string;
  employmentType?: string;
  page?: number;
  limit?: number;
};

export type CreateUserRequest = {
  username?: string;
  /** ไม่ส่งก็ได้ถ้าส่ง firstName — backend ประกอบจาก ชื่อ + นามสกุล */
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  departmentId?: string;
  sectionId?: string;
  supervisorId?: string;
  positionId?: string;
  position?: string;
  employmentType?: EmploymentType;
  hireDate?: string;
  employmentRemark?: string;
  basePay?: number | null;
  socialSecurityEnabled?: boolean;
  /** % กองทุนสำรองเลี้ยงชีพที่หักจากเงินเดือน (0 = ไม่เข้า) */
  providentFundRatePercent?: number;
  /** หักภาษี ณ ที่จ่ายในงวดเงินเดือนหรือไม่ */
  taxEnabled?: boolean;
  /** ลดหย่อนภาษีเพิ่มเติมต่อปี */
  taxExtraAllowance?: number;
  /** เลขประจำตัวประชาชน 13 หลัก — ใช้ออก 50 ทวิ */
  nationalId?: string | null;
  address?: string | null;
  canLogin?: boolean;
  password?: string;
  roleIds?: string[];
  isActive?: boolean;
};

export type UpdateUserRequest = {
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  departmentId?: string | null;
  /** null = เคลียร์แผนกย่อย · เปลี่ยนแผนกโดยไม่ส่งค่านี้ backend เคลียร์ให้ */
  sectionId?: string | null;
  /** null = เคลียร์หัวหน้างาน */
  supervisorId?: string | null;
  /** null = เคลียร์ตำแหน่ง */
  positionId?: string | null;
  position?: string;
  employmentType?: EmploymentType;
  hireDate?: string;
  employmentRemark?: string;
  /** null = เคลียร์ฐานค่าจ้าง · ไม่ส่ง = ไม่แก้ */
  basePay?: number | null;
  socialSecurityEnabled?: boolean;
  /** % กองทุนสำรองเลี้ยงชีพที่หักจากเงินเดือน (0 = ไม่เข้า) */
  providentFundRatePercent?: number;
  /** หักภาษี ณ ที่จ่ายในงวดเงินเดือนหรือไม่ */
  taxEnabled?: boolean;
  /** ลดหย่อนภาษีเพิ่มเติมต่อปี */
  taxExtraAllowance?: number;
  /** เลขประจำตัวประชาชน 13 หลัก — ใช้ออก 50 ทวิ */
  nationalId?: string | null;
  address?: string | null;
  canLogin?: boolean;
  isActive?: boolean;
  roleIds?: string[];
};

export type ResetPasswordRequest = {
  newPassword: string;
};

export type UserApiResponse = {
  statusCode?: number;
  message: string;
  data: AppUser;
};

export type UserListData = {
  items: AppUser[];
  total: number;
  page: number;
  limit: number;
};

export type UserListApiResponse = {
  statusCode?: number;
  message: string;
  data: UserListData;
};

export type Role = {
  id: string;
  roleCode: string;
  roleName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
};

export type RoleListApiResponse = {
  statusCode?: number;
  message: string;
  data: Role[];
};

export type RoleApiResponse = {
  statusCode?: number;
  message: string;
  data: Role;
};

export type CreateRoleRequest = {
  roleCode: string;
  roleName: string;
  description?: string;
};
