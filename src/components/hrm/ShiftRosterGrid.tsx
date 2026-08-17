"use client";

import { useMemo, useState } from "react";
import { Alert, Empty, Segmented, Spin, Tooltip } from "antd";
import dayjs from "dayjs";

import { useShiftRosterQuery } from "@/hooks/shifts/useShiftQueries";
import { LEAVE_TYPE_LABEL } from "@/types/leave";
import type {
  ShiftAssignmentParams,
  ShiftRosterCell,
  ShiftRosterRow,
  ShiftRosterStatus,
} from "@/types/shifts";
import { SHIFT_ROSTER_STATUS_LABEL } from "@/types/shifts";

import styles from "./ShiftRosterGrid.module.css";

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** สัญลักษณ์ในช่อง — สั้นที่สุดเท่าที่ยังอ่านออก เพราะช่องแคบมากเมื่อดูทั้งเดือน */
const CELL_MARK: Record<ShiftRosterStatus, string> = {
  SHIFT: "",
  LEAVE: "ล",
  HOLIDAY: "×",
  OFF: "·",
  UNPLANNED: "",
};

/**
 * ช่องเข้ากะใส่อักษรแรกของชื่อกะ (ช/บ/ด) — แยกกะได้โดยไม่ต้องพึ่งสีอย่างเดียว
 * คนตาบอดสีและการพิมพ์ขาวดำยังอ่านออก
 */
function cellMark(cell: ShiftRosterCell): string {
  if (cell.status !== "SHIFT") {
    return CELL_MARK[cell.status];
  }
  return cell.shiftName?.trim().charAt(0) ?? "✓";
}

/** ตัวอักษรบนสีกะที่ผู้ใช้เลือกเอง — สลับขาว/ดำตามความสว่างของพื้นหลัง */
function textOn(background?: string): string | undefined {
  const hex = background?.trim().replace("#", "");
  if (!hex || (hex.length !== 3 && hex.length !== 6)) {
    return undefined;
  }
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  const [r, g, b] = [0, 2, 4].map((i) =>
    parseInt(full.slice(i, i + 2), 16),
  );
  // luminance แบบง่าย (ITU-R BT.601) พอสำหรับตัดสินขาว/ดำ
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1f2937" : "#ffffff";
}

type FilterMode = "all" | "off";

function cellTooltip(row: ShiftRosterRow, cell: ShiftRosterCell): string {
  const date = dayjs(cell.date).format("D/M/YYYY");
  const who = row.displayName;
  switch (cell.status) {
    case "SHIFT":
      return `${who} · ${date} — ${cell.shiftName ?? "เข้ากะ"} ${cell.startTime ?? ""}-${cell.endTime ?? ""}`;
    case "LEAVE": {
      const type = cell.leaveType
        ? (LEAVE_TYPE_LABEL[cell.leaveType] ?? cell.leaveType)
        : "ลา";
      const onShift = cell.shiftName ? ` (ติดกะ ${cell.shiftName} — ต้องหาคนแทน)` : "";
      return `${who} · ${date} — ${type}${onShift}`;
    }
    case "HOLIDAY":
      return `${date} — ${cell.holidayName ?? "วันหยุดบริษัท"}`;
    case "OFF":
      return `${who} · ${date} — หยุด (วันนี้จัดกะแล้วแต่ไม่มีชื่อเขา)`;
    default:
      return `${date} — ยังไม่จัดกะ`;
  }
}

/**
 * ตารางกริด คน × วัน — อ่านคอลัมน์เดียวรู้ว่าวันนั้นใครหยุด อ่านแถวเดียวรู้ว่าคนนั้นหยุดวันไหน
 *
 * ทำเป็นตาราง HTML ตรงๆ ไม่ใช้ antd Table เพราะจำนวนคอลัมน์ผันตามจำนวนวัน
 * (สูงสุด 120 วัน) และต้องการหัวตาราง/คอลัมน์ชื่อที่ตรึงไว้ตอนเลื่อนแนวนอน
 */
