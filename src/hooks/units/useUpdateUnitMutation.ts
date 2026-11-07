"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { updateUnit } from "@/lib/api/units";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateUnitRequest } from "@/types/units";
import { unitsQueryKey } from "./useUnitsQuery";

type UpdateUnitPayload = {
  id: string;
  body: UpdateUnitRequest;
};

export function useUpdateUnitMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "units", "update"],
    mutationFn: ({ id, body }: UpdateUnitPayload) =>
      updateUnit(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: unitsQueryKey });
      message.success(response.message || t("แก้ไขหน่วยนับสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขหน่วยนับไม่สำเร็จ"),
      );
    },
  });
}
