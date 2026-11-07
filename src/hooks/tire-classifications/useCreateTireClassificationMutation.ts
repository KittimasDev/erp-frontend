"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { createTireClassification } from "@/lib/api/tire-classifications";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateTireClassificationRequest } from "@/types/tire-classifications";
import { tireClassificationsQueryKey } from "./useTireClassificationsQuery";

export function useCreateTireClassificationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "tire-classifications", "create"],
    mutationFn: (payload: CreateTireClassificationRequest) =>
      createTireClassification(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: tireClassificationsQueryKey,
      });
      message.success(
        response.message || t("สร้างประเภท/กลุ่มยางสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างประเภท/กลุ่มยางไม่สำเร็จ"),
      );
    },
  });
}
