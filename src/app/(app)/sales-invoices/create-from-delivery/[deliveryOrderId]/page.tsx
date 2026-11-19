import { redirect } from "next/navigation";

import { arRoutes } from "@/lib/sales/ar-routes";

export default async function Page({
  params,
}: {
  params: Promise<{ deliveryOrderId: string }>;
}) {
  const { deliveryOrderId } = await params;
  redirect(arRoutes.createFromDelivery(deliveryOrderId));
}
