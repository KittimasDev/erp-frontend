"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateTempCase } from "@/lib/api/temp-cases";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateTempCaseRequest } from "@/types/temp-cases";
import { tempCaseSummaryQueryKey } from "./useTempCaseSummaryQuery";
import { tempCasesQueryKey } from "./useTempCasesQuery";

type UpdateTempCasePayload = {
  id: string;
  body: UpdateTempCaseRequest;
};

export function useUpdateTempCaseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["temp-cases", "update"],
    mutationFn: ({ id, body }: UpdateTempCasePayload) =>
      updateTempCase(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tempCasesQueryKey }),
        queryClient.invalidateQueries({ queryKey: tempCaseSummaryQueryKey }),
      ]);
      message.success(response.message || "แก้ไขเคสสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "แก้ไขเคสไม่สำเร็จ",
      );
    },
  });
}
