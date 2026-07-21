"use client";

import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "@/lib/api/audit-logs";
import { getAccessToken } from "@/lib/auth/token";
import type { AuditLogQueryParams } from "@/types/audit-logs";

export const auditLogsQueryKey = ["audit-logs"] as const;

export function useAuditLogsQuery(params: AuditLogQueryParams = {}) {
  return useQuery({
    queryKey: [...auditLogsQueryKey, params],
    queryFn: () => getAuditLogs(getAccessToken(), params),
  });
}
