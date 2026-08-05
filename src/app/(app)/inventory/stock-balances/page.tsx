import dynamic from "next/dynamic";

import PageLoading from "@/components/common/PageLoading";

const StockBalancesPage = dynamic(
  () => import("@/components/inventory/StockBalancesPage"),
  {
    loading: () => <PageLoading label="กำลังโหลดภาพรวมคลัง..." />,
  },
);

export default function StockBalancesRoutePage() {
  return <StockBalancesPage />;
}
