import type { AuthRole } from "./auth";

export type UserRole = AuthRole;

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  departmentId?: string;
  departmentName?: string;
  position?: string;
  hireDate?: string;
  employmentRemark?: string;
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
  page?: number;
  limit?: number;
};

export type CreateUserRequest = {
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  departmentId?: string;
  position?: string;
  hireDate?: string;
  employmentRemark?: string;
  canLogin?: boolean;
  password?: string;
  roleIds?: string[];
  isActive?: boolean;
};

export type UpdateUserRequest = {
  username?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  departmentId?: string | null;
  position?: string;
  hireDate?: string;
  employmentRemark?: string;
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
