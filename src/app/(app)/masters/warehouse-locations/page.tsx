"use client";
import { useT } from "@/lib/i18n/useT";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToWarehouseLocations() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace("/warehouse-locations");
  }, [router]);

  return <PageLoading label={t("กำลังไปหน้าตำแหน่งจัดเก็บ...")} />;
}

export default function MastersWarehouseLocationsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToWarehouseLocations />
    </Suspense>
  );
}
