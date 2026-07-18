import type { AuthRole } from "./auth";

export type UserRole = AuthRole;

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  isLocked: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  createdAt: string;
  updatedAt: string;
  roles: UserRole[];
};

export type UserQueryParams = {
  q?: string;
  isActive?: boolean;
  roleId?: string;
};

export type CreateUserRequest = {
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  password: string;
  roleIds: string[];
  isActive?: boolean;
};

export type UpdateUserRequest = {
  displayName?: string;
  email?: string;
  phone?: string;
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

export type UserListApiResponse = {
  statusCode?: number;
  message: string;
  data: AppUser[];
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
