"use client";

import Link from "next/link";
import { Descriptions, Drawer, Tag } from "antd";

import type { ScheduleDisplayStatus, ScheduleRound } from "@/types/production-schedule";

import { fmtDate } from "./schedule-dates";

const STATUS_LABEL: Record<ScheduleDisplayStatus, string> = {
  PENDING: "รอยืนยัน",
  CONFIRMED: "ยืนยันแล้ว",
  OVERDUE: "เกินกำหนดยืนยัน",
};

const STATUS_COLOR: Record<ScheduleDisplayStatus, string> = {
  PENDING: "gold",
  CONFIRMED: "green",
  OVERDUE: "red",
};

type Props = {
  round: ScheduleRound | null;
  onClose: () => void;
};

export default function ProductionRoundDetailDrawer({ round, onClose }: Props) {
  return (
    <Drawer
      open={Boolean(round)}
      title={round ? `รอบ ${round.roundNo}` : "รายละเอียดรอบ"}
      destroyOnHidden
      size={480}
      onClose={onClose}
    >
      {round ? (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="ลำดับ">{round.sequence}</Descriptions.Item>
          <Descriptions.Item label="รหัสรอบ">{round.roundNo}</Descriptions.Item>
          <Descriptions.Item label="ช่วงวันที่ผลิต">
            {fmtDate(round.startDate)} – {fmtDate(round.endDate)} ({round.runDays} วัน)
          </Descriptions.Item>
          <Descriptions.Item label="ช่วง Shutdown">
            {fmtDate(round.shutdownStartDate)} – {fmtDate(round.shutdownEndDate)} ({round.shutdownDays} วัน)
          </Descriptions.Item>
          <Descriptions.Item label="วันหยุดผลิตเพิ่มเติม">
            {round.extraOffDates.length === 0 && round.holidays.length === 0 ? (
              "—"
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {round.holidays.map((holiday) => (
                  <div key={holiday.date}>
                    {fmtDate(holiday.date)} – {holiday.note}
                    {holiday.dayType === "SHUTDOWN" ? (
                      <Tag color="orange" style={{ marginInlineStart: 8 }}>
                        Shutdown
                      </Tag>
                    ) : null}
                  </div>
                ))}
                {round.extraOffDates
                  .filter((date) => !round.holidays.some((holiday) => holiday.date === date))
                  .map((date) => (
                    <div key={date}>{fmtDate(date)}</div>
                  ))}
              </div>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="สถานะ">
            <Tag color={STATUS_COLOR[round.displayStatus]}>{STATUS_LABEL[round.displayStatus]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="กำหนดยืนยัน">{fmtDate(round.confirmByDate)}</Descriptions.Item>
          {round.confirmReason ? (
            <Descriptions.Item label="เหตุผลยืนยันเกินกำหนด">{round.confirmReason}</Descriptions.Item>
          ) : null}
          {round.productionCycleId ? (
            <Descriptions.Item label="สรุปผลรอบผลิต">
              <Link href={`/production/cycles/${round.productionCycleId}`}>ดูสรุปรอบ</Link>
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      ) : null}
    </Drawer>
  );
}
