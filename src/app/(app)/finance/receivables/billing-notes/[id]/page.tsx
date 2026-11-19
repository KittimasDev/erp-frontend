"use client";

import { use } from "react";

import ArBillingNoteDetailPage from "@/components/ar-billing-notes/ArBillingNoteDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ArBillingNoteDetailPage id={id} />;
}
