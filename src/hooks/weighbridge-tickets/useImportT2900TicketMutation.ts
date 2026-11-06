"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { importWeighbridgeTicketFromT2900 } from "@/lib/api/t2900";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { ImportFromT2900Request } from "@/types/t2900";
import { weighbridgeDashboardQueryKey } from "./useWeighbridgeDashboardQuery";
import { t2900OutboundTicketsQueryKey } from "./useT2900OutboundTicketsQuery";
import { useT } from "@/lib/i18n/useT";

export function useImportT2900TicketMutation() {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "tickets", "from-t2900"],
    mutationFn: (payload: ImportFromT2900Request) =>
      importWeighbridgeTicketFromT2900(getAccessToken(), payload),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: t2900OutboundTicketsQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: weighbridgeDashboardQueryKey,
        }),
      ]);
      message.success(
        response.message || t("เปิดตั๋วชั่งจาก T2900 สำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("เปิดตั๋วชั่งจาก T2900 ไม่สำเร็จ"),
      );
    },
  });
}
