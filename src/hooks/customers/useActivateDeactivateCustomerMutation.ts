"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { activateCustomer, deactivateCustomer } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { customersQueryKey } from "./useCustomersQuery";

export function useActivateCustomerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["customers", "activate"],
    mutationFn: (id: string) => activateCustomer(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: customersQueryKey });
      message.success(response.message || "เปิดใช้งานลูกค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "เปิดใช้งานลูกค้าไม่สำเร็จ",
      );
    },
  });
}

export function useDeactivateCustomerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["customers", "deactivate"],
    mutationFn: (id: string) => deactivateCustomer(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: customersQueryKey });
      message.success(response.message || "ปิดใช้งานลูกค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ปิดใช้งานลูกค้าไม่สำเร็จ",
      );
    },
  });
}
