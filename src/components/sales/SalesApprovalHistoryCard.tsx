"use client";

import { Card, Empty, Tag, Timeline, Typography } from "antd";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";
import {
  SALES_APPROVAL_ACTION_COLOR,
  SALES_APPROVAL_ACTION_LABEL,
  type SalesApprovalEvent,
} from "@/types/sales-approval";

type Props = { events?: SalesApprovalEvent[] };

/**
 * ประวัติการอนุมัติของ QT/SO — ใครทำอะไร เมื่อไร เหตุผล (เก่า → ใหม่)
 * ซ่อนทั้งการ์ดเมื่อยังไม่เคยส่งอนุมัติ (ไม่มีประวัติ) เพื่อไม่ให้ใบเก่าที่ยืนยันก่อนมีระบบนี้ดูเหมือนขาดข้อมูล
 */
export default function SalesApprovalHistoryCard({ events }: Props) {
  const t = useT();
  if (!events || events.length === 0) return null;

  return (
    <Card size="small" title={t("ประวัติการอนุมัติ")} style={{ marginTop: 16 }}>
      {events.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Timeline
          items={events.map((event) => ({
            key: event.id,
            children: (
              <div>
                <div>
                  <Tag color={SALES_APPROVAL_ACTION_COLOR[event.action] ?? "default"}>
                    {t(SALES_APPROVAL_ACTION_LABEL[event.action] ?? event.action)}
                  </Tag>
                  <strong>{event.performedByName ?? "—"}</strong>{" "}
                  <Typography.Text type="secondary">
                    {dayjs(event.performedAt).format("DD/MM/BBBB HH:mm")}
                  </Typography.Text>
                </div>
                {event.reason ? (
                  <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
                    {t("เหตุผล")}: {event.reason}
                  </div>
                ) : null}
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
}
