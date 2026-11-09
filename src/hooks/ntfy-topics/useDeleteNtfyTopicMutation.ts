"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteNtfyTopic } from "@/lib/api/ntfy-topics";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { ntfyTopicsQueryKey } from "./useNtfyTopicsQuery";

export function useDeleteNtfyTopicMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "ntfy-topics", "delete"],
    mutationFn: (id: string) => deleteNtfyTopic(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ntfyTopicsQueryKey });
      message.success(response.message || t("ลบหัวข้อแจ้งเตือนสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลบหัวข้อแจ้งเตือนไม่สำเร็จ"),
      );
    },
  });
}
