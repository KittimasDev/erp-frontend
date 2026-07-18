"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

/** @deprecated ย้ายไป /receiving/pending-production-output */
export default function ProductionOutputPendingTicketsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/receiving/pending-production-output");
  }, [router]);

  return <PageLoading />;
}
