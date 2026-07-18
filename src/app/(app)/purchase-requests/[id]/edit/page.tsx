"use client";

import { use } from "react";

import PurchaseRequestFormPage from "@/components/purchase-requests/PurchaseRequestFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PurchaseRequestFormPage mode="edit" id={id} />;
}
