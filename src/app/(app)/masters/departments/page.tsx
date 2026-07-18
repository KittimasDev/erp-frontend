"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

function RedirectToUserDepartmentsTab() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/users?tab=departments");
  }, [router]);

  return <PageLoading label="กำลังไปหน้าจัดการแผนก..." />;
}

export default function MastersDepartmentsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToUserDepartmentsTab />
    </Suspense>
  );
}
