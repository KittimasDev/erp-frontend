import type { ControlRoomOverviewApiResponse } from "@/types/control-room";

import { apiFetch } from "./client";

export function getControlRoomOverview(token: string) {
  return apiFetch<ControlRoomOverviewApiResponse>("/api/dashboard/control-room/overview", {
    method: "GET",
    token,
  });
}
