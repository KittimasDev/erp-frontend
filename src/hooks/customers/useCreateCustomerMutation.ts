"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createCustomer } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { CreateCustomerRequest } from "@/types/customers";
import { customersQueryKey } from "./useCustomersQuery";

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "customers", "create"],
    mutationFn: (payload: CreateCustomerRequest) =>
      createCustomer(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: customersQueryKey });
      message.success(response.message || t("สร้างลูกค้าสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างลูกค้าไม่สำเร็จ"),
      );
    },
  });
}
