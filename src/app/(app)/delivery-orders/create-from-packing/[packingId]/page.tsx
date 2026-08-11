"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreateDeliveryOrderFromPackingMutation } from "@/hooks/delivery-orders/useDeliveryOrderMutations";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { ApiError } from "@/lib/api/client";

export default function Page({
  params,
}: {
  params: Promise<{ packingId: string }>;
}) {
  const { packingId } = use(params);
  const router = useRouter();
  const createMutation = useCreateDeliveryOrderFromPackingMutation();
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const canAdd = deliveryActions.canAdd;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!canAdd) return;

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
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setForbidden(true);
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "ไม่สามารถสร้างใบส่งสินค้าได้",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packingId, canAdd]);

  if (!canAdd || forbidden) {
    return <AccessDenied screenCodes={["DELIVERY_ORDERS"]} />;
  }

  if (errorMessage) {
    return (
      <Result
        status="error"
        title="สร้างใบส่งสินค้าไม่สำเร็จ"
        subTitle={errorMessage}
        extra={
          <Link href={`/packings/${packingId}`}>
            <Button type="primary">กลับใบบรรจุ</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <Spin description="กำลังเปิดใบส่งสินค้า..." />
    </div>
  );
}
