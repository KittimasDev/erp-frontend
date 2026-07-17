import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import WeighbridgeTicketDetailPage from "@/components/weighbridge/WeighbridgeTicketDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReceivingTicketDetailRoutePage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading />}>
      <WeighbridgeTicketDetailPage ticketId={id} />
    </Suspense>
  );
}
