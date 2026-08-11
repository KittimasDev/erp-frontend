"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getMyAttendanceHistory,
  getMyAttendanceToday,
} from "@/lib/api/attendance";
import { getAccessToken } from "@/lib/auth/token";

export const myAttendanceTodayQueryKey = ["attendance", "me", "today"] as const;

export function useMyAttendanceTodayQuery(enabled = true) {
  return useQuery({
    queryKey: myAttendanceTodayQueryKey,
    queryFn: () => getMyAttendanceToday(getAccessToken()),
    enabled,
    // นาฬิกาบนหน้าจอเดินเอง แต่สถานะฝั่ง server ควรตามให้ทันถ้าเปิดค้างไว้ทั้งวัน
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export const myAttendanceHistoryQueryKey = (limit: number) =>
  ["attendance", "me", "history", limit] as const;

export function useMyAttendanceHistoryQuery(limit = 14, enabled = true) {
  return useQuery({
    queryKey: myAttendanceHistoryQueryKey(limit),
    queryFn: () => getMyAttendanceHistory(getAccessToken(), limit),
    enabled,
    retry: false,
  });
}
