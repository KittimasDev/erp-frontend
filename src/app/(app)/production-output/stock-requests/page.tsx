"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

/** @deprecated ย้ายไป /receiving/production-output/stock-requests */
export default function ProductionOutputStockRequestsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/receiving/production-output/stock-requests");
  }, [router]);

  return <PageLoading />;
}
