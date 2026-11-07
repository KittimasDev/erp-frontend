"use client";
import { useT } from "@/lib/i18n/useT";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToWarehousesCreate() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace("/warehouses?create=1");
  }, [router]);

  return <PageLoading label={t("กำลังไปหน้าคลังสินค้า...")} />;
}

export default function CreateWarehouseRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToWarehousesCreate />
    </Suspense>
  );
}
