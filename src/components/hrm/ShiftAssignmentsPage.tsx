"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  message,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import {
  useShiftAssignmentsQuery,
  useShiftsQuery,
} from "@/hooks/shifts/useShiftQueries";
import {
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_COLOR,
  LEAVE_TYPE_LABEL,
} from "@/types/leave";
import type {
  ShiftAssignment,
  ShiftAssignmentEvent,
  ShiftAssignmentUser,
} from "@/types/shifts";

import ShiftPersonDrawer from "./ShiftPersonDrawer";
import ShiftRosterGrid from "./ShiftRosterGrid";
import styles from "./ShiftAssignmentsPage.module.css";
import {
  formatWorkHours,
  formatWorkMinutes,
  lateCutoffTime,
} from "./shiftDisplay";

type RangeMode = "day" | "month" | "custom";
type ViewMode = "day" | "person" | "events" | "roster";

const MODE_OPTIONS = [
  { label: "รายวัน", value: "day" as const },
  { label: "รายเดือน", value: "month" as const },
  { label: "กำหนดเอง", value: "custom" as const },
];

const VIEW_OPTIONS = [
  { label: "เรียงตามวัน", value: "day" as const },
  { label: "ตารางหยุด (คน × วัน)", value: "roster" as const },
  { label: "สรุปรายคน", value: "person" as const },
  { label: "ลา / OT", value: "events" as const },
];

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** ป้ายลาสำหรับแถวกะ — ลาที่อนุมัติแล้วขึ้นสีตามประเภทลา ที่ยังรออนุมัติขึ้นสีจาง */
function LeaveTag({
  leaveType,
  status,
}: {
  leaveType: string;
  status: string;
}) {
  const label = LEAVE_TYPE_LABEL[leaveType] ?? leaveType;
  return status === "APPROVED" ? (
    <Tag color={LEAVE_TYPE_COLOR[leaveType] ?? "default"}>{label}</Tag>
  ) : (
    <Tag color="default">
      {label} ({LEAVE_STATUS_LABEL[status] ?? status})
    </Tag>
  );
}

