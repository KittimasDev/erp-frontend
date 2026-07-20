import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import RawTireClassificationPage from "@/components/weighbridge/RawTireClassificationPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReceivingClassificationPage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading />}>
      <RawTireClassificationPage ticketId={id} />
    </Suspense>
  );
}
