"use client";

import { Suspense } from "react";

import UnitConversionsPage from "@/components/masters/unit-conversions/UnitConversionsPage";

export default function MastersUnitConversionsRoutePage() {
  // useSearchParams ต้องอยู่ใต้ Suspense ตามข้อกำหนดของ App Router
  return (
    <Suspense fallback={null}>
      <UnitConversionsPage />
    </Suspense>
  );
}
