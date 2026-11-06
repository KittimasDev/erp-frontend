"use client";

import { useMutation } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { scanWeighTicketOcr } from "@/lib/api/weighbridge-ocr";
import { getAccessToken } from "@/lib/auth/token";
import type { WeighTicketOcrResult } from "@/types/weighbridge-ocr";
import { useT } from "@/lib/i18n/useT";

/**
 * อ่านใบชั่งจากรูป
 *
 * จงใจไม่ invalidate query ของตั๋ว — `useWeighbridgeTicketQuery` มี refetchInterval อยู่
 * และการ refetch จะทำให้ฟอร์มถูก hydrate ใหม่ทับค่าที่ผู้ใช้เพิ่งเติมจาก OCR
 * ฝั่ง server ก็ไม่ได้แก้อะไรในตั๋วอยู่แล้ว (มีแต่เพิ่มไฟล์แนบ)
 */
export function useScanWeighTicketOcrMutation(ticketId: string) {
  const t = useT();
  const { message } = App.useApp();

  return useMutation<WeighTicketOcrResult, Error, File>({
    mutationKey: ["weighbridge", "tickets", ticketId, "ocr-scan"],
    mutationFn: async (file: File) => {
      const response = await scanWeighTicketOcr(getAccessToken(), {
        ticketId,
        file,
      });
      return response.data;
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("อ่านรูปใบชั่งไม่สำเร็จ กรุณาลองใหม่"),
      );
    },
  });
}
