"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { updateWeighbridgeScale } from "@/lib/api/weighbridge-scales";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateWeighbridgeScaleRequest } from "@/types/weighbridge-scales";
import { weighbridgeScalesQueryKey } from "./useWeighbridgeScalesQuery";

type UpdateWeighbridgeScalePayload = {
  id: string;
  body: UpdateWeighbridgeScaleRequest;
};

export function useUpdateWeighbridgeScaleMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "weighbridge-scales", "update"],
    mutationFn: ({ id, body }: UpdateWeighbridgeScalePayload) =>
      updateWeighbridgeScale(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: weighbridgeScalesQueryKey,
      });
      message.success(response.message || t("แก้ไขเครื่องชั่งสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขเครื่องชั่งไม่สำเร็จ"),
      );
    },
  });
}
