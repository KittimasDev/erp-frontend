import { Suspense } from "react";

import HomeDashboardPage from "@/components/home/HomeDashboardPage";
import PageLoading from "@/components/common/PageLoading";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading label="กำลังโหลดแดชบอร์ด..." />}>
      <HomeDashboardPage />
    </Suspense>
  );
}
