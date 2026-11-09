"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import NtfyTopicsPage from "@/components/masters/ntfy-topics/NtfyTopicsPage";

export default function MastersNtfyTopicsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NtfyTopicsPage />
    </Suspense>
  );
}
