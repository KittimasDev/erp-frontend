"use client";

import { Drawer, Empty, Spin, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useShiftAssignmentsQuery } from "@/hooks/shifts/useShiftQueries";
import {
  LEAVE_STATUS_LABEL,
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
          <span>{user.employeeCode ?? "ไม่มีรหัสพนักงาน"}</span>
          {user.position ? <span>{user.position}</span> : null}
          {user.departmentName ? <span>{user.departmentName}</span> : null}
        </div>
        <p className={styles.personRange}>
          {dayjs(dateFrom).format("D/M/YYYY")} - {dayjs(dateTo).format("D/M/YYYY")}
        </p>
        <div className={styles.personStats}>
          <div className={styles.personStat}>
            <span>เข้ากะ</span>
            <strong>{summary?.totalDays ?? 0} วัน</strong>
          </div>
          <div className={styles.personStat}>
            <span>ชั่วโมงรวม</span>
            <strong>{formatWorkMinutes(summary?.workMinutes)}</strong>
          </div>
          {summary?.overnightDays ? (
            <div className={styles.personStat}>
              <span>กะข้ามคืน</span>
              <strong>{summary.overnightDays} วัน</strong>
            </div>
          ) : null}
          {summary?.leaveDays ? (
            <div className={styles.personStat}>
              <span>ลา (กะขาดคน)</span>
              <strong className={styles.leaveValue}>
                {summary.leaveDays} วัน
              </strong>
            </div>
          ) : null}
          {summary?.overtimeHours ? (
            <div className={styles.personStat}>
              <span>OT</span>
              <strong>{summary.overtimeHours} ชม.</strong>
            </div>
          ) : null}
          {summary?.holidayDays ? (
            <div className={styles.personStat}>
              <span>ตรงวันหยุด</span>
              <strong className={styles.holidayValue}>
                {summary.holidayDays} วัน
              </strong>
            </div>
          ) : null}
        </div>
        <div className={styles.personShiftTags}>
          {(summary?.shifts ?? []).map((shift) => (
            <Tag key={shift.shiftId} color={shift.color || "#8ab933"}>
              {shift.shiftName} {shift.days} วัน
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
          description="ไม่มีการเข้ากะในช่วงนี้"
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
                  <span>{THAI_WEEKDAYS[row.weekday]}</span>
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
                    {row.startTime} - {row.endTime} น. ·{" "}
                    {formatWorkMinutes(row.workMinutes)}
                    {row.isOvernight ? " (ข้ามคืน)" : ""}
                  </span>
                  {cutoff ? (
                    <span className={styles.dayNote}>สายได้ถึง {cutoff} น.</span>
                  ) : null}
                  {row.isHoliday ? (
                    <Tag color="warning" className={styles.dayTag}>
                      {row.holidayName ?? "วันหยุด"}
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
                          {LEAVE_TYPE_LABEL[row.leave.leaveType] ??
                            row.leave.leaveType}
                          {row.leave.status === "APPROVED"
                            ? ""
                            : ` (${LEAVE_STATUS_LABEL[row.leave.status] ?? row.leave.status})`}
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
                          OT {row.overtime.hours} ชม.
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
