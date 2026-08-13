"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Input,
  Segmented,
  Select,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useShiftAssignmentsQuery,
  useShiftsQuery,
} from "@/hooks/shifts/useShiftQueries";
import type { ShiftAssignment, ShiftAssignmentUser } from "@/types/shifts";

import ShiftPersonDrawer from "./ShiftPersonDrawer";
import styles from "./ShiftAssignmentsPage.module.css";

type RangeMode = "day" | "month" | "custom";
type ViewMode = "day" | "person";

const MODE_OPTIONS = [
  { label: "รายวัน", value: "day" as const },
  { label: "รายเดือน", value: "month" as const },
  { label: "กำหนดเอง", value: "custom" as const },
];

const VIEW_OPTIONS = [
  { label: "เรียงตามวัน", value: "day" as const },
  { label: "สรุปรายคน", value: "person" as const },
];

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function ShiftAssignmentsPage() {
  const today = dayjs();

  const [mode, setMode] = useState<RangeMode>("month");
  const [day, setDay] = useState<Dayjs>(today);
  const [month, setMonth] = useState<Dayjs>(today);
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    today.startOf("week"),
    today.endOf("week"),
  ]);

  const [view, setView] = useState<ViewMode>("day");
  const [shiftId, setShiftId] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [person, setPerson] = useState<ShiftAssignmentUser | null>(null);

  const range = useMemo<{ dateFrom: string; dateTo: string }>(() => {
    if (mode === "day") {
      const value = day.format("YYYY-MM-DD");
      return { dateFrom: value, dateTo: value };
    }
    if (mode === "month") {
      return {
        dateFrom: month.startOf("month").format("YYYY-MM-DD"),
        dateTo: month.endOf("month").format("YYYY-MM-DD"),
      };
    }
    return {
      dateFrom: customRange[0].format("YYYY-MM-DD"),
      dateTo: customRange[1].format("YYYY-MM-DD"),
    };
  }, [mode, day, month, customRange]);

  const assignmentsQuery = useShiftAssignmentsQuery({
    ...range,
    shiftId,
    q: appliedKeyword || undefined,
  });
  const shiftsQuery = useShiftsQuery();

  const data = assignmentsQuery.data?.data;
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const byUser = useMemo(() => data?.byUser ?? [], [data]);

  /** กดชื่อในตารางรายวัน — หาสรุปของคนนั้นจากผลลัพธ์ที่โหลดมาแล้ว */
  const openPerson = useCallback(
    (userId: string) => {
      const found = byUser.find((user) => user.userId === userId);
      if (found) {
        setPerson(found);
      }
    },
    [byUser],
  );

  const shiftOptions = (shiftsQuery.data?.data ?? []).map((shift) => ({
    value: shift.id,
    label: `${shift.name} · ${shift.startTime}-${shift.endTime}`,
  }));

  /** จำนวนวันที่มีคนเข้ากะจริงในช่วงนี้ */
  const workingDays = useMemo(
    () => new Set(rows.map((row) => row.date)).size,
    [rows],
  );

  const dayColumns: ColumnsType<ShiftAssignment> = useMemo(
    () => [
      {
        title: "วันที่",
        dataIndex: "date",
        key: "date",
        width: 130,
        render: (value: string) => {
          const date = dayjs(value);
          return (
            <div className={styles.dateCell}>
              <strong>{date.format("DD/MM/YYYY")}</strong>
              <span>วัน{THAI_WEEKDAYS[date.day()]}</span>
            </div>
          );
        },
      },
      {
        title: "พนักงาน",
        key: "employee",
        width: 220,
        render: (_v, row) => (
          <button
            type="button"
            className={styles.linkCell}
            onClick={() => openPerson(row.userId)}
          >
            <strong>{row.displayName ?? "—"}</strong>
            <span>{row.employeeCode ?? "ไม่มีรหัสพนักงาน"}</span>
          </button>
        ),
      },
      {
        title: "แผนก",
        dataIndex: "departmentName",
        key: "departmentName",
        width: 140,
        ellipsis: true,
        render: (value?: string) => value ?? "—",
      },
      {
        title: "กะ",
        key: "shift",
        width: 150,
        render: (_v, row) => (
          <span className={styles.shiftCell}>
            <span
              className={styles.shiftDot}
              style={{ background: row.color || "#8ab933" }}
              aria-hidden
            />
            {row.shiftName}
          </span>
        ),
      },
      {
        title: "เวลาเข้า-เลิกกะ",
        key: "time",
        width: 160,
        render: (_v, row) => (
          <span className={styles.timeCell}>
            {row.startTime} - {row.endTime}
            {row.isOvernight ? <Tag color="purple">ข้ามคืน</Tag> : null}
          </span>
        ),
      },
      {
        title: "หมายเหตุ",
        key: "note",
        render: (_v, row) => (
          <span className={styles.noteCell}>
            {row.isHoliday ? (
              <Tag color="warning">{row.holidayName ?? "วันหยุด"}</Tag>
            ) : null}
            {row.note ?? ""}
          </span>
        ),
      },
    ],
    [openPerson],
  );

  const personColumns: ColumnsType<ShiftAssignmentUser> = useMemo(
    () => [
      {
        title: "พนักงาน",
        key: "employee",
        width: 220,
        render: (_v, row) => (
          <button
            type="button"
            className={styles.linkCell}
            onClick={() => setPerson(row)}
          >
            <strong>{row.displayName ?? "—"}</strong>
            <span>{row.employeeCode ?? "ไม่มีรหัสพนักงาน"}</span>
          </button>
        ),
      },
      {
        title: "แผนก",
        dataIndex: "departmentName",
        key: "departmentName",
        width: 150,
        ellipsis: true,
        render: (value?: string) => value ?? "—",
      },
      {
        title: "เข้ากะ",
        dataIndex: "totalDays",
        key: "totalDays",
        width: 100,
        align: "right",
        sorter: (a, b) => a.totalDays - b.totalDays,
        render: (value: number) => `${value} วัน`,
      },
      {
        title: "แยกตามกะ",
        key: "shifts",
        render: (_v, row) => (
          <span className={styles.shiftTags}>
            {row.shifts.map((shift) => (
              <Tag key={shift.shiftId} color={shift.color || "#8ab933"}>
                {shift.shiftName} {shift.days} วัน
              </Tag>
            ))}
          </span>
        ),
      },
      {
        title: "ช่วงวันที่",
        key: "period",
        width: 170,
        render: (_v, row) =>
          row.firstDate && row.lastDate
            ? `${dayjs(row.firstDate).format("D/M")} - ${dayjs(row.lastDate).format("D/M")}`
            : "—",
      },
      {
        title: "",
        key: "action",
        width: 110,
        align: "center",
        render: (_v, row) => (
          <Button size="small" onClick={() => setPerson(row)}>
            ดูรายวัน
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <MasterPageGate isLoading={assignmentsQuery.isLoading}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <TeamOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>HRM</p>
            <h1 className={styles.pageTitle}>รายการเข้ากะ</h1>
            <p className={styles.pageSubtitle}>
              ดูว่าใครเข้ากะวันไหน เวลาไหน กดที่ชื่อพนักงานเพื่อดูตารางกะรายคน —
              จัดรอบกะได้ที่{" "}
              <Link href="/hrm/shifts" className={styles.headerLink}>
                ปฏิทินตารางกะ
              </Link>
            </p>
          </div>
        </header>

        <div className={styles.toolbar}>
          <label className={styles.filterField}>
            <span>ช่วงข้อมูล</span>
            <Segmented
              options={MODE_OPTIONS}
              value={mode}
              onChange={(value) => setMode(value as RangeMode)}
            />
          </label>

          {mode === "day" ? (
            <label className={styles.filterField}>
              <span>วันที่</span>
              <DatePicker
                allowClear={false}
                value={day}
                format="DD/MM/YYYY"
                onChange={(value) => value && setDay(value)}
              />
            </label>
          ) : null}

          {mode === "month" ? (
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
          ) : null}

          {mode === "custom" ? (
            <label className={styles.filterField}>
              <span>ช่วงวันที่</span>
              <DatePicker.RangePicker
                allowClear={false}
                value={customRange}
                format="DD/MM/YYYY"
                onChange={(values) => {
                  if (!values?.[0] || !values[1]) return;
                  setCustomRange([values[0], values[1]]);
                }}
              />
            </label>
          ) : null}

          <label className={styles.filterField}>
            <span>กะ</span>
            <Select
              allowClear
              placeholder="ทุกกะ"
              value={shiftId}
              onChange={setShiftId}
              options={shiftOptions}
              loading={shiftsQuery.isLoading}
              style={{ width: 200 }}
            />
          </label>

          <label className={styles.filterField}>
            <span>ค้นหาพนักงาน</span>
            <Input
              allowClear
              placeholder="ชื่อ หรือ รหัสพนักงาน"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={() => setAppliedKeyword(keyword)}
              onBlur={() => setAppliedKeyword(keyword)}
              style={{ width: 220 }}
            />
          </label>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => void assignmentsQuery.refetch()}
          >
            รีเฟรช
          </Button>

          <Link href="/hrm/shifts">
            <Button type="primary" icon={<CalendarOutlined />}>
              ปฏิทินตารางกะ
            </Button>
          </Link>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>พนักงานที่ถูกจัดกะ</span>
            <strong>{data?.totalEmployees ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>รวมคน-วัน</span>
            <strong>{data?.totalAssignments ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>วันที่มีคนเข้ากะ</span>
            <strong>{workingDays}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>เฉลี่ยต่อคน</span>
            <strong>
              {data?.totalEmployees
                ? (data.totalAssignments / data.totalEmployees).toFixed(1)
                : "0"}{" "}
              วัน
            </strong>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHead}>
            <Segmented
              options={VIEW_OPTIONS}
              value={view}
              onChange={(value) => setView(value as ViewMode)}
            />
          </div>

          {view === "day" ? (
            <Table<ShiftAssignment>
              rowKey={(row) => `${row.scheduleId}-${row.userId}`}
              size="middle"
              columns={dayColumns}
              dataSource={rows}
              loading={assignmentsQuery.isFetching}
              scroll={{ x: 1080 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              }}
              locale={{
                emptyText: (
                  <Empty description="ยังไม่มีการจัดกะในช่วงนี้ — จัดได้ที่หน้าปฏิทินตารางกะ" />
                ),
              }}
            />
          ) : (
            <Table<ShiftAssignmentUser>
              rowKey="userId"
              size="middle"
              columns={personColumns}
              dataSource={byUser}
              loading={assignmentsQuery.isFetching}
              scroll={{ x: 980 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `ทั้งหมด ${total} คน`,
              }}
              locale={{
                emptyText: (
                  <Empty description="ยังไม่มีพนักงานถูกจัดกะในช่วงนี้" />
                ),
              }}
            />
          )}
        </div>

        {person ? (
          <ShiftPersonDrawer
            open
            user={person}
            dateFrom={range.dateFrom}
            dateTo={range.dateTo}
            onClose={() => setPerson(null)}
          />
        ) : null}
      </div>
    </MasterPageGate>
  );
}
