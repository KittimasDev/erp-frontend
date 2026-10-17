"use client";

import { Suspense } from "react";
import { Spin } from "antd";

import ApInvoiceFormPage from "@/components/ap-documents/ApInvoiceFormPage";

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <ApInvoiceFormPage />
    </Suspense>
  );
}
