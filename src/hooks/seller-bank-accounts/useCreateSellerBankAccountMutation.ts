"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createSellerBankAccount } from "@/lib/api/seller-bank-accounts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { CreateSellerBankAccountRequest } from "@/types/seller-bank-accounts";
import { sellerBankAccountsQueryKey } from "./useSellerBankAccountsQuery";

export function useCreateSellerBankAccountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "seller-bank-accounts", "create"],
    mutationFn: (payload: CreateSellerBankAccountRequest) =>
      createSellerBankAccount(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: sellerBankAccountsQueryKey,
      });
      message.success(
        response.message || t("สร้างบัญชีธนาคารผู้ขายสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างบัญชีธนาคารผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
