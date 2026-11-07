"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateSellerBankAccount } from "@/lib/api/seller-bank-accounts";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { UpdateSellerBankAccountRequest } from "@/types/seller-bank-accounts";
import { sellerBankAccountsQueryKey } from "./useSellerBankAccountsQuery";

type UpdateSellerBankAccountPayload = {
  id: string;
  body: UpdateSellerBankAccountRequest;
};

export function useUpdateSellerBankAccountMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "seller-bank-accounts", "update"],
    mutationFn: ({ id, body }: UpdateSellerBankAccountPayload) =>
      updateSellerBankAccount(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: sellerBankAccountsQueryKey,
      });
      message.success(
        response.message || t("แก้ไขบัญชีธนาคารผู้ขายสำเร็จแล้ว"),
      );
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขบัญชีธนาคารผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
