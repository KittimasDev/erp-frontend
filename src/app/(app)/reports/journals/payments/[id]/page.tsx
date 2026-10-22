"use client";

import { use } from "react";

import PaymentJournalDetailPage from "@/components/reports/PaymentJournalDetailPage";

type Props = { params: Promise<{ id: string }> };

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <PaymentJournalDetailPage id={id} />;
}
