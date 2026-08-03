import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import RawTireWarehouseReceiptSlipPage from "@/components/weighbridge/RawTireWarehouseReceiptSlipPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReceivingWarehouseReceiptRoutePage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading label="กำลังโหลดใบรับสินค้า..." />}>
      <RawTireWarehouseReceiptSlipPage receiptId={id} />
    </Suspense>
  );
}
