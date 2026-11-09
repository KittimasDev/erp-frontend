"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateNtfyTopic } from "@/lib/api/ntfy-topics";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { UpdateNtfyTopicRequest } from "@/types/ntfy-topics";
import { ntfyTopicsQueryKey } from "./useNtfyTopicsQuery";

type UpdateNtfyTopicPayload = {
  id: string;
  body: UpdateNtfyTopicRequest;
};

export function useUpdateNtfyTopicMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "ntfy-topics", "update"],
    mutationFn: ({ id, body }: UpdateNtfyTopicPayload) =>
      updateNtfyTopic(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ntfyTopicsQueryKey });
      message.success(response.message || t("แก้ไขหัวข้อแจ้งเตือนสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("แก้ไขหัวข้อแจ้งเตือนไม่สำเร็จ"),
      );
    },
  });
}
