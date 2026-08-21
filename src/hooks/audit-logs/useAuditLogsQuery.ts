"use client";

import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "@/lib/api/audit-logs";
import {
  canAccessAnyScreen,
  canAccessScreen,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { isAdministrator } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/auth/token";
import type { AuditLogQueryParams } from "@/types/audit-logs";

export const auditLogsQueryKey = ["audit-logs"] as const;

const DOCUMENT_AUDIT_TRAIL_SCREENS = [
  "AUDIT_LOGS",
  "SALES_ORDERS",
  "SALES_STOCK_VERIFICATION",
  "PICKINGS",
  "PACKINGS",
  "DELIVERY_ORDERS",
  "DISPATCH_ORDERS",
];

/** หน้า Audit Log ทั้งระบบ */
export function canAccessAuditLogs(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return canAccessScreen("AUDIT_LOGS");
  }
  return false;
}

/** ประวัติบนหน้ารายละเอียดเอกสาร (ต้องมี documentId) */
export function canAccessDocumentAuditTrail(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return canAccessAnyScreen(DOCUMENT_AUDIT_TRAIL_SCREENS);
  }
  return true;
}

export function useAuditLogsQuery(params: AuditLogQueryParams = {}) {
  const scopedToDocument = Boolean(params.documentId?.trim());
  const enabled = scopedToDocument
    ? canAccessDocumentAuditTrail()
    : canAccessAuditLogs();

  return useQuery({
    queryKey: [...auditLogsQueryKey, params],
    queryFn: () => getAuditLogs(getAccessToken(), params),
    enabled,
  });
}
