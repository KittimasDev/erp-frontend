import type {
  AccountSetting,
  GlAccount,
  GlAccountQuery,
  SaveGlAccountRequest,
} from "@/types/gl-accounts";

import { apiFetch } from "./client";

const BASE = "/api/master-data/gl-accounts";

type Res<T> = { statusCode: number; message: string; data: T };

function buildQuery(params?: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getGlAccounts(token: string, params?: GlAccountQuery) {
  return apiFetch<Res<GlAccount[]>>(`${BASE}${buildQuery(params)}`, { token });
}

export function createGlAccount(token: string, body: SaveGlAccountRequest) {
  return apiFetch<Res<GlAccount>>(BASE, { method: "POST", token, body });
}

export function updateGlAccount(token: string, id: string, body: Partial<SaveGlAccountRequest>) {
  return apiFetch<Res<GlAccount>>(`${BASE}/${id}`, { method: "PATCH", token, body });
}

export function deleteGlAccount(token: string, id: string) {
  return apiFetch<Res<GlAccount>>(`${BASE}/${id}`, { method: "DELETE", token });
}

export function getAccountSettings(token: string) {
  return apiFetch<Res<{ settings: AccountSetting[] }>>(`${BASE}/settings`, { token });
}

export function saveAccountSettings(
  token: string,
  settings: Array<{ settingKey: string; glAccountId: string | null }>,
) {
  return apiFetch<Res<{ settings: AccountSetting[] }>>(`${BASE}/settings`, {
    method: "PUT",
    token,
    body: { settings },
  });
}
