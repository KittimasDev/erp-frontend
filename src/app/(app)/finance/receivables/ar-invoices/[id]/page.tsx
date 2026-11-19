"use client";

import { use } from "react";

import SalesInvoiceDetailPage from "@/components/sales-invoices/SalesInvoiceDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SalesInvoiceDetailPage id={id} />;
}
