"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreatePackingFromPickingMutation } from "@/hooks/packings/usePackingMutations";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/useT";

export default function Page({
  params,
}: {
  params: Promise<{ pickingId: string }>;
}) {
  const t = useT();
  const { pickingId } = use(params);
  const router = useRouter();
  const createMutation = useCreatePackingFromPickingMutation();
  const packingActions = useScreenActionPermissions("PACKINGS");
  const canAdd = packingActions.canAdd;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!canAdd) return;

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
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setForbidden(true);
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t("ไม่สามารถสร้างใบบรรจุสินค้าได้"),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickingId, canAdd]);

  if (!canAdd || forbidden) {
    return <AccessDenied screenCodes={["PACKINGS"]} />;
  }

  if (errorMessage) {
    return (
      <Result
        status="error"
        title={t("สร้างใบบรรจุสินค้าไม่สำเร็จ")}
        subTitle={errorMessage}
        extra={
          <Link href={`/pickings/${pickingId}`}>
            <Button type="primary">{t("กลับใบจ่ายสินค้า")}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <Spin description={t("กำลังเปิดใบบรรจุสินค้า...")} />
    </div>
  );
}
