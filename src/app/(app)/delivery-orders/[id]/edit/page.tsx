"use client";

import { use } from "react";

import DeliveryOrderFormPage from "@/components/delivery-orders/DeliveryOrderFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DeliveryOrderFormPage id={id} mode="edit" />;
}
