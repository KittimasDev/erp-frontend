"use client";

import { Empty, Spin, Tag, Timeline } from "antd";
import dayjs from "dayjs";

import {
  canAccessDocumentAuditTrail,
  useAuditLogsQuery,
} from "@/hooks/audit-logs/useAuditLogsQuery";

type Props = {
  documentId: string;
  title?: string;
};

function actionLabel(action: string) {
  switch (action) {
    case "CREATE":
      return "สร้างเอกสาร";
    case "CONFIRM":
      return "ยืนยันใบสั่งขาย";
    case "CANCEL":
      return "ยกเลิก";
    case "CANCEL_ROUND":
      return "ยกเลิกรอบจัดส่ง";
    case "UPDATE":
      return "แก้ไข";
    case "UPDATE_ITEMS":
      return "แก้รายการ/ยอด";
    case "UPDATE_CUSTOMER_PO":
      return "แก้เลข PO ลูกค้า";
    case "UPDATE_HEADER":
      return "แก้หัวเอกสาร/การชำระ";
    case "RESCHEDULE":
      return "เลื่อนกำหนดส่ง";
    case "DELIVERY_RETURN":
      return "ลูกค้าตีกลับสินค้า";
    case "DELETE":
      return "ลบ";
    case "APPROVE":
      return "อนุมัติ";
    case "REJECT":
      return "ปฏิเสธ";
    case "SUBMIT":
      return "ส่งอนุมัติ";
    case "FINALIZE":
      return "สรุป/ปิดรายการ";
    case "PRINT":
      return "พิมพ์";
    case "EXPORT":
      return "ส่งออก";
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
  title = "ประวัติการดำเนินการ",
}: Props) {
  const allowed = canAccessDocumentAuditTrail();
  const query = useAuditLogsQuery({ documentId, limit: 20 });
  const items = query.data?.data?.items ?? [];

  if (!allowed) {
    return null;
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>
        {title}
      </h3>
      {query.isLoading ? (
        <Spin size="small" />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="ยังไม่มีประวัติการดำเนินการ"
        />
      ) : (
        <Timeline
          items={items.map((log) => ({
            key: log.id,
            color: actionColor(log.action),
            content: (
              <div>
                <Tag color={actionColor(log.action)}>
                  {actionLabel(log.action)}
                </Tag>{" "}
                <span style={{ fontSize: 13 }}>
                  {log.performedBy?.displayName ?? "ระบบ"}
                </span>
                <div style={{ fontSize: 12, color: "#8a9199" }}>
                  {dayjs(log.performedAt).format("DD/MM/YYYY HH:mm:ss")}
                </div>
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
}
