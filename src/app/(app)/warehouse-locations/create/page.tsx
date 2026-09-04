"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToWarehouseLocationsCreate() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/warehouse-locations?create=1");
  }, [router]);

  return <PageLoading label="กำลังไปหน้าที่เก็บ..." />;
}

export default function CreateWarehouseLocationRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToWarehouseLocationsCreate />
    </Suspense>
  );
}
