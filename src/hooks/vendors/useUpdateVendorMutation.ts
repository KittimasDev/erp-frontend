"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateVendor } from "@/lib/api/vendors";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { UpdateVendorRequest } from "@/types/vendors";
import { vendorsQueryKey } from "./useVendorsQuery";

type UpdateVendorPayload = {
  id: string;
  body: UpdateVendorRequest;
};

export function useUpdateVendorMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "creditors", "update"],
    mutationFn: ({ id, body }: UpdateVendorPayload) =>
      updateVendor(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: vendorsQueryKey });
      message.success(response.message || t("แก้ไขผู้ขายสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("แก้ไขผู้ขายไม่สำเร็จ"),
      );
    },
  });
}
