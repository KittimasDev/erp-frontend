import { apiFetch } from "./client";
import type {
  ConfirmedProductionRoundListResponse,
  CreateProductionPlanBody,
  ScheduleCalendarResponse,
  SchedulePreviewResponse,
  ScheduleRoundListResponse,
  ScheduleRoundResponse,
  ScheduleSettingsResponse,
  UpdateScheduleRoundBody,
} from "@/types/production-schedule";

const BASE = "/api/production/schedule";

export const getScheduleRounds = (
  token: string,
  params: { q?: string; status?: string } = {},
) => {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  const qs = search.toString();
  return apiFetch<ScheduleRoundListResponse>(`${BASE}/rounds${qs ? `?${qs}` : ""}`, { token });
};

export const getScheduleCalendar = (token: string, month: string) =>
  apiFetch<ScheduleCalendarResponse>(`${BASE}/calendar?month=${month}`, { token });

export const getScheduleSettings = (token: string) =>
  apiFetch<ScheduleSettingsResponse>(`${BASE}/settings`, { token });

export const updateScheduleSettings = (token: string, confirmLeadDays: number) =>
  apiFetch<ScheduleSettingsResponse>(`${BASE}/settings`, {
    method: "PATCH",
    token,
    body: { confirmLeadDays },
  });

export const createProductionPlan = (token: string, body: CreateProductionPlanBody) =>
  apiFetch<ScheduleRoundListResponse>(`${BASE}/plans`, { method: "POST", token, body });

export const previewScheduleRound = (token: string, id: string, body: UpdateScheduleRoundBody) =>
  apiFetch<SchedulePreviewResponse>(`${BASE}/rounds/${id}/preview`, {
    method: "POST",
    token,
    body,
  });

export const updateScheduleRound = (token: string, id: string, body: UpdateScheduleRoundBody) =>
  apiFetch<ScheduleRoundResponse>(`${BASE}/rounds/${id}`, { method: "PATCH", token, body });

export const confirmScheduleRound = (token: string, id: string, reason?: string) =>
  apiFetch<ScheduleRoundResponse>(`${BASE}/rounds/${id}/confirm`, {
    method: "POST",
    token,
    body: reason ? { reason } : {},
  });

export const getConfirmedProductionRounds = (token: string) =>
  apiFetch<ConfirmedProductionRoundListResponse>(
    "/api/hrm/shifts/confirmed-production-rounds",
    { token },
  );
