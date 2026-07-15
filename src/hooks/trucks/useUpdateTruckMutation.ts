"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { updateTruck } from "@/lib/api/trucks";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateTruckRequest } from "@/types/trucks";
import { trucksQueryKey } from "./useTrucksQuery";

type UpdateTruckPayload = {
  id: string;
  body: UpdateTruckRequest;
};

export function useUpdateTruckMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationKey: ["master-data", "trucks", "update"],
    mutationFn: ({ id, body }: UpdateTruckPayload) =>
      updateTruck(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: trucksQueryKey });
      message.success(response.message || "แก้ไขรถบรรทุกสำเร็จแล้ว");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "แก้ไขรถบรรทุกไม่สำเร็จ",
      );
    },
  });
}
