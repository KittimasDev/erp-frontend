"use client";

import { use } from "react";

import SalesInvoiceEditPage from "@/components/sales-invoices/SalesInvoiceEditPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SalesInvoiceEditPage id={id} />;
}
