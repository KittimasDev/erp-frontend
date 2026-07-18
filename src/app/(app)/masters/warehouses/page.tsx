"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToWarehouses() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/warehouses");
  }, [router]);

  return <PageLoading label="กำลังไปหน้าคลังสินค้า..." />;
}

export default function MastersWarehousesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToWarehouses />
    </Suspense>
  );
}
