"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import { getOtSettings, updateOtSettings } from "@/lib/api/overtime";
import { getAccessToken } from "@/lib/auth/token";
import type { OtSettings } from "@/types/overtime";

export const otSettingsQueryKey = ["overtime", "settings"] as const;

export function useOtSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: otSettingsQueryKey,
    queryFn: () => getOtSettings(getAccessToken()),
    enabled,
  });
}

export function useUpdateOtSettingsMutation() {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OtSettings) => updateOtSettings(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกตั้งค่าอัตรา OT แล้ว"));
      void queryClient.invalidateQueries({ queryKey: ["overtime"] });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t("บันทึกตั้งค่าไม่สำเร็จ"));
    },
  });
}
