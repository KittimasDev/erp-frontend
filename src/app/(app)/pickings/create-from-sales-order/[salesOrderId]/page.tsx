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
        if (!cancelled) {
          router.replace(`/pickings/${res.data.id}/edit`);
        }
      } catch {
        if (!cancelled) {
          router.replace("/pickings/create-from-sales-order");
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
      <Spin tip="กำลังสร้างใบจ่ายสินค้า..." />
    </div>
  );
}
