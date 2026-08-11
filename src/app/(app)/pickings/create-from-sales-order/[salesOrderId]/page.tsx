"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreatePickingFromSalesOrderMutation } from "@/hooks/pickings/usePickingMutations";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { ApiError } from "@/lib/api/client";

export default function Page({
  params,
}: {
  params: Promise<{ salesOrderId: string }>;
}) {
  const { salesOrderId } = use(params);
  const router = useRouter();
  const createMutation = useCreatePickingFromSalesOrderMutation();
  const pickingActions = useScreenActionPermissions("PICKINGS");
  const canAdd = pickingActions.canAdd;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!canAdd) return;

    let cancelled = false;
    setStarted(true);
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
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setForbidden(true);
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "ไม่สามารถสร้างใบจ่ายสินค้าได้",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesOrderId, canAdd]);

  if (!canAdd) {
    return (
      <Result
        status="403"
        title="ไม่มีสิทธิ์สร้างใบจ่ายสินค้า"
        subTitle="ต้องเปิดสิทธิ์ PICKINGS · เพิ่มข้อมูล (ADD) ใน Permission Matrix สำหรับ role นี้ — ไม่ใช้สิทธิ์ตามรหัสคลังแบบเดิมแล้ว"
        extra={
          <Link href={`/sales-orders/${salesOrderId}`}>
            <Button type="primary">กลับใบสั่งขาย</Button>
          </Link>
        }
      />
    );
  }

  if (forbidden) {
    return <AccessDenied screenCodes={["PICKINGS"]} />;
  }

  if (errorMessage) {
    return (
      <Result
        status="error"
        title="สร้างใบจ่ายสินค้าไม่สำเร็จ"
        subTitle={errorMessage}
        extra={
          <Link href={`/sales-orders/${salesOrderId}`}>
            <Button type="primary">กลับใบสั่งขาย</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <Spin
        description={
          started
            ? "กำลังเปิดใบจ่ายสินค้า..."
            : "กำลังตรวจสอบสิทธิ์ Permission Matrix..."
        }
      />
    </div>
  );
}
