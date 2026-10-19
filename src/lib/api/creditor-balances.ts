import { apiFetch } from "./client";
import type {
  CreditorBalanceList,
  CreditorBalancePoLine,
  CreditorBalanceQuery,
  CreditorBalanceSummary,
} from "@/types/creditor-balances";

type Res<T> = { message: string; data: T };
const BASE = "/api/creditor-balances";

function qs(params?: Record<string, unknown>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && String(v).trim() !== "") s.set(k, String(v).trim());
  }
  const t = s.toString();
  return t ? `?${t}` : "";
}

export const getCreditorBalanceSummary = (token: string, params?: CreditorBalanceQuery) =>
  apiFetch<Res<CreditorBalanceSummary>>(`${BASE}/summary${qs(params as Record<string, unknown>)}`, {
    token,
  });

export const getCreditorBalances = (token: string, params?: CreditorBalanceQuery) =>
  apiFetch<Res<CreditorBalanceList>>(`${BASE}${qs(params as Record<string, unknown>)}`, { token });

export const getCreditorBalancePurchaseOrders = (token: string, creditorId: string) =>
  apiFetch<Res<CreditorBalancePoLine[]>>(`${BASE}/${creditorId}/purchase-orders`, { token });
