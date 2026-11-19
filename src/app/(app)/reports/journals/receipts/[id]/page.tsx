"use client";

import { use } from "react";

import ArJournalDetailPage from "@/components/reports/ArJournalDetailPage";

type Props = { params: Promise<{ id: string }> };

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <ArJournalDetailPage kind="RECEIPT" id={id} />;
}
