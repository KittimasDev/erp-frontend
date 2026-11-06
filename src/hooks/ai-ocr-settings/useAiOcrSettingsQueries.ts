"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import {
  deleteAiOcrApiKey,
  getAiOcrAvailability,
  getAiOcrSettings,
  testAiOcrConnection,
  updateAiOcrSettings,
} from "@/lib/api/ai-ocr-settings";
import { ApiError } from "@/lib/api/client";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import type { UpdateAiOcrSettingsRequest } from "@/types/ai-ocr-settings";

export const aiOcrSettingsQueryKey = ["settings", "ai-ocr"] as const;
export const aiOcrAvailabilityQueryKey = [
  "settings",
  "ai-ocr",
  "availability",
] as const;

export function useAiOcrAvailabilityQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiOcrAvailabilityQueryKey,
    queryFn: () => getAiOcrAvailability(getAccessToken()),
    enabled: (options?.enabled ?? true) && hasAccessToken(),
    retry: false,
  });
}

export function useAiOcrSettingsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiOcrSettingsQueryKey,
    queryFn: () => getAiOcrSettings(getAccessToken()),
    enabled: (options?.enabled ?? true) && hasAccessToken(),
    retry: false,
  });
}

export function useUpdateAiOcrSettingsMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["settings", "ai-ocr", "update"],
    mutationFn: (body: UpdateAiOcrSettingsRequest) =>
      updateAiOcrSettings(getAccessToken(), body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: aiOcrSettingsQueryKey });
      message.success(response.message || t("บันทึกการตั้งค่าสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("บันทึกการตั้งค่าไม่สำเร็จ"),
      );
    },
  });
}

export function useDeleteAiOcrApiKeyMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["settings", "ai-ocr", "delete-key"],
    mutationFn: () => deleteAiOcrApiKey(getAccessToken()),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: aiOcrSettingsQueryKey });
      message.success(response.message || t("ลบ API key สำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลบ API key ไม่สำเร็จ"),
      );
    },
  });
}

export function useTestAiOcrConnectionMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["settings", "ai-ocr", "test"],
    mutationFn: () => testAiOcrConnection(getAccessToken()),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: aiOcrSettingsQueryKey });
      // ทดสอบไม่ผ่านไม่ใช่ error ของ request — ตอบ 200 พร้อมเหตุผล
      if (response.data.success) {
        message.success(response.data.message);
      } else {
        message.warning(response.data.message);
      }
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ทดสอบการเชื่อมต่อไม่สำเร็จ"),
      );
    },
  });
}
