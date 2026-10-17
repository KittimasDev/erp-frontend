"use client";

import { Suspense, use } from "react";
import { Spin } from "antd";

import ApInvoiceFormPage from "@/components/ap-documents/ApInvoiceFormPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Spin />}>
      <ApInvoiceFormPage id={id} />
    </Suspense>
  );
}
