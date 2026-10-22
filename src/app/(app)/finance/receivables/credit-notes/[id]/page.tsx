"use client";

import { use } from "react";

import SalesCreditNoteDetailPage from "@/components/sales-credit-notes/SalesCreditNoteDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SalesCreditNoteDetailPage id={id} />;
}
