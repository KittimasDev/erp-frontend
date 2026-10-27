"use client";

import dynamic from "next/dynamic";
import PageLoading from "@/components/common/PageLoading";

const Warehouse3DViewerPage = dynamic(
  () => import("@/components/warehouse-3d/Warehouse3DViewerPage"),
  {
    ssr: false,
    loading: () => <PageLoading label="กำลังโหลดแบบจำลอง 3 มิติ (3D Warehouse)..." />,
  },
);

export default function Warehouse3DRoutePage() {
  return <Warehouse3DViewerPage />;
}
