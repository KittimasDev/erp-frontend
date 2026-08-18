"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getMyShiftSchedule,
  getShiftAssignments,
  getShiftAutoPlanPositions,
  getShiftAutoPlanRoles,
  getShiftRoster,
  getShiftCalendar,
  getShiftSchedule,
  getShifts,
} from "@/lib/api/shifts";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ShiftAssignmentParams,
  ShiftAutoPlanPositionsParams,
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

export const shiftRosterQueryKey = (params: ShiftAssignmentParams) =>
  ["shifts", "roster", params] as const;

/** ตารางกริด คน × วัน — ตั้งต้นจากพนักงานทุกคน จึงเห็นคนที่หยุดด้วย */
export function useShiftRosterQuery(
  params: ShiftAssignmentParams,
  enabled = true,
) {
  return useQuery({
    queryKey: shiftRosterQueryKey(params),
    queryFn: () => getShiftRoster(getAccessToken(), params),
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

export const shiftAutoPlanRolesQueryKey = () =>
  ["shifts", "auto-plan", "roles"] as const;

/** บทบาททั้งหมด + จำนวนคน — ใช้เป็นตัวกรองก่อนจัดตารางอัตโนมัติ */
export function useShiftAutoPlanRolesQuery(enabled = true) {
  return useQuery({
    queryKey: shiftAutoPlanRolesQueryKey(),
    queryFn: () => getShiftAutoPlanRoles(getAccessToken()),
    enabled,
  });
}

export const shiftAutoPlanPositionsQueryKey = (
  params: ShiftAutoPlanPositionsParams,
) => ["shifts", "auto-plan", "positions", params] as const;

/**
 * ตำแหน่งที่มีพนักงานอยู่จริง — ใช้เป็นตัวเลือกในฟอร์มจัดตารางอัตโนมัติ
 *
 * params ต้องอยู่ใน query key ด้วย ไม่งั้นเปลี่ยนตัวกรองบทบาทแล้วจำนวนคนยังค้างค่าเดิม
 */
export function useShiftAutoPlanPositionsQuery(
  params: ShiftAutoPlanPositionsParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: shiftAutoPlanPositionsQueryKey(params),
    queryFn: () => getShiftAutoPlanPositions(getAccessToken(), params),
    enabled,
    // กันดรอปดาวน์กระพริบเป็น "ไม่มีข้อมูล" ระหว่างโหลดชุดใหม่
    placeholderData: keepPreviousData,
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
