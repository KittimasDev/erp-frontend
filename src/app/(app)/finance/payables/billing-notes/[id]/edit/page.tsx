"use client";

import { use } from "react";

import BillingNoteFormPage from "@/components/billing-notes/BillingNoteFormPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BillingNoteFormPage id={id} />;
}
