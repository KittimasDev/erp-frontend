import { apiFetch } from "./client";
import type {
  CreateShutdownPlanRequest,
  ShutdownMemberInput,
  ShutdownPlanApiResponse,
  ShutdownPlanListApiResponse,
  ShutdownSuggestApiResponse,
  UpdateShutdownPlanRequest,
} from "@/types/shutdown-plans";

const BASE = "/api/hrm/shutdown-plans";

export function getShutdownPlans(token: string, status?: string) {
  return apiFetch<ShutdownPlanListApiResponse>(
    `${BASE}${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    { method: "GET", token },
  );
}

export function getShutdownPlan(token: string, id: string) {
  return apiFetch<ShutdownPlanApiResponse>(`${BASE}/${id}`, {
    method: "GET",
    token,
  });
}

export function createShutdownPlan(
  token: string,
  body: CreateShutdownPlanRequest,
) {
  return apiFetch<ShutdownPlanApiResponse>(BASE, {
    method: "POST",
    token,
    body,
  });
}

export function updateShutdownPlan(
  token: string,
  id: string,
  body: UpdateShutdownPlanRequest,
) {
  return apiFetch<ShutdownPlanApiResponse>(`${BASE}/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function setShutdownPlanMembers(
  token: string,
  id: string,
  members: ShutdownMemberInput[],
) {
  return apiFetch<ShutdownPlanApiResponse>(`${BASE}/${id}/members`, {
    method: "PUT",
    token,
    body: { members },
  });
}

export function suggestShutdownPlanMembers(token: string, id: string) {
  return apiFetch<ShutdownSuggestApiResponse>(`${BASE}/${id}/suggest`, {
    method: "POST",
    token,
  });
}

export function cancelShutdownPlan(token: string, id: string, reason?: string) {
  return apiFetch<ShutdownPlanApiResponse>(`${BASE}/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}
