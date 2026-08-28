"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  deleteT2900OutboundTicket,
  generateT2900OutboundTickets,
} from "@/lib/api/t2900";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { GenerateT2900BatchRequest } from "@/types/t2900";
import { t2900OutboundTicketsQueryKey } from "./useT2900OutboundTicketsQuery";

export function useGenerateT2900TicketsMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "t2900", "generate-batch"],
    mutationFn: (payload?: GenerateT2900BatchRequest) =>
      generateT2900OutboundTickets(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: t2900OutboundTicketsQueryKey,
      });
      message.success(response.message || "สร้างบัตรชั่ง mock 5 ใบแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างบัตรชั่ง mock ไม่สำเร็จ",
      );
    },
  });
}

export function useDeleteT2900TicketMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["weighbridge", "t2900", "delete"],
    mutationFn: (tckNo: string) =>
      deleteT2900OutboundTicket(getAccessToken(), tckNo),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: t2900OutboundTicketsQueryKey,
      });
      message.success(response.message || "ลบบัตรชั่ง T2900 แล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบบัตรชั่ง T2900 ไม่สำเร็จ",
      );
    },
  });
}
