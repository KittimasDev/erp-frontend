"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToWarehouseLocations() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/warehouse-locations");
  }, [router]);

  return <PageLoading label="กำลังไปหน้าตำแหน่งจัดเก็บ..." />;
}

export default function MastersWarehouseLocationsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToWarehouseLocations />
    </Suspense>
  );
}
