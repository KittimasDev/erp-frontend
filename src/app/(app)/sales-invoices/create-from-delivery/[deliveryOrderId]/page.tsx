"use client";

import { use } from "react";

import SalesInvoiceCreateFromDeliveryPage from "@/components/sales-invoices/SalesInvoiceCreateFromDeliveryPage";

export default function Page({
  params,
}: {
  params: Promise<{ deliveryOrderId: string }>;
}) {
  const { deliveryOrderId } = use(params);
  return (
    <SalesInvoiceCreateFromDeliveryPage deliveryOrderId={deliveryOrderId} />
  );
}
