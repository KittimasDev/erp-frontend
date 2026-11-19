"use client";

import { use } from "react";

import ArDebitNoteDetailPage from "@/components/ar-debit-notes/ArDebitNoteDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ArDebitNoteDetailPage id={id} />;
}
