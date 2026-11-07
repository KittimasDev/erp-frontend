"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { activateCustomer, deactivateCustomer } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { customersQueryKey } from "./useCustomersQuery";

export function useActivateCustomerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["customers", "activate"],
    mutationFn: (id: string) => activateCustomer(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: customersQueryKey });
      message.success(response.message || t("เปิดใช้งานลูกค้าสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("เปิดใช้งานลูกค้าไม่สำเร็จ"),
      );
    },
  });
}

export function useDeactivateCustomerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["customers", "deactivate"],
    mutationFn: (id: string) => deactivateCustomer(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: customersQueryKey });
      message.success(response.message || t("ปิดใช้งานลูกค้าสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ปิดใช้งานลูกค้าไม่สำเร็จ"),
      );
    },
  });
}
