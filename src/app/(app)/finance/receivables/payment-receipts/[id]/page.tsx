"use client";

import { use } from "react";

import ArReceiptDetailPage from "@/components/ar-receipts/ArReceiptDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ArReceiptDetailPage id={id} />;
}
