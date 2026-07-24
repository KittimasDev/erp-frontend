"use client";

import { use } from "react";

import SalesOrderDetailPage from "@/components/sales-orders/SalesOrderDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SalesOrderDetailPage id={id} />;
}
