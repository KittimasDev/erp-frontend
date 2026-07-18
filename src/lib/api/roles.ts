import { apiFetch } from "./client";
import type { RoleListApiResponse } from "@/types/users";

export function getRoles(token: string) {
  return apiFetch<RoleListApiResponse>("/api/roles", {
    method: "GET",
    token,
  });
}
