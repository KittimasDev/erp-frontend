"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getControlRoomOverview } from "@/lib/api/control-room";
import { getAccessToken } from "@/lib/auth/token";

export const controlRoomQueryKey = ["dashboard", "control-room"] as const;

/**
 * ภาพรวมห้องควบคุม — รีเฟรชทุก `refreshMs` (ผู้ใช้เลือก 1–5 นาที)
 * ข้อมูลเดิมค้างไว้ระหว่างรีเฟรชและเมื่อรีเฟรชล้ม (ไม่ให้จอ TV ว่างเปล่า) · หยุดยิงเมื่อแท็บถูกซ่อน
 */
export function useControlRoomQuery(refreshMs: number) {
  return useQuery({
    queryKey: controlRoomQueryKey,
    queryFn: async () => (await getControlRoomOverview(getAccessToken())).data,
    refetchInterval: refreshMs,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
