"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

import { useCreatePackingFromPickingMutation } from "@/hooks/packings/usePackingMutations";

export default function Page({
  params,
}: {
  params: Promise<{ pickingId: string }>;
}) {
  const { pickingId } = use(params);
  const router = useRouter();
  const createMutation = useCreatePackingFromPickingMutation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await createMutation.mutateAsync({ pickingId });
        if (cancelled) return;
        const packing = res.data;
        const target =
          packing.status === "DRAFT"
            ? `/packings/${packing.id}/edit`
            : `/packings/${packing.id}`;
        router.replace(target);
      } catch {
        if (!cancelled) {
          router.replace(`/pickings/${pickingId}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickingId]);

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <Spin description="กำลังเปิดใบบรรจุสินค้า..." />
    </div>
  );
}
