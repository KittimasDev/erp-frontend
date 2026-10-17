"use client";

import { use } from "react";

import ApInvoiceDetailPage from "@/components/ap-documents/ApInvoiceDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ApInvoiceDetailPage id={id} />;
}
