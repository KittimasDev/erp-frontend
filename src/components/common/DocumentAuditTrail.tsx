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

function actionColor(action: string) {
  switch (action) {
    case "CREATE":
      return "green";
    case "UPDATE":
      return "blue";
    case "DELETE":
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
                <Tag color={actionColor(log.action)}>{log.action}</Tag>{" "}
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
