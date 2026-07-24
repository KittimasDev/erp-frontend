"use client";

import { use } from "react";

import QuotationDetailPage from "@/components/quotations/QuotationDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <QuotationDetailPage id={id} />;
}
