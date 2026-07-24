"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

import { useCreateDeliveryOrderFromPackingMutation } from "@/hooks/delivery-orders/useDeliveryOrderMutations";

export default function Page({
  params,
}: {
  params: Promise<{ packingId: string }>;
}) {
  const { packingId } = use(params);
  const router = useRouter();
  const createMutation = useCreateDeliveryOrderFromPackingMutation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await createMutation.mutateAsync({ packingId });
        if (!cancelled) router.replace(`/delivery-orders/${res.data.id}/edit`);
      } catch {
        if (!cancelled) router.replace("/delivery-orders/create-from-packing");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packingId]);

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <Spin tip="กำลังสร้างใบส่งสินค้า..." />
    </div>
  );
}
