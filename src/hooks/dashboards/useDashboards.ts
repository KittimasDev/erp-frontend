"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getExecutiveOverview,
  getHrDashboard,
  getLabDashboard,
  getMaintenanceDashboard,
  getProductionDaily,
  getSalesDashboard,
} from "@/lib/api/dashboards";
import { getAccessToken } from "@/lib/auth/token";
import type { DashboardRange } from "@/types/dashboards";

/** แดชบอร์ดอ่านอย่างเดียว — ข้อมูลเดิมค้างไว้ระหว่างเปลี่ยนช่วงวันที่ และรีเฟรชทุก 5 นาที */
function useDashboard<T>(
  key: string,
  fetcher: (token: string, range?: DashboardRange) => Promise<{ data: T }>,
  range: DashboardRange,
) {
  return useQuery({
    queryKey: ["dashboards", key, range],
    queryFn: async () => (await fetcher(getAccessToken(), range)).data,
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
}

export const useExecutiveOverviewQuery = (range: DashboardRange) =>
  useDashboard("executive", getExecutiveOverview, range);
export const useProductionDailyQuery = (range: DashboardRange) =>
  useDashboard("production-daily", getProductionDaily, range);
export const useLabDashboardQuery = (range: DashboardRange) =>
  useDashboard("lab", getLabDashboard, range);
export const useMaintenanceDashboardQuery = (range: DashboardRange) =>
  useDashboard("maintenance", getMaintenanceDashboard, range);
export const useHrDashboardQuery = (range: DashboardRange) =>
  useDashboard("hr", getHrDashboard, range);
export const useSalesDashboardQuery = (range: DashboardRange) =>
  useDashboard("sales", getSalesDashboard, range);
