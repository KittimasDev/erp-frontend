import { apiFetch } from "./client";
import type {
  MyPermissionsApiResponse,
  RolePermissionsApiResponse,
  ScreenCatalogListApiResponse,
  UpdateRolePermissionsRequest,
} from "@/types/permissions";

export function getMyPermissions(token: string) {
  return apiFetch<MyPermissionsApiResponse>("/api/permissions/me", {
    method: "GET",
    token,
  });
}

export function getPermissionScreens(token: string) {
  return apiFetch<ScreenCatalogListApiResponse>("/api/permissions/screens", {
    method: "GET",
    token,
  });
}

export function getRolePermissions(token: string, roleId: string) {
  return apiFetch<RolePermissionsApiResponse>(
    `/api/permissions/roles/${roleId}`,
    { method: "GET", token },
  );
}

export function updateRolePermissions(
  token: string,
  roleId: string,
  body: UpdateRolePermissionsRequest,
) {
  return apiFetch<RolePermissionsApiResponse>(
    `/api/permissions/roles/${roleId}`,
    { method: "PUT", token, body },
  );
}
