import { apiFetch } from "./client";
import type { LoginApiResponse, LoginRequest, MeApiResponse } from "@/types/auth";

export function login(payload: LoginRequest) {
  return apiFetch<LoginApiResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

/**
 * แจ้ง backend ว่าออกจากระบบ (บันทึก audit log) — best-effort
 * `keepalive` ให้ request ไปถึงแม้หน้ากำลัง redirect ไป /login และไม่ throw ถ้าล้มเหลว
 */
export function logout(token: string): Promise<void> {
  return fetch("/api/auth/logout", {
    method: "POST",
    keepalive: true,
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  })
    .then(() => undefined)
    .catch(() => undefined);
}

export function getMe(token: string) {
  return apiFetch<MeApiResponse>("/api/auth/me", {
    method: "GET",
    token,
  });
}
