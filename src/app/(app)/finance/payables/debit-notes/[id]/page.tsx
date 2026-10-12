"use client";

import { use } from "react";

import ApDocumentDetailPage from "@/components/ap-documents/ApDocumentDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ApDocumentDetailPage kind="debitNote" id={id} />;
}
