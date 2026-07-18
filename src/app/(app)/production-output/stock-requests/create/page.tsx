"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

/** @deprecated ย้ายไป /receiving/production-output/stock-requests/create */
function RedirectWithParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(
      `/receiving/production-output/stock-requests/create${
        qs ? `?${qs}` : ""
      }`,
    );
  }, [router, searchParams]);

  return <PageLoading />;
}

export default function ProductionOutputStockRequestCreateRedirectPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectWithParams />
    </Suspense>
  );
}
