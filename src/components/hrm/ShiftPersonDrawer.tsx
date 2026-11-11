"use client";

import { Drawer, Empty, Spin, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { useShiftAssignmentsQuery } from "@/hooks/shifts/useShiftQueries";
import {
  leaveStatusLabel,
  LEAVE_TYPE_COLOR,
  LEAVE_TYPE_LABEL,
} from "@/types/leave";
import type { ShiftAssignmentUser } from "@/types/shifts";

import styles from "./ShiftAssignmentsPage.module.css";
import { formatWorkMinutes, lateCutoffTime } from "./shiftDisplay";

type Props = {
  open: boolean;
  user: ShiftAssignmentUser;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
};

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * คนคนเดียวเข้ากะวันไหน เวลาไหนบ้าง
 *
 * ดึงใหม่ด้วย `userId` ไม่ใช้แถวที่กรองไว้บนหน้า — จะได้เห็นครบทุกกะของช่วงนั้น
 * แม้หน้าหลักกำลังกรองกะใดกะหนึ่งอยู่
 */
export default function ShiftPersonDrawer({
  open,
  user,
  dateFrom,
  dateTo,
  onClose,
}: Props) {
  const t = useT();
  const lang = useLanguage();
  const weekdays = lang === "en" ? EN_WEEKDAYS : THAI_WEEKDAYS;
  const query = useShiftAssignmentsQuery(
    { dateFrom, dateTo, userId: user.userId },
    open,
  );

  const rows = query.data?.data.rows ?? [];
  const summary = query.data?.data.byUser[0];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={460}
      destroyOnHidden
      title={
        <div className={styles.drawerTitle}>
          <UserOutlined />
          <span>{user.displayName ?? "—"}</span>
        </div>
      }
    >
      <div className={styles.personHead}>
        <div className={styles.personMeta}>
          <span>{user.employeeCode ?? t("ไม่มีรหัสพนักงาน")}</span>
          {user.position ? <span>{user.position}</span> : null}
          {user.departmentName ? <span>{user.departmentName}</span> : null}
        </div>
        <p className={styles.personRange}>
          {dayjs(dateFrom).format("D/M/BBBB")} - {dayjs(dateTo).format("D/M/BBBB")}
        </p>
        <div className={styles.personStats}>
          <div className={styles.personStat}>
            <span>{t("เข้ากะ")}</span>
            <strong>{t("{n} วัน", { n: summary?.totalDays ?? 0 })}</strong>
          </div>
          <div className={styles.personStat}>
            <span>{t("ชั่วโมงรวม")}</span>
            <strong>{formatWorkMinutes(summary?.workMinutes)}</strong>
          </div>
          {summary?.overnightDays ? (
            <div className={styles.personStat}>
              <span>{t("กะข้ามคืน")}</span>
              <strong>{t("{n} วัน", { n: summary.overnightDays })}</strong>
            </div>
          ) : null}
          {summary?.leaveDays ? (
            <div className={styles.personStat}>
              <span>{t("ลา (กะขาดคน)")}</span>
              <strong className={styles.leaveValue}>
                {t("{n} วัน", { n: summary.leaveDays })}
              </strong>
            </div>
          ) : null}
          {summary?.overtimeHours ? (
            <div className={styles.personStat}>
              <span>OT</span>
              <strong>{t("{n} ชม.", { n: summary.overtimeHours })}</strong>
            </div>
          ) : null}
          {summary?.holidayDays ? (
            <div className={styles.personStat}>
              <span>{t("ตรงวันหยุด")}</span>
              <strong className={styles.holidayValue}>
                {t("{n} วัน", { n: summary.holidayDays })}
              </strong>
            </div>
          ) : null}
        </div>
        <div className={styles.personShiftTags}>
          {(summary?.shifts ?? []).map((shift) => (
            <Tag key={shift.shiftId} color={shift.color || "#8ab933"}>
              {shift.shiftName} {t("{n} วัน", { n: shift.days })}
            </Tag>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className={styles.personLoading}>
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("ไม่มีการเข้ากะในช่วงนี้")}
        />
      ) : (
        <ul className={styles.dayList}>
          {rows.map((row) => {
            const date = dayjs(row.date);
            const cutoff = lateCutoffTime(row.startTime, row.lateGraceMinutes);
            return (
              <li
                key={`${row.scheduleId}-${row.date}`}
                className={`${styles.dayItem} ${
                  row.isOnLeave ? styles.dayItemLeave : ""
                }`}
              >
                <div className={styles.dayDate}>
                  <strong>{date.format("D/M")}</strong>
                  <span>{weekdays[row.weekday]}</span>
                </div>
                <div className={styles.dayBody}>
                  <strong>
                    <span
                      className={styles.dayDot}
                      style={{ background: row.color || "#8ab933" }}
                      aria-hidden
                    />
                    {row.shiftName}
                  </strong>
                  <span>
                    {row.startTime} - {row.endTime} {t("น.")} ·{" "}
                    {formatWorkMinutes(row.workMinutes)}
                    {row.isOvernight ? ` ${t("(ข้ามคืน)")}` : ""}
                  </span>
                  {cutoff ? (
                    <span className={styles.dayNote}>{t("สายได้ถึง {time} น.", { time: cutoff })}</span>
                  ) : null}
                  {row.isHoliday ? (
                    <Tag color="warning" className={styles.dayTag}>
                      {row.holidayName ?? t("วันหยุด")}
                    </Tag>
                  ) : null}
                  {row.leave || row.overtime ? (
                    <span className={styles.dayTag}>
                      {row.leave ? (
                        <Tag
                          color={
                            row.leave.status === "APPROVED"
                              ? LEAVE_TYPE_COLOR[row.leave.leaveType] ??
                                "default"
                              : "default"
                          }
                        >
                          {LEAVE_TYPE_LABEL[row.leave.leaveType]
                            ? t(LEAVE_TYPE_LABEL[row.leave.leaveType])
                            : row.leave.leaveType}
                          {row.leave.status === "APPROVED"
                            ? ""
                            : ` (${leaveStatusLabel(row.leave.status, lang)})`}
                        </Tag>
                      ) : null}
                      {row.overtime ? (
                        <Tag
                          color={
                            row.overtime.status === "APPROVED"
                              ? "gold"
                              : "default"
                          }
                        >
                          OT {t("{n} ชม.", { n: row.overtime.hours })}
                        </Tag>
                      ) : null}
                    </span>
                  ) : null}
                  {row.note ? (
                    <span className={styles.dayNote}>{row.note}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
