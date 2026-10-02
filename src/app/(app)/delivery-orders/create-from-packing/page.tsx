"use client";

import { Suspense } from "react";
import { Spin } from "antd";

import CreateDeliverySelectPackingPage from "@/components/delivery-orders/CreateDeliverySelectPackingPage";

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <CreateDeliverySelectPackingPage />
    </Suspense>
  );
}
