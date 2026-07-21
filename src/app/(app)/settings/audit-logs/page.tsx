"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import AuditLogsPage from "@/components/audit-logs/AuditLogsPage";

export default function AuditLogsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuditLogsPage />
    </Suspense>
  );
}
