import { apiFetch } from "./client";

export type OilDispatchOption = {
  id: string;
  dispatchNo: string;
  dispatchDate?: string;
  quantityLiters: string;
  status: string;
};

/** ใบจ่ายน้ำมันจากถัง — ใช้เลือกผูกกับใบบรรจุแบบ Tank Loading */
export function getOilDispatches(token: string) {
  return apiFetch<{ message: string; data: OilDispatchOption[] }>(
    "/api/oil-tank-farm/dispatches",
    { method: "GET", token },
  );
}
