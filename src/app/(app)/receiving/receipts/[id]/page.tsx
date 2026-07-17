import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import RawTirePurchaseReceiptDetailPage from "@/components/weighbridge/RawTirePurchaseReceiptDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReceivingReceiptDetailRoutePage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading />}>
      <RawTirePurchaseReceiptDetailPage receiptId={id} />
    </Suspense>
  );
}
