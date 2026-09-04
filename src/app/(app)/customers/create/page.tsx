"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToCustomersCreate() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/customers?create=1");
  }, [router]);

  return <PageLoading label="กำลังไปหน้าลูกค้า..." />;
}

export default function CreateCustomerRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToCustomersCreate />
    </Suspense>
  );
}
