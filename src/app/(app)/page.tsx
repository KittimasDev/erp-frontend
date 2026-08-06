import { Suspense } from "react";

import HomePortalPage from "@/components/home/HomePortalPage";
import PageLoading from "@/components/common/PageLoading";

export default function PortalHomePage() {
  return (
    <Suspense fallback={<PageLoading label="กำลังโหลด Portal..." />}>
      <HomePortalPage />
    </Suspense>
  );
}
