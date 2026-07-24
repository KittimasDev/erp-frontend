"use client";

import { use } from "react";

import DispatchOrderDetailPage from "@/components/dispatch-orders/DispatchOrderDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DispatchOrderDetailPage id={id} />;
}
