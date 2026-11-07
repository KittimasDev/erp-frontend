"use client";

import Link from "next/link";
import { Descriptions, Drawer, Tag } from "antd";

import type { ScheduleDisplayStatus, ScheduleRound } from "@/types/production-schedule";

import { useT } from "@/lib/i18n/useT";

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
  const t = useT();
  return (
    <Drawer
      open={Boolean(round)}
      title={round ? t("รอบ {no}", { no: round.roundNo }) : t("รายละเอียดรอบ")}
      destroyOnHidden
      size={480}
      onClose={onClose}
    >
      {round ? (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t("ลำดับ")}>{round.sequence}</Descriptions.Item>
          <Descriptions.Item label={t("รหัสรอบ")}>{round.roundNo}</Descriptions.Item>
          <Descriptions.Item label={t("ช่วงวันที่ผลิต")}>
            {fmtDate(round.startDate)} – {fmtDate(round.endDate)} ({t("{n} วัน", { n: round.runDays })})
          </Descriptions.Item>
          <Descriptions.Item label={t("ช่วง Shutdown")}>
            {fmtDate(round.shutdownStartDate)} – {fmtDate(round.shutdownEndDate)} ({t("{n} วัน", { n: round.shutdownDays })})
          </Descriptions.Item>
          <Descriptions.Item label={t("วันหยุดผลิตเพิ่มเติม")}>
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
          <Descriptions.Item label={t("สถานะ")}>
            <Tag color={STATUS_COLOR[round.displayStatus]}>{t(STATUS_LABEL[round.displayStatus])}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("กำหนดยืนยัน")}>{fmtDate(round.confirmByDate)}</Descriptions.Item>
          {round.confirmReason ? (
            <Descriptions.Item label={t("เหตุผลยืนยันเกินกำหนด")}>{round.confirmReason}</Descriptions.Item>
          ) : null}
          {round.productionCycleId ? (
            <Descriptions.Item label={t("สรุปผลรอบผลิต")}>
              <Link href={`/production/cycles/${round.productionCycleId}`}>{t("ดูสรุปรอบ")}</Link>
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      ) : null}
    </Drawer>
  );
}
