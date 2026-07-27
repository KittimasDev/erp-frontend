"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

import { useCreatePickingFromSalesOrderMutation } from "@/hooks/pickings/usePickingMutations";

export default function Page({
  params,
}: {
  params: Promise<{ salesOrderId: string }>;
}) {
  const { salesOrderId } = use(params);
  const router = useRouter();
  const createMutation = useCreatePickingFromSalesOrderMutation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await createMutation.mutateAsync({ salesOrderId });
        if (cancelled) return;
        const picking = res.data;
        const target =
          picking.status === "DRAFT"
            ? `/pickings/${picking.id}/edit`
            : `/pickings/${picking.id}`;
        router.replace(target);
      } catch {
        if (!cancelled) {
          router.replace(`/sales-orders/${salesOrderId}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesOrderId]);

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <Spin description="กำลังเปิดใบจ่ายสินค้า..." />
    </div>
  );
}
