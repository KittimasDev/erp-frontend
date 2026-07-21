"use client";

import { use } from "react";

import StockCountFormPage from "@/components/stock-counts/StockCountFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StockCountFormPage mode="edit" id={id} />;
}
