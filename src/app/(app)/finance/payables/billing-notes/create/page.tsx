"use client";

import { Suspense } from "react";
import { Spin } from "antd";

import BillingNoteFormPage from "@/components/billing-notes/BillingNoteFormPage";

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <BillingNoteFormPage />
    </Suspense>
  );
}
