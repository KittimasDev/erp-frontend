"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deletePaymentTerm } from "@/lib/api/payment-terms";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { paymentTermsQueryKey } from "./usePaymentTermsQuery";

export function useDeletePaymentTermMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "payment-terms", "delete"],
    mutationFn: (id: string) => deletePaymentTerm(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: paymentTermsQueryKey });
      message.success(
        response.message || "ลบเงื่อนไขการชำระเงินสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบเงื่อนไขการชำระเงินไม่สำเร็จ",
      );
    },
  });
}
