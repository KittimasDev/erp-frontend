"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToWarehousesCreate() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/warehouses?create=1");
  }, [router]);

  return <PageLoading label="กำลังไปหน้าคลังสินค้า..." />;
}

export default function CreateWarehouseRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToWarehousesCreate />
    </Suspense>
  );
}