export default function ShiftAssignmentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [person, setPerson] = useState<ShiftAssignmentUser | null>(null);
  const [exporting, setExporting] = useState(false);

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
    departmentId,
    q: appliedKeyword || undefined,
  });
  const shiftsQuery = useShiftsQuery();
  const departmentsQuery = useDepartmentsQuery();

  const data = assignmentsQuery.data?.data;
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const byUser = useMemo(() => data?.byUser ?? [], [data]);
  const byShift = useMemo(() => data?.byShift ?? [], [data]);
  const events = useMemo(() => data?.events ?? [], [data]);
  /** แถวรายวันมีแค่วันที่ถูกจัดกะ — OT วันอื่นไม่มีแถวให้เกาะ ต้องบอกแยก */
  const offShiftOvertime = useMemo(() => {
    const items = events.filter(
      (event) =>
        event.kind === "OVERTIME" &&
        event.status === "APPROVED" &&
        !event.hasShift,
    );
    return {
      count: items.length,
      hours:
        Math.round(
          items.reduce((sum, event) => sum + (event.hours ?? 0), 0) * 100,
        ) / 100,
    };
  }, [events]);

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

  const departmentOptions = (departmentsQuery.data?.data ?? [])
    .filter((department) => department.isActive)
    .map((department) => ({ value: department.id, label: department.nameTh }));

  /** วันนี้อยู่ในช่วงที่เลือกไหม — ใช้ไฮไลต์แถวของวันนี้ */
  const todayKey = today.format("YYYY-MM-DD");

  const dayColumns: ColumnsType<ShiftAssignment> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: "วันที่",
        dataIndex: "date",
        key: "date",
        width: 140,
        render: (value: string, row) => (
          <div className={styles.dateCell}>
            <strong>{dayjs(value).format("DD/MM/YYYY")}</strong>
            <span>
              วัน{THAI_WEEKDAYS[row.weekday]}
              {value === todayKey ? (
                <Tag color="green" className={styles.todayTag}>
                  วันนี้
                </Tag>
              ) : null}
            </span>
          </div>
        ),
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
        title: "ตำแหน่ง",
        dataIndex: "position",
        key: "position",
        width: 150,
        ellipsis: true,
        render: (value?: string) => value ?? "—",
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
        width: 190,
        render: (_v, row) => {
          const cutoff = lateCutoffTime(row.startTime, row.lateGraceMinutes);
          return (
            <div className={styles.timeCell}>
              <span className={styles.timeValue}>
                {row.startTime} - {row.endTime} น.
                {row.isOvernight ? <Tag color="purple">ข้ามคืน</Tag> : null}
              </span>
              <span className={styles.timeHint}>
                {cutoff
                  ? `สายได้ถึง ${cutoff} น.`
                  : "ไม่มีเวลาผ่อนผัน"}
              </span>
            </div>
          );
        },
      },
      {
        title: "ชั่วโมงกะ",
        dataIndex: "workMinutes",
        key: "workMinutes",
        width: 110,
        align: "right",
        sorter: (a, b) => a.workMinutes - b.workMinutes,
        render: (value: number) => formatWorkMinutes(value),
      },
      {
        title: "ลา / OT",
        key: "leaveOt",
        width: 210,
        filters: [
          { text: "ลา (อนุมัติแล้ว)", value: "leave" },
          { text: "ลารออนุมัติ", value: "pendingLeave" },
          { text: "มี OT", value: "overtime" },
          { text: "มาปกติ", value: "none" },
        ],
        onFilter: (value, row) => {
          if (value === "leave") return row.isOnLeave;
          if (value === "pendingLeave") return Boolean(row.leave) && !row.isOnLeave;
          if (value === "overtime") return Boolean(row.overtime);
          return !row.leave && !row.overtime;
        },
        render: (_v, row) => (
          <span className={styles.shiftTags}>
            {row.leave ? (
              <LeaveTag
                leaveType={row.leave.leaveType}
                status={row.leave.status}
              />
            ) : null}
            {row.overtime ? (
              <Tag color={row.overtime.status === "APPROVED" ? "gold" : "default"}>
                OT {row.overtime.hours} ชม.
                {row.overtime.status === "APPROVED"
                  ? ""
                  : ` (${LEAVE_STATUS_LABEL[row.overtime.status] ?? row.overtime.status})`}
              </Tag>
            ) : null}
            {!row.leave && !row.overtime ? (
              <span className={styles.noteCell}>—</span>
            ) : null}
          </span>
        ),
      },
      {
        title: "หมายเหตุ",
        key: "note",
        width: 180,
        ellipsis: true,
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
    [openPerson, todayKey],
  );

  const personColumns: ColumnsType<ShiftAssignmentUser> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * pageSize + index + 1,
      },
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
        title: "ตำแหน่ง",
        dataIndex: "position",
        key: "position",
        width: 150,
        ellipsis: true,
        render: (value?: string) => value ?? "—",
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
        title: "ชั่วโมงรวม",
        dataIndex: "workMinutes",
        key: "workMinutes",
        width: 120,
        align: "right",
        sorter: (a, b) => a.workMinutes - b.workMinutes,
        render: (value: number) => formatWorkMinutes(value),
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
        title: "ลา (กะขาดคน)",
        dataIndex: "leaveDays",
        key: "leaveDays",
        width: 130,
        align: "right",
        sorter: (a, b) => a.leaveDays - b.leaveDays,
        render: (value: number, row) =>
          value || row.pendingLeaveDays ? (
            <span className={styles.shiftTags}>
              {value ? <Tag color="volcano">{value} วัน</Tag> : null}
              {row.pendingLeaveDays ? (
                <Tag color="default">รอ {row.pendingLeaveDays}</Tag>
              ) : null}
            </span>
          ) : (
            <span className={styles.noteCell}>—</span>
          ),
      },
      {
        title: "OT",
        dataIndex: "overtimeHours",
        key: "overtimeHours",
        width: 100,
        align: "right",
        sorter: (a, b) => a.overtimeHours - b.overtimeHours,
        render: (value: number, row) =>
          value ? (
            <span className={styles.shiftTags}>
              {value} ชม.
              {row.offShiftOvertimeHours ? (
                <Tooltip title="OT ในวันที่ไม่ได้ถูกจัดกะ เช่น วันหยุดประจำสัปดาห์">
                  <Tag color="gold">นอกวันกะ {row.offShiftOvertimeHours} ชม.</Tag>
                </Tooltip>
              ) : null}
            </span>
          ) : (
            <span className={styles.noteCell}>—</span>
          ),
      },
      {
        title: "ที่ต้องดู",
        key: "flags",
        width: 170,
        render: (_v, row) => (
          <span className={styles.shiftTags}>
            {row.overnightDays ? (
              <Tag color="purple">ข้ามคืน {row.overnightDays} วัน</Tag>
            ) : null}
            {row.holidayDays ? (
              <Tag color="warning">ตรงวันหยุด {row.holidayDays} วัน</Tag>
            ) : null}
            {!row.overnightDays && !row.holidayDays ? (
              <span className={styles.noteCell}>—</span>
            ) : null}
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

  const eventColumns: ColumnsType<ShiftAssignmentEvent> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: "วันที่",
        dataIndex: "date",
        key: "date",
        width: 140,
        render: (value: string, row) => (
          <div className={styles.dateCell}>
            <strong>{dayjs(value).format("DD/MM/YYYY")}</strong>
            <span>
              วัน{THAI_WEEKDAYS[row.weekday]}
              {value === todayKey ? (
                <Tag color="green" className={styles.todayTag}>
                  วันนี้
                </Tag>
              ) : null}
            </span>
          </div>
        ),
      },
      {
        title: "ประเภท",
        dataIndex: "kind",
        key: "kind",
        width: 160,
        filters: [
          { text: "ลา", value: "LEAVE" },
          { text: "OT", value: "OVERTIME" },
        ],
        onFilter: (value, row) => row.kind === value,
        render: (_v, row) =>
          row.kind === "LEAVE" ? (
            <Tag color={LEAVE_TYPE_COLOR[row.leaveType ?? ""] ?? "default"}>
              {LEAVE_TYPE_LABEL[row.leaveType ?? ""] ?? "ลา"}
            </Tag>
          ) : (
            <Tag color="gold">OT {row.hours} ชม.</Tag>
          ),
      },
      {
        title: "พนักงาน",
        key: "employee",
        width: 210,
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
        width: 150,
        ellipsis: true,
        render: (value?: string) => value ?? "—",
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 120,
        filters: [
          { text: "อนุมัติแล้ว", value: "APPROVED" },
          { text: "รออนุมัติ", value: "DRAFT" },
        ],
        onFilter: (value, row) => row.status === value,
        render: (value: string) => (
          <Tag color={LEAVE_STATUS_COLOR[value] ?? "default"}>
            {LEAVE_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "กะวันนั้น",
        key: "shift",
        width: 210,
        filters: [
          { text: "ทับกะที่จัดไว้", value: "yes" },
          { text: "ไม่ได้ถูกจัดกะ", value: "no" },
        ],
        onFilter: (value, row) => (value === "yes" ? row.hasShift : !row.hasShift),
        render: (_v, row) =>
          row.hasShift ? (
            <div className={styles.timeCell}>
              <span className={styles.shiftCell}>
                <span
                  className={styles.shiftDot}
                  style={{ background: row.color || "#8ab933" }}
                  aria-hidden
                />
                {row.shiftName}
              </span>
              <span className={styles.timeHint}>
                {row.shiftStartTime} - {row.shiftEndTime} น.
                {row.kind === "LEAVE" && row.status === "APPROVED"
                  ? " · กะขาดคน"
                  : ""}
              </span>
            </div>
          ) : (
            <span className={styles.noteCell}>ไม่ได้ถูกจัดกะวันนี้</span>
          ),
      },
      {
        title: "เหตุผล",
        dataIndex: "reason",
        key: "reason",
        ellipsis: true,
        render: (value?: string) => value ?? "—",
      },
    ],
    [openPerson, todayKey],
  );

  /** ออกรายงานตามมุมมองที่กำลังดูอยู่ พร้อมตัวกรองที่เปิดไว้ */
  const handleExportPdf = useCallback(async () => {
    // ตารางหยุดเป็นกริดกว้างตามจำนวนวัน ลงกระดาษแบบคอลัมน์คงที่ไม่ได้ — ปุ่มถูกปิดไว้อยู่แล้ว
    if (view === "roster") {
      return;
    }

    const { generateShiftAssignmentsPdf } = await import(
      "@/utils/generateShiftAssignmentsPdf"
    );

    const shiftName = shiftId
      ? shiftOptions.find((option) => option.value === shiftId)?.label
      : undefined;
    const departmentName = departmentId
      ? departmentOptions.find((option) => option.value === departmentId)?.label
      : undefined;

    const filters = [
      { label: "กะ", value: shiftName ?? "ทุกกะ" },
      { label: "แผนก", value: departmentName ?? "ทุกแผนก" },
      ...(appliedKeyword ? [{ label: "ค้นหา", value: appliedKeyword }] : []),
    ];

    const stats = [
      {
        label: "พนักงานที่ถูกจัดกะ",
        value: `${data?.totalEmployees ?? 0} คน`,
        hint: `รวม ${data?.totalAssignments ?? 0} คน-วัน`,
      },
      {
        label: "ชั่วโมงกะรวม",
        value: formatWorkHours(data?.totalWorkMinutes),
        hint: "ยังไม่หักเวลาพัก",
      },
      {
        label: "กะที่คนลา",
        value: `${data?.shiftsOnLeave ?? 0} กะ`,
        hint: `ลา ${data?.employeesOnLeave ?? 0} คน${
          data?.shiftsPendingLeave ? ` · รออนุมัติ ${data.shiftsPendingLeave}` : ""
        }`,
      },
      {
        label: "OT อนุมัติแล้ว",
        value: `${data?.totalOvertimeHours ?? 0} ชม.`,
        hint: `มีคนเข้ากะ ${data?.workingDays ?? 0}/${data?.rangeDays ?? 0} วัน`,
      },
    ];

    const leaveOtCell = (row: ShiftAssignment) => {
      if (row.leave) {
        return {
          text: LEAVE_TYPE_LABEL[row.leave.leaveType] ?? row.leave.leaveType,
          badge: row.isOnLeave
            ? { text: "กะขาดคน", tone: "leave" as const }
            : { text: "รออนุมัติ", tone: "pending" as const },
          hint: row.overtime ? `OT ${row.overtime.hours} ชม.` : undefined,
        };
      }
      if (row.overtime) {
        return {
          text: `OT ${row.overtime.hours} ชม.`,
          badge:
            row.overtime.status === "APPROVED"
              ? undefined
              : { text: "รออนุมัติ", tone: "pending" as const },
        };
      }
      return { text: "—" };
    };

    const views = {
      day: {
        title: "รายงานการเข้ากะ (เรียงตามวัน)",
        titleEn: "Shift Assignments by Date",
        footnote:
          "ชั่วโมงกะคำนวณจากเวลาเข้า-เลิกกะ (รองรับกะข้ามคืน) ยังไม่หักเวลาพัก · แถวที่ระบุว่ากะขาดคน คือคนถูกจัดกะไว้แต่มีใบลาที่อนุมัติแล้ว",
        columns: [
          { label: "วันที่", width: 76 },
          { label: "พนักงาน", width: 138 },
          { label: "แผนก", width: 84 },
          { label: "กะ", width: 78 },
          { label: "เวลาเข้า-เลิกกะ", width: 92 },
          { label: "ชม.", width: 44, align: "right" as const },
          { label: "ลา / OT", width: 96 },
          { label: "หมายเหตุ", width: 122 },
        ],
        rows: rows.map((row) => [
          {
            text: dayjs(row.date).format("DD/MM/YY"),
            hint: `วัน${THAI_WEEKDAYS[row.weekday]}`,
          },
          {
            text: row.displayName ?? "—",
            hint: row.employeeCode ?? undefined,
          },
          { text: row.departmentName ?? "—" },
          { text: row.shiftName, dot: row.color || "#8ab933" },
          {
            text: `${row.startTime} - ${row.endTime}`,
            hint: row.isOvernight ? "ข้ามคืน" : undefined,
          },
          { text: formatWorkMinutes(row.workMinutes) },
          leaveOtCell(row),
          {
            // ชื่อวันหยุดยาวกว่าป้ายจะรับไหว จึงลงบรรทัดรองแทน
            text: row.note || (row.isHoliday ? "" : "—"),
            badge: row.isHoliday
              ? { text: "วันหยุด", tone: "holiday" as const }
              : undefined,
            hint: row.isHoliday ? row.holidayName : undefined,
          },
        ]),
      },
      person: {
        title: "รายงานการเข้ากะ (สรุปรายคน)",
        titleEn: "Shift Assignments by Employee",
        footnote:
          "คอลัมน์ลา นับเฉพาะวันที่ถูกจัดกะไว้แล้วมีใบลาที่อนุมัติแล้วทับ · ชม. OT นับเฉพาะใบที่อนุมัติแล้ว",
        columns: [
          { label: "พนักงาน", width: 140 },
          { label: "ตำแหน่ง", width: 86 },
          { label: "แผนก", width: 82 },
          { label: "เข้ากะ", width: 48, align: "right" as const },
          { label: "ชม.รวม", width: 58, align: "right" as const },
          { label: "ลา", width: 44, align: "right" as const },
          { label: "OT", width: 44, align: "right" as const },
          { label: "แยกตามกะ", width: 154 },
          { label: "ช่วงวันที่", width: 74 },
        ],
        rows: byUser.map((user) => [
          { text: user.displayName ?? "—", hint: user.employeeCode ?? undefined },
          { text: user.position ?? "—" },
          { text: user.departmentName ?? "—" },
          { text: `${user.totalDays} วัน` },
          { text: formatWorkMinutes(user.workMinutes) },
          {
            text: user.leaveDays ? `${user.leaveDays} วัน` : "—",
            hint: user.pendingLeaveDays
              ? `รอ ${user.pendingLeaveDays}`
              : undefined,
          },
          { text: user.overtimeHours ? `${user.overtimeHours} ชม.` : "—" },
          {
            text: user.shifts
              .map((shift) => `${shift.shiftName} ${shift.days} วัน`)
              .join(" · "),
            hint: user.overnightDays
              ? `ข้ามคืน ${user.overnightDays} วัน`
              : undefined,
          },
          {
            text:
              user.firstDate && user.lastDate
                ? `${dayjs(user.firstDate).format("D/M")} - ${dayjs(user.lastDate).format("D/M")}`
                : "—",
          },
        ]),
      },
      events: {
        title: "รายงานการลาและ OT",
        titleEn: "Leave & Overtime Report",
        footnote:
          "รวมวันที่พนักงานไม่ได้ถูกจัดกะไว้ด้วย · รายการที่ทับกะและอนุมัติแล้ว หมายถึงกะนั้นขาดคน",
        columns: [
          { label: "วันที่", width: 76 },
          { label: "ประเภท", width: 82 },
          { label: "พนักงาน", width: 136 },
          { label: "แผนก", width: 84 },
          { label: "สถานะ", width: 66 },
          { label: "กะวันนั้น", width: 112 },
          { label: "เหตุผล", width: 174 },
        ],
        rows: events.map((event) => [
          {
            text: dayjs(event.date).format("DD/MM/YY"),
            hint: `วัน${THAI_WEEKDAYS[event.weekday]}`,
          },
          {
            text:
              event.kind === "LEAVE"
                ? (LEAVE_TYPE_LABEL[event.leaveType ?? ""] ?? "ลา")
                : `OT ${event.hours} ชม.`,
          },
          {
            text: event.displayName ?? "—",
            hint: event.employeeCode ?? undefined,
          },
          { text: event.departmentName ?? "—" },
          { text: LEAVE_STATUS_LABEL[event.status] ?? event.status },
          event.hasShift
            ? {
                text: event.shiftName ?? "—",
                dot: event.color || "#8ab933",
                hint: `${event.shiftStartTime} - ${event.shiftEndTime}`,
                badge:
                  event.kind === "LEAVE" && event.status === "APPROVED"
                    ? { text: "กะขาดคน", tone: "leave" as const }
                    : undefined,
              }
            : { text: "ไม่ได้ถูกจัดกะ" },
          { text: event.reason || "—" },
        ]),
      },
    } as const;

    const config = views[view];

    await generateShiftAssignmentsPdf({
      title: config.title,
      titleEn: config.titleEn,
      periodLabel: `${dayjs(range.dateFrom).format("DD/MM/YYYY")} - ${dayjs(range.dateTo).format("DD/MM/YYYY")}`,
      filters,
      stats,
      shiftBreakdown: byShift.map((shift) => ({
        name: shift.shiftName,
        color: shift.color,
        detail: `${shift.employees} คน · ${shift.assignments} คน-วัน`,
      })),
      columns: [...config.columns],
      rows: config.rows.map((row) => [...row]),
      footnote: config.footnote,
      printedAt: dayjs().format("DD/MM/YYYY HH:mm"),
    });
  }, [
    appliedKeyword,
    byShift,
    byUser,
    data,
    departmentId,
    departmentOptions,
    events,
    range,
    rows,
    shiftId,
    shiftOptions,
    view,
  ]);

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
              ดูว่าใครเข้ากะวันไหน เวลาไหน ใครลาหรือมี OT ทับกะบ้าง
              กดที่ชื่อพนักงานเพื่อดูตารางกะรายคน — จัดรอบกะได้ที่{" "}
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
              style={{ width: 200, maxWidth: "100%" }}
            />
          </label>

          <label className={styles.filterField}>
            <span>แผนก</span>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทุกแผนก"
              value={departmentId}
              onChange={setDepartmentId}
              options={departmentOptions}
              loading={departmentsQuery.isLoading}
              style={{ width: 180, maxWidth: "100%" }}
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
              style={{ width: 220, maxWidth: "100%" }}
            />
          </label>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => void assignmentsQuery.refetch()}
          >
            รีเฟรช
          </Button>

          <Tooltip
            title={
              view === "roster"
                ? "ตารางหยุดกว้างตามจำนวนวัน ยังพิมพ์ลง PDF ไม่ได้ — ใช้มุมมองสรุปรายคนแทน"
                : undefined
            }
          >
            <Button
              icon={<FilePdfOutlined />}
              loading={exporting}
              disabled={assignmentsQuery.isFetching || view === "roster"}
              onClick={() => {
                setExporting(true);
                handleExportPdf()
                  .catch(() => message.error("สร้างไฟล์ PDF ไม่สำเร็จ"))
                  .finally(() => setExporting(false));
              }}
            >
              PDF
            </Button>
          </Tooltip>

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
            <em>คน</em>
          </div>
          <div className={styles.summaryCard}>
            <span>รวมคน-วัน</span>
            <strong>{data?.totalAssignments ?? 0}</strong>
            <em>แถวในตารางรายวัน</em>
          </div>
          <div className={styles.summaryCard}>
            <span>ชั่วโมงกะรวม</span>
            <strong>{formatWorkHours(data?.totalWorkMinutes)}</strong>
            <em>ตามเวลากะ ยังไม่หักเวลาพัก</em>
          </div>
          <div className={styles.summaryCard}>
            <span>วันที่มีคนเข้ากะ</span>
            <strong>{data?.workingDays ?? 0}</strong>
            <em>
              จาก {data?.rangeDays ?? 0} วันในช่วงนี้
              {data?.holidayDays ? ` · หยุด ${data.holidayDays} วัน` : ""}
            </em>
          </div>
          <div className={styles.summaryCard}>
            <span>เฉลี่ยต่อคน</span>
            <strong>
              {data?.totalEmployees
                ? (data.totalAssignments / data.totalEmployees).toFixed(1)
                : "0"}{" "}
              วัน
            </strong>
            <em>
              {data?.totalEmployees
                ? formatWorkMinutes(
                    Math.round(data.totalWorkMinutes / data.totalEmployees),
                  )
                : "—"}{" "}
              ต่อคน
            </em>
          </div>
          <div
            className={`${styles.summaryCard} ${
              data?.shiftsOnLeave ? styles.summaryCardAlert : ""
            }`}
          >
            <span>กะที่คนลา</span>
            <strong>{data?.shiftsOnLeave ?? 0}</strong>
            <em>
              กะขาดคน · ลาทั้งหมด {data?.employeesOnLeave ?? 0} คน
              {data?.shiftsPendingLeave
                ? ` · รออนุมัติอีก ${data.shiftsPendingLeave}`
                : ""}
            </em>
          </div>
          <div className={styles.summaryCard}>
            <span>OT อนุมัติแล้ว</span>
            <strong>{data?.totalOvertimeHours ?? 0} ชม.</strong>
            <em>ทั้งช่วงที่เลือก</em>
          </div>
        </div>

        {byShift.length > 0 ? (
          <div className={styles.shiftStrip}>
            {byShift.map((shift) => (
              <div key={shift.shiftId} className={styles.shiftStripItem}>
                <span
                  className={styles.shiftDot}
                  style={{ background: shift.color || "#8ab933" }}
                  aria-hidden
                />
                <div className={styles.shiftStripBody}>
                  <strong>{shift.shiftName}</strong>
                  <span>
                    {shift.employees} คน · {shift.assignments} คน-วัน
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.tableCard}>
          <div className={styles.tableHead}>
            <Segmented
              options={VIEW_OPTIONS}
              value={view}
              onChange={(value) => setView(value as ViewMode)}
            />
          </div>

          {view === "day" && offShiftOvertime.count > 0 ? (
            <Alert
              className={styles.offShiftAlert}
              type="info"
              showIcon
              title={`มี OT อนุมัติแล้วนอกวันเข้ากะ ${offShiftOvertime.count} รายการ (${offShiftOvertime.hours} ชม.)`}
              description="เช่น OT วันหยุดประจำสัปดาห์ — ไม่มีแถวกะให้แสดงในตารางนี้ แต่นับรวมในสรุปรายคนแล้ว"
              action={
                <Button size="small" onClick={() => setView("events")}>
                  ดูในแท็บ ลา / OT
                </Button>
              }
            />
          ) : null}

          <div className={styles.tableWrap}>
            {view === "roster" ? (
              <ShiftRosterGrid
                params={{
                  ...range,
                  shiftId,
                  departmentId,
                  q: appliedKeyword || undefined,
                }}
              />
            ) : view === "day" ? (
              <Table<ShiftAssignment>
                rowKey={(row) => `${row.scheduleId}-${row.userId}`}
                size="middle"
                columns={dayColumns}
                dataSource={rows}
                loading={assignmentsQuery.isFetching}
                rowClassName={(row) =>
                  [
                    row.date === todayKey ? styles.todayRow : "",
                    row.isOnLeave ? styles.leaveRow : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                scroll={{ x: "max-content" }}
                pagination={{
                  current: page,
                  pageSize,
                  onChange: (p, ps) => { setPage(p); setPageSize(ps); },
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
            ) : view === "person" ? (
              <Table<ShiftAssignmentUser>
                rowKey="userId"
                size="middle"
                columns={personColumns}
                dataSource={byUser}
                loading={assignmentsQuery.isFetching}
                scroll={{ x: "max-content" }}
                pagination={{
                  current: page,
                  pageSize,
                  onChange: (p, ps) => { setPage(p); setPageSize(ps); },
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
            ) : (
              <Table<ShiftAssignmentEvent>
                rowKey={(row) => `${row.kind}-${row.id}-${row.date}`}
                size="middle"
                columns={eventColumns}
                dataSource={events}
                loading={assignmentsQuery.isFetching}
                rowClassName={(row) =>
                  row.date === todayKey ? styles.todayRow : ""
                }
                scroll={{ x: "max-content" }}
                pagination={{
                  current: page,
                  pageSize,
                  onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50, 100],
                  showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                }}
                locale={{
                  emptyText: (
                    <Empty description="ไม่มีใบลาหรือ OT ในช่วงนี้" />
                  ),
                }}
              />
            )}
          </div>
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
