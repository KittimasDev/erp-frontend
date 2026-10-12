"use client";

import { Suspense, use } from "react";
import { Spin } from "antd";

import ApDocumentFormPage from "@/components/ap-documents/ApDocumentFormPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Spin />}>
      <ApDocumentFormPage kind="debitNote" id={id} />
    </Suspense>
  );
}
