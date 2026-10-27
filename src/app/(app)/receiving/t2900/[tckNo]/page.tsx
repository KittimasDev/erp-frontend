import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import T2900TicketDetailPage from "@/components/weighbridge/T2900TicketDetailPage";

type PageProps = {
  params: Promise<{ tckNo: string }>;
};

export default async function ReceivingT2900TicketRoutePage({
  params,
}: PageProps) {
  const { tckNo } = await params;

  return (
    <Suspense fallback={<PageLoading />}>
      <T2900TicketDetailPage tckNo={decodeURIComponent(tckNo)} />
    </Suspense>
  );
}
