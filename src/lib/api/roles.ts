import { apiFetch } from "./client";
import type {
  CreateRoleRequest,
  RoleApiResponse,
  RoleListApiResponse,
} from "@/types/users";

export function getRoles(token: string) {
  return apiFetch<RoleListApiResponse>("/api/roles", {
    method: "GET",
    token,
  });
}

export function createRole(token: string, body: CreateRoleRequest) {
  return apiFetch<RoleApiResponse>("/api/roles", {
    method: "POST",
    token,
    body,
  });
}

export function deleteRole(token: string, id: string) {
  return apiFetch<{ statusCode?: number; message: string; data: null }>(
    `/api/roles/${id}`,
    { method: "DELETE", token },
  );
}
