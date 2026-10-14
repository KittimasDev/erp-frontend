"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/production-schedule";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateScheduleRoundBody } from "@/types/production-schedule";

import { productionCyclesKey } from "../production-cycles/useProductionCycles";

export const productionScheduleKey = ["production-schedule"] as const;

export function useScheduleRoundsQuery(params: { q?: string; status?: string }) {
  return useQuery({
    queryKey: [...productionScheduleKey, "rounds", params],
    queryFn: () => api.getScheduleRounds(getAccessToken(), params),
  });
}

export function useScheduleCalendarQuery(month: string) {
  return useQuery({
    queryKey: [...productionScheduleKey, "calendar", month],
    queryFn: () => api.getScheduleCalendar(getAccessToken(), month),
  });
}

export function useScheduleSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: [...productionScheduleKey, "settings"],
    queryFn: () => api.getScheduleSettings(getAccessToken()),
    enabled,
  });
}

export function useConfirmedProductionRoundsQuery(enabled = true) {
  return useQuery({
    queryKey: [...productionScheduleKey, "confirmed-windows"],
    queryFn: () => api.getConfirmedProductionRounds(getAccessToken()),
    enabled,
  });
}

function useHelpers() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const done = (text: string) => {
    void queryClient.invalidateQueries({ queryKey: productionScheduleKey });
    void queryClient.invalidateQueries({ queryKey: productionCyclesKey });
    message.success(text);
  };
  const fail = (error: unknown, fallback: string) =>
    message.error(error instanceof ApiError ? error.message : fallback);
  return { done, fail };
}

export function useCreateProductionPlanMutation() {
  const { done, fail } = useHelpers();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createProductionPlan>[1]) =>
      api.createProductionPlan(getAccessToken(), body),
    onSuccess: () => done("สร้างแผนการผลิตแล้ว ทุกรอบอยู่สถานะรอยืนยัน"),
    onError: (error) => fail(error, "สร้างแผนการผลิตไม่สำเร็จ"),
  });
}

export function usePreviewScheduleRoundMutation() {
  const { fail } = useHelpers();
  return useMutation({
    mutationFn: (input: { id: string; body: UpdateScheduleRoundBody }) =>
      api.previewScheduleRound(getAccessToken(), input.id, input.body),
    onError: (error) => fail(error, "คำนวณผลกระทบไม่สำเร็จ"),
  });
}

export function useUpdateScheduleRoundMutation() {
  const { done, fail } = useHelpers();
  return useMutation({
    mutationFn: (input: { id: string; body: UpdateScheduleRoundBody }) =>
      api.updateScheduleRound(getAccessToken(), input.id, input.body),
    onSuccess: (res) => done(`บันทึกรอบ ${res.data.roundNo} แล้ว`),
    onError: (error) => fail(error, "บันทึกรอบการผลิตไม่สำเร็จ"),
  });
}

export function useConfirmScheduleRoundMutation() {
  const { done, fail } = useHelpers();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      api.confirmScheduleRound(getAccessToken(), input.id, input.reason),
    onSuccess: (res) => done(`ยืนยันรอบ ${res.data.roundNo} แล้ว`),
    onError: (error) => fail(error, "ยืนยันรอบการผลิตไม่สำเร็จ"),
  });
}

export function useUpdateScheduleSettingsMutation() {
  const { done, fail } = useHelpers();
  return useMutation({
    mutationFn: (confirmLeadDays: number) =>
      api.updateScheduleSettings(getAccessToken(), confirmLeadDays),
    onSuccess: () => done("บันทึกจำนวนวันล่วงหน้าแล้ว"),
    onError: (error) => fail(error, "บันทึกการตั้งค่าไม่สำเร็จ"),
  });
}
