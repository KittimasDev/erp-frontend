"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createTempCase } from "@/lib/api/temp-cases";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { CreateTempCaseRequest } from "@/types/temp-cases";
import { tempCaseSummaryQueryKey } from "./useTempCaseSummaryQuery";
import { tempCasesQueryKey } from "./useTempCasesQuery";

export function useCreateTempCaseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["temp-cases", "create"],
    mutationFn: (payload: CreateTempCaseRequest) =>
      createTempCase(getAccessToken(), payload),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tempCasesQueryKey }),
        queryClient.invalidateQueries({ queryKey: tempCaseSummaryQueryKey }),
      ]);
      message.success(response.message || t("สร้างเคสสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างเคสไม่สำเร็จ"),
      );
    },
  });
}
