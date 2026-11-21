"use client";

import { use } from "react";

import AdvanceReceiptDetailPage from "@/components/advance-receipts/AdvanceReceiptDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdvanceReceiptDetailPage id={id} />;
}
