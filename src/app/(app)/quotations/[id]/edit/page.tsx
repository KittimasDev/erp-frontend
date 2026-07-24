"use client";

import { use } from "react";

import QuotationFormPage from "@/components/quotations/QuotationFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <QuotationFormPage mode="edit" id={id} />;
}
