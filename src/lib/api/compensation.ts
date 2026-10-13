import { apiFetch } from "./client";
import type {
  CompensationListApiResponse,
  CompensationRowApiResponse,
  UpdateCompensationRequest,
} from "@/types/compensation";

const BASE = "/api/hrm/compensation";

export function getCompensation(token: string, q?: string) {
  const search = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiFetch<CompensationListApiResponse>(`${BASE}${search}`, {
    method: "GET",
    token,
  });
}

export function updateCompensation(
  token: string,
  userId: string,
  body: UpdateCompensationRequest,
) {
  return apiFetch<CompensationRowApiResponse>(`${BASE}/${userId}`, {
    method: "PUT",
    token,
    body,
  });
}
