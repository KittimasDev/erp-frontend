import { apiFetch } from "./client";
import type { LoginApiResponse, LoginRequest, MeApiResponse } from "@/types/auth";

export function login(payload: LoginRequest) {
  return apiFetch<LoginApiResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getMe(token: string) {
  return apiFetch<MeApiResponse>("/api/auth/me", {
    method: "GET",
    token,
  });
}
