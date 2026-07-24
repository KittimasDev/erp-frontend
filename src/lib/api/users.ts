import { apiFetch } from "./client";
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateUserRequest,
  UserApiResponse,
  UserListApiResponse,
  UserQueryParams,
} from "@/types/users";

export function getUsers(token: string, params: UserQueryParams = {}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.isActive === true || params.isActive === false) {
    search.set("isActive", String(params.isActive));
  }
  if (params.roleId?.trim()) {
    search.set("roleId", params.roleId.trim());
  }
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 200));
  const query = search.toString();
  return apiFetch<UserListApiResponse>(
    `/api/users${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getUser(token: string, id: string) {
  return apiFetch<UserApiResponse>(`/api/users/${id}`, {
    method: "GET",
    token,
  });
}

export function createUser(token: string, body: CreateUserRequest) {
  return apiFetch<UserApiResponse>("/api/users", {
    method: "POST",
    token,
    body,
  });
}

export function updateUser(token: string, id: string, body: UpdateUserRequest) {
  return apiFetch<UserApiResponse>(`/api/users/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function resetUserPassword(
  token: string,
  id: string,
  body: ResetPasswordRequest,
) {
  return apiFetch<UserApiResponse>(`/api/users/${id}/reset-password`, {
    method: "PATCH",
    token,
    body,
  });
}

export function activateUser(token: string, id: string) {
  return apiFetch<UserApiResponse>(`/api/users/${id}/activate`, {
    method: "PATCH",
    token,
  });
}

export function deactivateUser(token: string, id: string) {
  return apiFetch<UserApiResponse>(`/api/users/${id}/deactivate`, {
    method: "PATCH",
    token,
  });
}
