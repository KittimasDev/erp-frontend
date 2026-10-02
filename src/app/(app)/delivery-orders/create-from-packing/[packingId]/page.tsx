"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreateDeliveryOrderFromPackingMutation } from "@/hooks/delivery-orders/useDeliveryOrderMutations";
import { useReadyPackingsForDeliveryQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { ApiError } from "@/lib/api/client";
import { canCreateDeliveryFromPacking } from "@/lib/sales/sales-fulfillment-nav";

/**
 * ใบบรรจุพร้อมส่ง → ไปหน้าเลือกใบบรรจุ (เลือกไว้ให้แล้ว รวมใบอื่นของ SO เดียวกันได้)
 * ไม่อยู่ในรายการพร้อมส่ง → backend คืนใบส่งที่ใช้ใบบรรจุนี้อยู่ หรือแจ้งเหตุผลที่สร้างไม่ได้
 */
export default function Page({
  params,
}: {
  params: Promise<{ packingId: string }>;
}) {
  const { packingId } = use(params);
  const router = useRouter();
  const readyQuery = useReadyPackingsForDeliveryQuery();
  const createMutation = useCreateDeliveryOrderFromPackingMutation();
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const canCreate = canCreateDeliveryFromPacking({
    delivery: deliveryActions,
    salesOrder: salesOrderActions,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const readyLoaded = readyQuery.isSuccess;
  const isReady = (readyQuery.data?.data ?? []).some(
    (row) => row.id === packingId,
  );

  useEffect(() => {
    if (!canCreate || !readyLoaded) return;

    if (isReady) {
      router.replace(
        `/delivery-orders/create-from-packing?packingId=${encodeURIComponent(packingId)}`,
      );
      return;
    }

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
  }, [packingId, canCreate, readyLoaded, isReady]);

  if (!canCreate || forbidden) {
    return (
      <AccessDenied screenCodes={["DELIVERY_ORDERS", "SALES_ORDERS"]} />
    );
  }

  if (errorMessage || readyQuery.isError) {
    return (
      <Result
        status="error"
        title="สร้างใบส่งสินค้าไม่สำเร็จ"
        subTitle={
          errorMessage ??
          (readyQuery.error instanceof Error
            ? readyQuery.error.message
            : "โหลดรายการใบบรรจุไม่สำเร็จ")
        }
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
