"use client";

import { Suspense } from "react";
import { Spin } from "antd";

import ApDocumentFormPage from "@/components/ap-documents/ApDocumentFormPage";

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <ApDocumentFormPage kind="creditNote" />
    </Suspense>
  );
}
