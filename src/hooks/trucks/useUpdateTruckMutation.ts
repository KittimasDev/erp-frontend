"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateTruck } from "@/lib/api/trucks";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { UpdateTruckRequest } from "@/types/trucks";
import { trucksQueryKey } from "./useTrucksQuery";

type UpdateTruckPayload = {
  id: string;
  body: UpdateTruckRequest;
};

export function useUpdateTruckMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: ["master-data", "trucks", "update"],
    mutationFn: ({ id, body }: UpdateTruckPayload) =>
      updateTruck(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: trucksQueryKey });
      message.success(response.message || t("แก้ไขรถบรรทุกสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("แก้ไขรถบรรทุกไม่สำเร็จ"),
      );
    },
  });
}
