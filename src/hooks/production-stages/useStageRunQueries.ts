"use client";

import { useQuery } from "@tanstack/react-query";

import type { StageModuleConfig } from "@/components/production-stages/stage-modules";
import { getStageRun, getStageRuns } from "@/lib/api/production-stage-runs";
import { getAccessToken } from "@/lib/auth/token";
import type { QueryStageRunsParams } from "@/types/production-stage-run";

/**
 * hook รับ config เป็นพารามิเตอร์ตัวแรก **ไม่ใช้ factory ที่คืน hook**
 *
 * factory (`createStageHooks(config)`) จะชนกฎ `react-hooks` เพราะ hook ที่ถูก
 * สร้างขึ้นระหว่างรันไม่ผ่านการตรวจ และไล่ query key ยากกว่ามาก
 */
export function useStageRunsQuery(
  config: StageModuleConfig,
  params?: QueryStageRunsParams,
) {
  return useQuery({
    queryKey: [...config.queryKeyRoot, "list", params ?? {}],
    queryFn: () =>
      getStageRuns(getAccessToken(), config.apiBase, params),
  });
}

export function useStageRunQuery(config: StageModuleConfig, id?: string) {
  return useQuery({
    queryKey: [...config.queryKeyRoot, "detail", id],
    queryFn: () => getStageRun(getAccessToken(), config.apiBase, id as string),
    enabled: Boolean(id),
  });
}
