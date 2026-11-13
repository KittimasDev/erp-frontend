"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { getESignSettings, updateESignSetting } from "@/lib/api/esign";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { ESignMode, ESignSettingsApiResponse } from "@/types/esign";

export const eSignSettingsQueryKey = ["esign-settings"] as const;

export function useESignSettingsQuery() {
  return useQuery({
    queryKey: eSignSettingsQueryKey,
    queryFn: () => getESignSettings(getAccessToken()),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
}

type UpdateVars = { screenCode: string; mode: ESignMode };

function patchMode(
  data: ESignSettingsApiResponse | undefined,
  screenCode: string,
  mode: ESignMode,
): ESignSettingsApiResponse | undefined {
  if (!data) return data;
  return {
    ...data,
    data: data.data.map((row) =>
      row.screenCode === screenCode ? { ...row, mode } : row,
    ),
  };
}

/** เปลี่ยนโหมด E-Signature ต่อหน้าจอ — optimistic, rollback เฉพาะหน้าจอนั้นเมื่อพลาด */
export function useUpdateESignSettingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screenCode, mode }: UpdateVars) =>
      updateESignSetting(getAccessToken(), screenCode, mode),
    onMutate: async ({ screenCode, mode }) => {
      await queryClient.cancelQueries({ queryKey: eSignSettingsQueryKey });
      const previous = queryClient
        .getQueryData<ESignSettingsApiResponse>(eSignSettingsQueryKey)
        ?.data.find((row) => row.screenCode === screenCode)?.mode;
      queryClient.setQueryData<ESignSettingsApiResponse>(
        eSignSettingsQueryKey,
        (old) => patchMode(old, screenCode, mode),
      );
      return { previous };
    },
    onError: (error, { screenCode }, context) => {
      if (context?.previous) {
        const previous = context.previous;
        queryClient.setQueryData<ESignSettingsApiResponse>(
          eSignSettingsQueryKey,
          (old) => patchMode(old, screenCode, previous),
        );
      }
      message.error(
        error instanceof ApiError
          ? error.message
          : t("บันทึกโหมด E-Signature ไม่สำเร็จ"),
      );
    },
    onSuccess: () => {
      message.success(t("บันทึกโหมด E-Signature แล้ว — ใช้กับทุก Role"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: eSignSettingsQueryKey });
    },
  });
}
