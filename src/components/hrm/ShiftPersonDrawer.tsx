"use client";

import { Drawer, Empty, Spin, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useShiftAssignmentsQuery } from "@/hooks/shifts/useShiftQueries";
import type { ShiftAssignmentUser } from "@/types/shifts";

import styles from "./ShiftAssignmentsPage.module.css";

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
            return (
              <li key={`${row.scheduleId}-${row.date}`} className={styles.dayItem}>
                <div className={styles.dayDate}>
                  <strong>{date.format("D/M")}</strong>
                  <span>{THAI_WEEKDAYS[date.day()]}</span>
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
                    {row.startTime} - {row.endTime} น.
                    {row.isOvernight ? " (ข้ามคืน)" : ""}
                  </span>
                  {row.isHoliday ? (
                    <Tag color="warning" className={styles.dayTag}>
                      {row.holidayName ?? "วันหยุด"}
                    </Tag>
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
