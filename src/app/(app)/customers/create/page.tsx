"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { useT } from "@/lib/i18n/useT";

function RedirectToCustomersCreate() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace("/customers?create=1");
  }, [router]);

  return <PageLoading label={t("กำลังไปหน้าลูกค้า...")} />;
}

export default function CreateCustomerRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToCustomersCreate />
    </Suspense>
  );
}
