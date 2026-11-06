"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createWeighbridgeTicket } from "@/lib/api/weighbridge-tickets";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateWeighbridgeTicketRequest } from "@/types/weighbridge-tickets";
import { weighbridgeDashboardQueryKey } from "./useWeighbridgeDashboardQuery";
import { useT } from "@/lib/i18n/useT";

export function useCreateWeighbridgeTicketMutation() {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "tickets", "create"],
    mutationFn: (payload: CreateWeighbridgeTicketRequest) =>
      createWeighbridgeTicket(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: weighbridgeDashboardQueryKey,
      });
      message.success(response.message || t("เปิดตั๋วชั่งสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("เปิดตั๋วชั่งไม่สำเร็จ"),
      );
    },
  });
}
