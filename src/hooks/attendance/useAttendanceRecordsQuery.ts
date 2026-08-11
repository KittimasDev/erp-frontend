"use client";

import { useQuery } from "@tanstack/react-query";

import { getAttendanceRecords, getAttendanceSummary } from "@/lib/api/attendance";
import { getAccessToken } from "@/lib/auth/token";
import type {
  AttendanceQueryParams,
  AttendanceSummaryParams,
} from "@/types/attendance";

export const attendanceRecordsQueryKey = (params: AttendanceQueryParams) =>
  ["attendance", "records", params] as const;

export function useAttendanceRecordsQuery(params: AttendanceQueryParams = {}) {
  return useQuery({
    queryKey: attendanceRecordsQueryKey(params),
    queryFn: () => getAttendanceRecords(getAccessToken(), params),
  });
}

export const attendanceSummaryQueryKey = (params: AttendanceSummaryParams) =>
  ["attendance", "summary", params] as const;

export function useAttendanceSummaryQuery(params: AttendanceSummaryParams = {}) {
  return useQuery({
    queryKey: attendanceSummaryQueryKey(params),
    queryFn: () => getAttendanceSummary(getAccessToken(), params),
  });
}
