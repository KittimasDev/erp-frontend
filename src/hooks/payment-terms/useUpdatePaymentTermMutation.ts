"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { updatePaymentTerm } from "@/lib/api/payment-terms";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdatePaymentTermRequest } from "@/types/payment-terms";
import { paymentTermsQueryKey } from "./usePaymentTermsQuery";

type UpdatePaymentTermPayload = {
  id: string;
  body: UpdatePaymentTermRequest;
};

export function useUpdatePaymentTermMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "payment-terms", "update"],
    mutationFn: ({ id, body }: UpdatePaymentTermPayload) =>
      updatePaymentTerm(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: paymentTermsQueryKey });
      message.success(
        response.message || t("แก้ไขเงื่อนไขการชำระเงินสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขเงื่อนไขการชำระเงินไม่สำเร็จ"),
      );
    },
  });
}
