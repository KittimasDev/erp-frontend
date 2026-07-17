import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import RawTirePaymentPage from "@/components/weighbridge/RawTirePaymentPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReceivingReceiptPaymentRoutePage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading />}>
      <RawTirePaymentPage receiptId={id} />
    </Suspense>
  );
}
