"use client";

import { Alert, Button, Spin } from "antd";

import { money } from "@/components/ap-documents/apDocumentConfig";
import { useCustomerCreditQuery } from "@/hooks/ar-receipts/useArReceipts";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useT } from "@/lib/i18n/useT";

type Props = {
  customerId?: string;
};

/**
 * เครดิตลูกค้าคงเหลือ (เงินรับเกิน) — แสดงอย่างเดียว ไม่แก้ยอดใบแจ้งหนี้
 * แยกจาก AdvanceDeductionPicker (เงินมัดจำ/ล่วงหน้าผูก SO) · โหลดใหม่เมื่อ customerId เปลี่ยน (queryKey มี customerId)
 */
export default function CustomerCreditNotice({ customerId }: Props) {
  const t = useT();
  const perms = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const credit = useCustomerCreditQuery(perms.canView ? customerId : undefined);

  if (!customerId || !perms.canView) return null;

  const balance = Number(credit.data?.balance ?? 0);

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "12px 16px",
        border: "1px dashed #d9d9d9",
        borderRadius: 8,
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 500 }}>{t("เครดิตลูกค้าคงเหลือ")}</div>
      {credit.isLoading ? (
        <Spin size="small" />
      ) : credit.isError ? (
        <Alert
          type="warning"
          showIcon
          title={t("โหลดเครดิตลูกค้าไม่สำเร็จ")}
          action={
            <Button size="small" onClick={() => void credit.refetch()}>
              {t("ลองใหม่")}
            </Button>
          }
        />
      ) : balance > 0 ? (
        <>
          <strong>{money.format(balance)}</strong> {t("บาท")}
          <div style={{ color: "#8a9199", fontSize: 12, marginTop: 4 }}>
            {t("เครดิตจากเงินรับเกิน — ใช้หักตอนรับชำระ/ใช้เครดิตที่หน้ารายละเอียดใบแจ้งหนี้ (ไม่กระทบยอดหักมัดจำด้านบน)")}
          </div>
        </>
      ) : (
        <span style={{ color: "#8a9199" }}>
          {t("ไม่มีเครดิตคงเหลือ")} · <strong>0.00</strong>
        </span>
      )}
    </div>
  );
}
