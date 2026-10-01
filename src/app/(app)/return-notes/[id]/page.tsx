"use client";

import { use } from "react";

import ReturnNoteDetailPage from "@/components/return-notes/ReturnNoteDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReturnNoteDetailPage id={id} />;
}
