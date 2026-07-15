"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateTireClassification } from "@/lib/api/tire-classifications";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateTireClassificationRequest } from "@/types/tire-classifications";
import { tireClassificationsQueryKey } from "./useTireClassificationsQuery";

type UpdateTireClassificationPayload = {
  id: string;
  body: UpdateTireClassificationRequest;
};

export function useUpdateTireClassificationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "tire-classifications", "update"],
    mutationFn: ({ id, body }: UpdateTireClassificationPayload) =>
      updateTireClassification(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: tireClassificationsQueryKey,
      });
      message.success(
        response.message || "แก้ไขประเภท/กลุ่มยางสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "แก้ไขประเภท/กลุ่มยางไม่สำเร็จ",
      );
    },
  });
}