export default function ShiftRosterGrid({
  params,
}: {
  params: ShiftAssignmentParams;
}) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const query = useShiftRosterQuery(params);
  const data = query.data?.data;

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    return filter === "off"
      ? all.filter((row) => row.offDays > 0 || row.leaveDays > 0)
      : all;
  }, [data, filter]);

  const days = data?.days ?? [];

  if (query.isLoading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  }

  if (!data || days.length === 0) {
    return <Empty description="ไม่มีข้อมูลในช่วงที่เลือก" />;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as FilterMode)}
          options={[
            { label: `ทุกคน (${data.totalEmployees})`, value: "all" },
            { label: "เฉพาะคนที่หยุด/ลา", value: "off" },
          ]}
        />
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchShift}`} />
            เข้ากะ
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchLeave}`} />ลา
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchOff}`} />
            หยุด
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchHoliday}`} />
            วันหยุดบริษัท
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchUnplanned}`} />
            ยังไม่จัดกะ
          </span>
        </div>
      </div>

      {data.unplannedDays > 0 ? (
        <Alert
          type="info"
          showIcon
          className={styles.notice}
          title={`มี ${data.unplannedDays} วันที่ยังไม่ได้จัดกะเลย`}
          description="วันเหล่านั้นแสดงเป็น “ยังไม่จัดกะ” ไม่ใช่ “หยุด” — ตัวเลขวันหยุดของช่วงนี้จะครบก็ต่อเมื่อจัดกะครบทุกวันแล้ว"
        />
      ) : null}

      <div className={styles.scroller}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={`${styles.nameCell} ${styles.headCell}`}>
                พนักงาน
              </th>
              {days.map((day) => {
                const date = dayjs(day.date);
                return (
                  <th
                    key={day.date}
                    className={`${styles.dayHead} ${
                      day.isHoliday ? styles.dayHeadHoliday : ""
                    } ${!day.hasRounds ? styles.dayHeadUnplanned : ""}`}
                  >
                    <Tooltip
                      title={
                        day.isHoliday
                          ? `${date.format("D/M/YYYY")} — ${day.holidayName ?? "วันหยุด"}`
                          : day.hasRounds
                            ? `${date.format("D/M/YYYY")} — เข้ากะ ${day.workingCount} · ลา ${day.leaveCount} · หยุด ${day.offCount}`
                            : `${date.format("D/M/YYYY")} — ยังไม่จัดกะ`
                      }
                    >
                      <span className={styles.dayHeadInner}>
                        <span className={styles.dayNum}>{date.date()}</span>
                        <span className={styles.dayDow}>
                          {THAI_WEEKDAYS[day.weekday]}
                        </span>
                      </span>
                    </Tooltip>
                  </th>
                );
              })}
              <th className={styles.totalHead}>หยุด</th>
              <th className={styles.totalHead}>ลา</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <th scope="row" className={styles.nameCell}>
                  <span className={styles.name}>{row.displayName}</span>
                  <span className={styles.nameMeta}>
                    {row.employeeCode ?? "—"}
                    {row.departmentName ? ` · ${row.departmentName}` : ""}
                  </span>
                </th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.date}
                    className={`${styles.cell} ${styles[`cell${cell.status}`]}`}
                    style={
                      cell.status === "SHIFT" && cell.color
                        ? { background: cell.color, color: textOn(cell.color) }
                        : undefined
                    }
                  >
                    <Tooltip title={cellTooltip(row, cell)}>
                      <span
                        className={styles.cellInner}
                        aria-label={`${row.displayName} ${dayjs(cell.date).format("D/M")} ${SHIFT_ROSTER_STATUS_LABEL[cell.status]}${cell.shiftName ? ` ${cell.shiftName}` : ""}`}
                      >
                        {cellMark(cell)}
                      </span>
                    </Tooltip>
                  </td>
                ))}
                <td className={styles.totalCell}>
                  {row.offDays > 0 ? <strong>{row.offDays}</strong> : "—"}
                </td>
                <td className={styles.totalCell}>
                  {row.leaveDays > 0 ? (
                    <strong className={styles.leaveTotal}>
                      {row.leaveDays}
                    </strong>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={days.length + 3} className={styles.emptyRow}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="ไม่มีคนหยุดหรือลาในช่วงนี้"
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
