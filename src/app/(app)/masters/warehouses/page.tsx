"use client";
import { useT } from "@/lib/i18n/useT";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToWarehouses() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace("/warehouses");
  }, [router]);

  return <PageLoading label={t("กำลังไปหน้าคลังสินค้า...")} />;
}

export default function MastersWarehousesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToWarehouses />
    </Suspense>
  );
}
