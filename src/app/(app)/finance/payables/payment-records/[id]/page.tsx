"use client";

import { use } from "react";

import PaymentRecordDetailPage from "@/components/payment-vouchers/PaymentRecordDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PaymentRecordDetailPage id={id} />;
}
