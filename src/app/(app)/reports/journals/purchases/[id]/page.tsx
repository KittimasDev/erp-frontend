"use client";

import { use } from "react";

import PurchaseJournalDetailPage from "@/components/reports/PurchaseJournalDetailPage";

type Props = { params: Promise<{ id: string }> };

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <PurchaseJournalDetailPage id={id} />;
}
