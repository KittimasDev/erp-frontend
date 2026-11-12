"use client";

import { Alert, Spin, Typography } from "antd";

import CancelReasonModal from "@/components/common/CancelReasonModal";
import { usePurchaseOrderRelatedDocumentsQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useT } from "@/lib/i18n/useT";
import PurchaseOrderRelatedDocumentList from "./PurchaseOrderRelatedDocuments";

type Props = {
  open: boolean;
  poId: string;
  poNo: string;
  confirmLoading?: boolean;
  onClose: () => void;
  /** เรียกเมื่อกดยืนยัน — เหตุผลถูก trim แล้วและยาวอย่างน้อย 5 ตัวอักษร */
  onConfirm: (reason: string) => Promise<unknown> | void;
};

/**
 * ยกเลิก PO ด้วย Modal กลาง (CancelReasonModal) + ส่วนเฉพาะ PO:
 * - แสดงเอกสารที่ผูกอยู่ (GRN / AP / PV) พร้อมลิงก์
 * - มีเอกสารที่ทำให้ยกเลิกไม่ได้ → แสดงเหตุผลสีแดงและปิดปุ่มยืนยัน (backend ตรวจซ้ำอยู่แล้ว)
 * - มีเฉพาะ GRN ฉบับร่าง → ยกเลิกได้ แต่เตือนให้ผู้ใช้ไปยกเลิกใบรับของเอง
 */
export default function CancelPurchaseOrderModal({
  open,
  poId,
  poNo,
  confirmLoading,
  onClose,
  onConfirm,
}: Props) {
  const t = useT();
  const query = usePurchaseOrderRelatedDocumentsQuery(poId, open);
  const related = query.data?.data;
  // ยังโหลดไม่เสร็จ/โหลดไม่สำเร็จ = ถือว่ายังยืนยันไม่ได้ (ไม่ปล่อยผ่านโดยไม่รู้เอกสารที่ผูก)
  const blocked = !related || !related.canCancel || query.isFetching;

  return (
    <CancelReasonModal
      open={open}
      title={`${t("ยืนยันยกเลิกใบสั่งซื้อ")} ${poNo}`}
      okText={t("ยืนยันยกเลิก PO")}
      confirmLoading={confirmLoading}
      blocked={blocked}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {query.isLoading ? (
        <Spin />
      ) : query.isError || !related ? (
        <Alert
          type="error"
          showIcon
          title={t("โหลดเอกสารที่เกี่ยวข้องไม่สำเร็จ ไม่สามารถยืนยันยกเลิกได้")}
        />
      ) : (
        <>
          {related.blockers.map((text) => (
            <Alert key={text} type="error" showIcon style={{ marginBottom: 8 }} title={text} />
          ))}

          {related.canCancel && related.draftGoodsReceipts.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              title={t(
                "มีใบรับของฉบับร่างที่ผูกกับ PO นี้ หลังยกเลิก PO จะยืนยันใบรับของเหล่านี้ไม่ได้ ระบบไม่ยกเลิกให้อัตโนมัติ กรุณายกเลิกใบรับของเอง",
              )}
              description={related.draftGoodsReceipts.map((g) => g.docNo).join(", ")}
            />
          ) : null}

          <Typography.Text strong>{t("เอกสารที่ผูกอยู่กับ PO นี้")}</Typography.Text>
          <div style={{ marginBottom: 12 }}>
            <PurchaseOrderRelatedDocumentList related={related} newTab />
          </div>
        </>
      )}
    </CancelReasonModal>
  );
}
