"use client";

import { use } from "react";

import PaymentVoucherDetailPage from "@/components/payment-vouchers/PaymentVoucherDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PaymentVoucherDetailPage id={id} />;
}
