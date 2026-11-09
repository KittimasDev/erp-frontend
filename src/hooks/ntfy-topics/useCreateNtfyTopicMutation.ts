"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createNtfyTopic } from "@/lib/api/ntfy-topics";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { CreateNtfyTopicRequest } from "@/types/ntfy-topics";
import { ntfyTopicsQueryKey } from "./useNtfyTopicsQuery";

export function useCreateNtfyTopicMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "ntfy-topics", "create"],
    mutationFn: (payload: CreateNtfyTopicRequest) =>
      createNtfyTopic(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ntfyTopicsQueryKey });
      message.success(response.message || t("สร้างหัวข้อแจ้งเตือนสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างหัวข้อแจ้งเตือนไม่สำเร็จ"),
      );
    },
  });
}
