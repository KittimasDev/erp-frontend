"use client";

import { use } from "react";

import SalesTaxInvoiceDetailPage from "@/components/sales-tax-invoices/SalesTaxInvoiceDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SalesTaxInvoiceDetailPage id={id} />;
}
