"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteSellerBankAccount } from "@/lib/api/seller-bank-accounts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { sellerBankAccountsQueryKey } from "./useSellerBankAccountsQuery";

export function useDeleteSellerBankAccountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "seller-bank-accounts", "delete"],
    mutationFn: (id: string) =>
      deleteSellerBankAccount(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: sellerBankAccountsQueryKey,
      });
      message.success(
        response.message || "ลบบัญชีธนาคารผู้ขายสำเร็จแล้ว",
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "ลบบัญชีธนาคารผู้ขายไม่สำเร็จ",
      );
    },
  });
}
