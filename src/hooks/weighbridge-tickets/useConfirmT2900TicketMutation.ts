"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { confirmWeighbridgeTicketFromT2900 } from "@/lib/api/t2900";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { ConfirmFromT2900Request } from "@/types/t2900";
import { weighbridgeDashboardQueryKey } from "./useWeighbridgeDashboardQuery";
import { t2900OutboundTicketsQueryKey } from "./useT2900OutboundTicketsQuery";
import { t2900TicketDetailQueryKey } from "./useT2900TicketDetailQuery";

export function useConfirmT2900TicketMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "tickets", "from-t2900", "confirm"],
    mutationFn: (payload: ConfirmFromT2900Request) =>
      confirmWeighbridgeTicketFromT2900(getAccessToken(), payload),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: t2900OutboundTicketsQueryKey,
        }),
        queryClient.invalidateQueries({ queryKey: t2900TicketDetailQueryKey }),
        queryClient.invalidateQueries({
          queryKey: weighbridgeDashboardQueryKey,
        }),
      ]);
      message.success(
        response.message || "ยืนยันรับซื้อจากบัตรชั่ง T2900 สำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ยืนยันรับซื้อจากบัตรชั่ง T2900 ไม่สำเร็จ",
      );
    },
  });
}
