"use client";

import { Empty, Spin, Tag, Timeline } from "antd";
import dayjs from "dayjs";

import {
  canAccessDocumentAuditTrail,
  useAuditLogsQuery,
} from "@/hooks/audit-logs/useAuditLogsQuery";
import { useT, type TFunction } from "@/lib/i18n/useT";

type Props = {
  documentId: string;
  title?: string;
};

function actionLabel(action: string, t: TFunction) {
  switch (action) {
    case "CREATE":
      return t("สร้างเอกสาร");
    case "CONFIRM":
      return t("ยืนยันใบสั่งขาย");
    case "CANCEL":
      return t("ยกเลิก");
    case "CANCEL_ROUND":
      return t("ยกเลิกรอบจัดส่ง");
    case "UPDATE":
      return t("แก้ไข");
    case "UPDATE_ITEMS":
      return t("แก้รายการ/ยอด");
    case "UPDATE_CUSTOMER_PO":
      return t("แก้เลข PO ลูกค้า");
    case "UPDATE_HEADER":
      return t("แก้หัวเอกสาร/การชำระ");
    case "RESCHEDULE":
      return t("เลื่อนกำหนดส่ง");
    case "DELIVERY_RETURN":
      return t("ลูกค้าตีกลับสินค้า");
    case "DELETE":
      return t("ลบ");
    case "APPROVE":
      return t("อนุมัติ");
    case "REJECT":
      return t("ปฏิเสธ");
    case "SUBMIT":
      return t("ส่งอนุมัติ");
    case "FINALIZE":
      return t("สรุป/ปิดรายการ");
    case "PRINT":
      return t("พิมพ์");
    case "EXPORT":
      return t("ส่งออก");
    default:
      return action;
  }
}

function actionColor(action: string) {
  switch (action) {
    case "CREATE":
    case "CONFIRM":
    case "APPROVE":
    case "FINALIZE":
      return "green";
    case "SUBMIT":
    case "PRINT":
    case "EXPORT":
      return "purple";
    case "UPDATE":
    case "UPDATE_ITEMS":
    case "UPDATE_CUSTOMER_PO":
    case "UPDATE_HEADER":
    case "RESCHEDULE":
      return "blue";
    case "CANCEL":
    case "CANCEL_ROUND":
    case "DELIVERY_RETURN":
    case "DELETE":
    case "REJECT":
      return "red";
    default:
      return "default";
  }
}

export default function DocumentAuditTrail({
  documentId,
  title,
}: Props) {
  const t = useT();
  const allowed = canAccessDocumentAuditTrail();
  const query = useAuditLogsQuery({ documentId, limit: 20 });
  const items = query.data?.data?.items ?? [];

  if (!allowed) {
    return null;
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>
        {title ?? t("ประวัติการดำเนินการ")}
      </h3>
      {query.isLoading ? (
        <Spin size="small" />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("ยังไม่มีประวัติการดำเนินการ")}
        />
      ) : (
        <Timeline
          items={items.map((log) => ({
            key: log.id,
            color: actionColor(log.action),
            content: (
              <div>
                <Tag color={actionColor(log.action)}>
                  {actionLabel(log.action, t)}
                </Tag>{" "}
                <span style={{ fontSize: 13 }}>
                  {log.performedBy?.displayName ?? t("ระบบ")}
                </span>
                <div style={{ fontSize: 12, color: "#8a9199" }}>
                  {dayjs(log.performedAt).format("DD/MM/BBBB HH:mm:ss")}
                </div>
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
}
