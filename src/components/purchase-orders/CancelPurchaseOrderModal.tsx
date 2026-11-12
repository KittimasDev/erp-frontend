"use client";

import { Alert, Input, Modal, Spin, Typography } from "antd";
import { useState } from "react";

import { usePurchaseOrderRelatedDocumentsQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useT } from "@/lib/i18n/useT";
import PurchaseOrderRelatedDocumentList from "./PurchaseOrderRelatedDocuments";

type Props = {
  open: boolean;
  poId: string;
  poNo: string;
  confirmLoading?: boolean;
  onClose: () => void;
  /** เรียกเมื่อกดยืนยัน — เหตุผลถูก trim แล้วและไม่ว่างแน่นอน */
  onConfirm: (reason: string) => Promise<unknown> | void;
};

/**
 * Dialog ยืนยันยกเลิก PO
 * - แสดงเอกสารที่ผูกอยู่ (GRN / AP / PV) พร้อมลิงก์
 * - มีเอกสารที่ทำให้ยกเลิกไม่ได้ → แสดงเหตุผลสีแดงและปิดปุ่มยืนยัน (backend ตรวจซ้ำอยู่แล้ว)
 * - มีเฉพาะ GRN ฉบับร่าง → ยกเลิกได้ แต่เตือนให้ผู้ใช้ไปยกเลิกใบรับของเอง
 * - เหตุผลบังคับ
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
  const [reason, setReason] = useState("");
  const query = usePurchaseOrderRelatedDocumentsQuery(poId, open);
  const related = query.data?.data;

  const trimmed = reason.trim();
  const blocked = related ? !related.canCancel : false;
  const okDisabled = !related || blocked || !trimmed || query.isFetching;

  return (
    <Modal
      title={`${t("ยืนยันยกเลิกใบสั่งซื้อ")} ${poNo}`}
      open={open}
      onCancel={onClose}
      afterClose={() => setReason("")}
      okText={t("ยืนยันยกเลิก PO")}
      cancelText={t("ปิด")}
      okButtonProps={{ danger: true, disabled: okDisabled }}
      confirmLoading={confirmLoading}
      onOk={async () => {
        if (okDisabled) return;
        await onConfirm(trimmed);
      }}
      destroyOnHidden
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

          {related.canCancel ? (
            <>
              <Typography.Text strong>
                {t("เหตุผลการยกเลิก")} <span style={{ color: "#cf1322" }}>*</span>
              </Typography.Text>
              <Input.TextArea
                rows={3}
                maxLength={2000}
                showCount
                style={{ marginTop: 4 }}
                placeholder={t("ระบุเหตุผลการยกเลิก PO (บังคับ)")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                {t("ระบบบันทึกเหตุผล ผู้ยกเลิก และวันเวลาไว้ในประวัติการใช้งาน")}
              </Typography.Paragraph>
            </>
          ) : null}
        </>
      )}
    </Modal>
  );
}
