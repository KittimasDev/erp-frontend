"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getMyShiftSchedule,
  getShiftAssignments,
  getShiftCalendar,
  getShiftSchedule,
  getShifts,
} from "@/lib/api/shifts";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ShiftAssignmentParams,
  ShiftCalendarParams,
} from "@/types/shifts";

export const shiftsQueryKey = (includeInactive: boolean) =>
  ["shifts", "master", includeInactive] as const;

/** @param includeInactive true = เอากะที่ปิดใช้งานมาด้วย (หน้าจัดการกะ) */
export function useShiftsQuery(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: shiftsQueryKey(includeInactive),
    queryFn: () => getShifts(getAccessToken(), includeInactive),
    enabled,
  });
}

export const shiftCalendarQueryKey = (params: ShiftCalendarParams) =>
  ["shifts", "calendar", params] as const;

export function useShiftCalendarQuery(params: ShiftCalendarParams) {
  return useQuery({
    queryKey: shiftCalendarQueryKey(params),
    queryFn: () => getShiftCalendar(getAccessToken(), params),
  });
}

export const shiftAssignmentsQueryKey = (params: ShiftAssignmentParams) =>
  ["shifts", "assignments", params] as const;

/** รายการเข้ากะ — ส่ง userId เพื่อดูของคนเดียว */
export function useShiftAssignmentsQuery(
  params: ShiftAssignmentParams,
  enabled = true,
) {
  return useQuery({
    queryKey: shiftAssignmentsQueryKey(params),
    queryFn: () => getShiftAssignments(getAccessToken(), params),
    enabled,
  });
}

export const shiftScheduleQueryKey = (id: string) =>
  ["shifts", "schedule", id] as const;

/** รายละเอียดรอบกะ + รายชื่อคนในกะ — โหลดตอนกดเข้าไปดูเท่านั้น */
export function useShiftScheduleQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: shiftScheduleQueryKey(id),
    queryFn: () => getShiftSchedule(getAccessToken(), id),
    enabled: enabled && Boolean(id),
  });
}

export const myShiftScheduleQueryKey = (days: number) =>
  ["shifts", "me", days] as const;

export function useMyShiftScheduleQuery(days = 7, enabled = true) {
  return useQuery({
    queryKey: myShiftScheduleQueryKey(days),
    queryFn: () => getMyShiftSchedule(getAccessToken(), days),
    enabled,
    retry: false,
  });
}
