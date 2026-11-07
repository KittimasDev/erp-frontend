"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteTempCase } from "@/lib/api/temp-cases";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { tempCaseSummaryQueryKey } from "./useTempCaseSummaryQuery";
import { tempCasesQueryKey } from "./useTempCasesQuery";

export function useDeleteTempCaseMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["temp-cases", "delete"],
    mutationFn: (id: string) => deleteTempCase(getAccessToken(), id),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tempCasesQueryKey }),
        queryClient.invalidateQueries({ queryKey: tempCaseSummaryQueryKey }),
      ]);
      message.success(response.message || t("ลบเคสสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลบเคสไม่สำเร็จ"),
      );
    },
  });
}
