"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { createWeighbridgeTicketFromOcr } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";
import { sellersQueryKey } from "@/hooks/sellers/useSellersQuery";
import { trucksQueryKey } from "@/hooks/trucks/useTrucksQuery";
import type { CreateTicketFromOcrRequest } from "@/types/weighbridge-ocr";
import type { WeighbridgeTicketDetail } from "@/types/weighbridge-tickets";
import { weighbridgeDashboardQueryKey } from "./useWeighbridgeDashboardQuery";
import { useT } from "@/lib/i18n/useT";

/**
 * เปิดตั๋วจากรูปใบชั่ง
 *
 * ต้องล้าง cache ของรถกับผู้ขายด้วย เพราะ backend อาจสร้างสองอย่างนี้ใหม่ให้
 * เมื่อหาทะเบียนบนใบในระบบไม่เจอ — ไม่ล้างแล้วรายการใน Select จะไม่เห็นของที่เพิ่งสร้าง
 */
export function useCreateTicketFromOcrMutation() {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation<
    WeighbridgeTicketDetail,
    Error,
    CreateTicketFromOcrRequest
  >({
    mutationKey: ["weighbridge", "tickets", "from-ocr"],
    mutationFn: async (body: CreateTicketFromOcrRequest) => {
      const response = await createWeighbridgeTicketFromOcr(
        getAccessToken() ?? "",
        body,
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: weighbridgeDashboardQueryKey,
      });
      void queryClient.invalidateQueries({ queryKey: trucksQueryKey });
      void queryClient.invalidateQueries({ queryKey: sellersQueryKey });
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("เปิดตั๋วจากรูปไม่สำเร็จ"),
      );
    },
  });
}
