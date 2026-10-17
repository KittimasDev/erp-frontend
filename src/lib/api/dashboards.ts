import type {
  DashboardRange,
  ExecutiveOverview,
  HrDashboard,
  LabDashboard,
  MaintenanceDashboard,
  ProductionDaily,
  SalesDashboard,
} from "@/types/dashboards";

import { apiFetch } from "./client";

type Res<T> = { message: string; data: T };

function qs(range?: DashboardRange) {
  const search = new URLSearchParams();
  if (range?.from) search.set("from", range.from);
  if (range?.to) search.set("to", range.to);
  const s = search.toString();
  return s ? `?${s}` : "";
}

const get = <T>(path: string, token: string, range?: DashboardRange) =>
  apiFetch<Res<T>>(`${path}${qs(range)}`, { method: "GET", token });

export const getExecutiveOverview = (token: string, range?: DashboardRange) =>
  get<ExecutiveOverview>("/api/dashboard/executive/overview", token, range);

export const getProductionDaily = (token: string, range?: DashboardRange) =>
  get<ProductionDaily>("/api/dashboard/production/daily", token, range);

export const getLabDashboard = (token: string, range?: DashboardRange) =>
  get<LabDashboard>("/api/dashboard/laboratory/summary", token, range);

export const getMaintenanceDashboard = (token: string, range?: DashboardRange) =>
  get<MaintenanceDashboard>("/api/dashboard/maintenance/summary", token, range);

export const getHrDashboard = (token: string, range?: DashboardRange) =>
  get<HrDashboard>("/api/dashboard/hr/summary", token, range);

export const getSalesDashboard = (token: string, range?: DashboardRange) =>
  get<SalesDashboard>("/api/dashboard/sales/summary", token, range);
