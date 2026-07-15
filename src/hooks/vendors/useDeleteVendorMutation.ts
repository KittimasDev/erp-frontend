"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { deleteVendor } from "@/lib/api/vendors";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { vendorsQueryKey } from "./useVendorsQuery";

export function useDeleteVendorMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "creditors", "delete"],
    mutationFn: (id: string) => deleteVendor(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: vendorsQueryKey });
      message.success(response.message || "ลบผู้ขายสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลบผู้ขายไม่สำเร็จ",
      );
    },
  });
}
