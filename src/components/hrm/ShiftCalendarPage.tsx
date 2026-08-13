"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Calendar, DatePicker, Empty, Tooltip } from "antd";
import type { Dayjs } from "dayjs";
import {
  CalendarOutlined,
  ReloadOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useShiftCalendarQuery,
  useShiftsQuery,
} from "@/hooks/shifts/useShiftQueries";
import type { ShiftCalendarDay } from "@/types/shifts";

import ShiftBulkModal from "./ShiftBulkModal";
import ShiftDayDrawer from "./ShiftDayDrawer";
import ShiftMasterModal from "./ShiftMasterModal";
import styles from "./ShiftCalendarPage.module.css";

/** ปฏิทินโหลดเผื่อหัว-ท้ายเดือน เพราะช่องแรก/ท้ายตารางเป็นวันของเดือนข้างเคียง */
function monthRange(month: Dayjs) {
  return {
    dateFrom: month.startOf("month").subtract(7, "day").format("YYYY-MM-DD"),
    dateTo: month.endOf("month").add(7, "day").format("YYYY-MM-DD"),
  };
}

export default function ShiftCalendarPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [masterOpen, setMasterOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const range = useMemo(() => monthRange(month), [month]);
  const calendarQuery = useShiftCalendarQuery(range);
  const shiftsQuery = useShiftsQuery();

  const shifts = shiftsQuery.data?.data ?? [];

  const dayMap = useMemo(() => {
    const map = new Map<string, ShiftCalendarDay>();
    for (const day of calendarQuery.data?.data.days ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [calendarQuery.data]);

  /** สรุปเฉพาะวันในเดือนที่กำลังดู ไม่รวมวันเผื่อหัว-ท้าย */
  const summary = useMemo(() => {
    const prefix = month.format("YYYY-MM");
    const days = (calendarQuery.data?.data.days ?? []).filter((day) =>
      day.date.startsWith(prefix),
    );

    return {
      rounds: days.reduce((sum, day) => sum + day.schedules.length, 0),
      plannedDays: days.filter((day) => day.schedules.length > 0).length,
      holidays: days.filter((day) => day.holiday).length,
      totalMembers: days.reduce((sum, day) => sum + day.totalMembers, 0),
      emptyRounds: days.reduce(
        (sum, day) =>
          sum + day.schedules.filter((round) => round.memberCount === 0).length,
        0,
      ),
    };
  }, [calendarQuery.data, month]);

  const handleSelect = (value: Dayjs, info: { source: string }) => {
    if (info.source !== "date") {
      return;
    }
    if (!value.isSame(month, "month")) {
      setMonth(value);
    }
    setSelectedDate(value.format("YYYY-MM-DD"));
  };

  /** ย้ายรอบกะแล้ว — พาไปดูวันปลายทางต่อ ไม่ให้ HR งงว่ารอบกะหายไปไหน */
  const handleMoved = (date: string) => {
    const target = dayjs(date);
    if (!target.isSame(month, "month")) {
      setMonth(target);
    }
    setSelectedDate(date);
  };

  const renderCell = (current: Dayjs) => {
    const day = dayMap.get(current.format("YYYY-MM-DD"));
    if (!day) {
      return null;
    }

    return (
      <div className={styles.cell}>
        {day.holiday ? (
          <div
            className={`${styles.cellHoliday} ${
              day.holiday.dayType === "MAINTENANCE"
                ? styles.cellHolidayMaintenance
                : ""
            }`}
          >
            {day.holiday.dayType === "MAINTENANCE" ? <ToolOutlined /> : null}
            <span>{day.holiday.name}</span>
          </div>
        ) : null}

        {day.schedules.map((round) => (
          <Tooltip
            key={round.id}
            title={`${round.shiftName} ${round.startTime}-${round.endTime} · ${round.memberCount} คน`}
          >
            <div className={styles.cellRound}>
              <span
                className={styles.cellDot}
                style={{ background: round.color || "#8ab933" }}
                aria-hidden
              />
              <span className={styles.cellRoundName}>{round.shiftName}</span>
              <span className={styles.cellRoundTime}>{round.startTime}</span>
              <span
                className={
                  round.memberCount === 0
                    ? `${styles.cellRoundCount} ${styles.cellRoundCountEmpty}`
                    : styles.cellRoundCount
                }
              >
                {round.memberCount}
              </span>
            </div>
          </Tooltip>
        ))}
      </div>
    );
  };

  return (
    <MasterPageGate isLoading={calendarQuery.isLoading}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <CalendarOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>HRM</p>
            <h1 className={styles.pageTitle}>ตารางกะการทำงาน</h1>
            <p className={styles.pageSubtitle}>
              จัดรอบกะลงปฏิทินรายวัน กดวันที่เพื่อดู/แก้รอบกะและรายชื่อคนในกะ
              หรือกดหยุดวันซ่อมเครื่อง — พนักงานเห็นกะของตัวเองในหน้าลงเวลา
            </p>
          </div>
        </header>

        <div className={styles.toolbar}>
          <label className={styles.filterField}>
            <span>เดือน</span>
            <DatePicker
              picker="month"
              allowClear={false}
              value={month}
              format="MM/YYYY"
              onChange={(value) => value && setMonth(value)}
            />
          </label>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => void calendarQuery.refetch()}
          >
            รีเฟรช
          </Button>

          <Button icon={<SettingOutlined />} onClick={() => setMasterOpen(true)}>
            จัดการกะ
          </Button>

          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => setBulkOpen(true)}
          >
            ลงกะเป็นช่วง
          </Button>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>รอบกะเดือนนี้</span>
            <strong>{summary.rounds}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>วันที่จัดกะแล้ว</span>
            <strong>{summary.plannedDays}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>วันหยุด / ซ่อมเครื่อง</span>
            <strong className={styles.holidayValue}>{summary.holidays}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>คน-กะรวม</span>
            <strong>{summary.totalMembers}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>รอบที่ยังไม่มีคน</span>
            <strong className={styles.warnValue}>{summary.emptyRounds}</strong>
          </div>
        </div>

        <div className={styles.calendarCard}>
          {shifts.length === 0 && !shiftsQuery.isLoading ? (
            <Empty
              className={styles.noShiftEmpty}
              description="ยังไม่มีกะในระบบ — กด จัดการกะ เพื่อสร้างกะเช้า/บ่าย/ดึกก่อน"
            >
              <Button type="primary" onClick={() => setMasterOpen(true)}>
                จัดการกะ
              </Button>
            </Empty>
          ) : null}

          <Calendar
            value={month}
            mode="month"
            onSelect={handleSelect}
            onPanelChange={(value) => setMonth(value)}
            cellRender={(current, info) =>
              info.type === "date" ? renderCell(current as Dayjs) : null
            }
          />

          <div className={styles.legend}>
            {shifts.map((shift) => (
              <span key={shift.id} className={styles.legendItem}>
                <Badge color={shift.color || "#8ab933"} />
                {shift.name} · {shift.startTime}-{shift.endTime}
              </span>
            ))}
          </div>
        </div>

        {selectedDate ? (
          <ShiftDayDrawer
            open
            date={selectedDate}
            day={dayMap.get(selectedDate)}
            shifts={shifts}
            onClose={() => setSelectedDate(null)}
            onMoved={handleMoved}
          />
        ) : null}

        {/* mount เฉพาะตอนเปิด — state ในโมดัลจะรีเซ็ตเองทุกครั้งที่เปิดใหม่ */}
        {masterOpen ? (
          <ShiftMasterModal open onClose={() => setMasterOpen(false)} />
        ) : null}

        {bulkOpen ? (
          <ShiftBulkModal
            open
            shifts={shifts}
            month={month}
            onClose={() => setBulkOpen(false)}
          />
        ) : null}
      </div>
    </MasterPageGate>
  );
}
