"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteTireClassification } from "@/lib/api/tire-classifications";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { tireClassificationsQueryKey } from "./useTireClassificationsQuery";

export function useDeleteTireClassificationMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "tire-classifications", "delete"],
    mutationFn: (id: string) =>
      deleteTireClassification(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: tireClassificationsQueryKey,
      });
      message.success(response.message || "ลบประเภท/กลุ่มยางสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบประเภท/กลุ่มยางไม่สำเร็จ",
      );
    },
  });
}
