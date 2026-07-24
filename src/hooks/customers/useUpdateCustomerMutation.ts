"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateCustomer } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateCustomerRequest } from "@/types/customers";
import { customersQueryKey } from "./useCustomersQuery";

type UpdateCustomerPayload = {
  id: string;
  body: UpdateCustomerRequest;
};

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "customers", "update"],
    mutationFn: ({ id, body }: UpdateCustomerPayload) =>
      updateCustomer(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: customersQueryKey });
      message.success(response.message || "แก้ไขข้อมูลลูกค้าสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "แก้ไขข้อมูลลูกค้าไม่สำเร็จ",
      );
    },
  });
}
