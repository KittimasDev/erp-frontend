"use client";

import { use } from "react";

import BillingNoteDetailPage from "@/components/billing-notes/BillingNoteDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BillingNoteDetailPage id={id} />;
}
