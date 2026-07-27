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
        if (cancelled) return;
        const delivery = res.data;
        const editable =
          delivery.status === "DRAFT" || delivery.status === "CONFIRMED";
        const target = editable
          ? `/delivery-orders/${delivery.id}/edit`
          : `/delivery-orders/${delivery.id}`;
        router.replace(target);
      } catch {
        if (!cancelled) {
          router.replace(`/packings/${packingId}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packingId]);

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <Spin description="กำลังเปิดใบส่งสินค้า..." />
    </div>
  );
}
