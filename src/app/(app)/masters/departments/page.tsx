"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import { useT } from "@/lib/i18n/useT";

function RedirectToUserDepartmentsTab() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace("/users?tab=departments");
  }, [router]);

  return <PageLoading label={t("กำลังไปหน้าจัดการแผนก...")} />;
}

export default function MastersDepartmentsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToUserDepartmentsTab />
    </Suspense>
  );
}
