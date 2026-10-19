"use client";

import { Suspense } from "react";
import { Spin } from "antd";

import AdvanceRequestFormPage from "@/components/advance-requests/AdvanceRequestFormPage";

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <AdvanceRequestFormPage />
    </Suspense>
  );
}
