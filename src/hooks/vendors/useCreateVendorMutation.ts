"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { createVendor } from "@/lib/api/vendors";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateVendorRequest } from "@/types/vendors";
import { vendorsQueryKey } from "./useVendorsQuery";

export function useCreateVendorMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "creditors", "create"],
    mutationFn: (payload: CreateVendorRequest) =>
      createVendor(getAccessToken(), payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: vendorsQueryKey });
      message.success(response.message || "สร้างผู้ขายสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างผู้ขายไม่สำเร็จ",
      );
    },
  });
}
