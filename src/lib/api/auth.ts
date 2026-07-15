import { apiFetch } from "./client";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export function login(payload: LoginRequest) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}
