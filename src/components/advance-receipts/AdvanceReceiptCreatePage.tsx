"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";

import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import { useCreateAdvanceReceiptMutation } from "@/hooks/advance-receipts/useAdvanceReceipts";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useT } from "@/lib/i18n/useT";
import { advanceReceiptRoutes } from "@/lib/sales/ar-routes";
import AdvanceReceiptForm from "./AdvanceReceiptForm";

export default function AdvanceReceiptCreatePage() {
  const t = useT();
  const router = useRouter();
  const salesOrderId = useSearchParams().get("salesOrderId") ?? undefined;
  const perms = useScreenActionPermissions("FINANCE_ADVANCE_RECEIPTS");
  const create = useCreateAdvanceReceiptMutation();

  if (!perms.canAdd) {
    return <AccessDenied screenCodes={["FINANCE_ADVANCE_RECEIPTS"]} />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Finance · Advance receipts"
        title={t("รับเงินล่วงหน้า")}
        actions={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(advanceReceiptRoutes.list)}>
              {t("กลับ")}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              form="advance-receipt-create"
              loading={create.isPending}
            >
              {t("บันทึกร่าง")}
            </Button>
          </>
        }
      />
      <AdvanceReceiptForm
        formId="advance-receipt-create"
        salesOrderId={salesOrderId}
        onSubmit={(body) => {
          create.mutate(body, {
            onSuccess: (res) => {
              if (res.data?.id) router.push(advanceReceiptRoutes.detail(res.data.id));
            },
          });
        }}
      />
    </div>
  );
}
