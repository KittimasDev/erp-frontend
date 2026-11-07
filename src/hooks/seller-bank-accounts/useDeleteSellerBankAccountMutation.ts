"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteSellerBankAccount } from "@/lib/api/seller-bank-accounts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { sellerBankAccountsQueryKey } from "./useSellerBankAccountsQuery";

export function useDeleteSellerBankAccountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "seller-bank-accounts", "delete"],
    mutationFn: (id: string) =>
      deleteSellerBankAccount(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: sellerBankAccountsQueryKey,
      });
      message.success(
        response.message || t("ลบบัญชีธนาคารผู้ขายสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("ลบบัญชีธนาคารผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
