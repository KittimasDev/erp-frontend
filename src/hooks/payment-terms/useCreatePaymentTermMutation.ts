"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createPaymentTerm } from "@/lib/api/payment-terms";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreatePaymentTermRequest } from "@/types/payment-terms";
import { paymentTermsQueryKey } from "./usePaymentTermsQuery";

export function useCreatePaymentTermMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "payment-terms", "create"],
    mutationFn: (payload: CreatePaymentTermRequest) =>
      createPaymentTerm(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: paymentTermsQueryKey });
      message.success(
        response.message || "สร้างเงื่อนไขการชำระเงินสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "สร้างเงื่อนไขการชำระเงินไม่สำเร็จ",
      );
    },
  });
}
