"use client";

import { useMutation } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { scanWeighTicketOcrStandalone } from "@/lib/api/weighbridge-ocr";
import { getAccessToken } from "@/lib/auth/token";
import type { WeighTicketOcrResult } from "@/types/weighbridge-ocr";
import { useT } from "@/lib/i18n/useT";

/**
 * อ่านใบชั่งจากรูปโดยยังไม่มีตั๋ว — ใช้ที่หน้ารายการรับซื้อเพื่อเปิดตั๋วใหม่
 * ไม่ invalidate อะไรเลยเพราะยังไม่มีอะไรถูกบันทึก (มีแค่ไฟล์แนบชั่วคราวฝั่ง server)
 */
export function useScanWeighTicketOcrStandaloneMutation() {
  const t = useT();
  const { message } = App.useApp();

  return useMutation<WeighTicketOcrResult, Error, File>({
    mutationKey: ["weighbridge", "tickets", "ocr-scan-standalone"],
    mutationFn: async (file: File) => {
      const response = await scanWeighTicketOcrStandalone(getAccessToken(), {
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
