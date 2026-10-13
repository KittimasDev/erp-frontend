"use client";

import { Fragment, useMemo, useState } from "react";
import { Alert, Segmented, Tooltip } from "antd";
import dayjs from "dayjs";

import type {
  Shift,
  ShiftAutoPlan,
  ShiftAutoPlanDay,
  ShiftAutoPlanDaySlot,
  ShiftAutoPlanWarning,
} from "@/types/shifts";

import styles from "./ShiftAutoPlanPreview.module.css";

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const WARNING_TONE: Record<
  ShiftAutoPlanWarning["code"],
  "error" | "warning" | "info"
> = {
  NO_EMPLOYEES: "error",
  SHIFT_INACTIVE: "error",
  BELOW_MINIMUM: "warning",
  LEAVE_CONFLICT: "warning",
  CROSS_POSITION_CONFLICT: "warning",
  USER_POSITION_MISMATCH: "warning",
  USER_ROLE_MISMATCH: "warning",
  REFILL_MULTI_SHIFT: "info",
  EXISTING_ROUNDS: "info",
  ROLE_FILTER_EXCLUDED: "info",
};

const WARNING_LABEL: Record<ShiftAutoPlanWarning["code"], string> = {
  NO_EMPLOYEES: "ไม่มีพนักงานในตำแหน่ง",
  SHIFT_INACTIVE: "กะถูกปิดใช้งาน",
  BELOW_MINIMUM: "คนน้อยกว่าขั้นต่ำ",
  LEAVE_CONFLICT: "จัดคนที่ลาไว้",
  CROSS_POSITION_CONFLICT: "ติดกะอื่นอยู่แล้ว",
  USER_POSITION_MISMATCH: "ตำแหน่งไม่ตรง",
  USER_ROLE_MISMATCH: "ไม่อยู่ในบทบาทที่เลือก",
  REFILL_MULTI_SHIFT: "คนเสริมสลับกะ",
  EXISTING_ROUNDS: "มีรอบกะอยู่แล้ว",
  ROLE_FILTER_EXCLUDED: "ตัวกรองบทบาทตัดคนออก",
};

type ViewMode = "slots" | "people";

/** ตัวอักษรบนสีกะ — สลับขาว/ดำตามความสว่างพื้นหลัง (BT.601) */
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
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1f2937" : "#ffffff";
}

/** อักษรแรกของชื่อกะ — แยกกะได้โดยไม่ต้องพึ่งสี (ตาบอดสี / พิมพ์ขาวดำ) */
function shiftMark(shiftName: string): string {
  return shiftName.trim().charAt(0) || "✓";
}

type SlotRow = {
  key: string;
  position: string;
  shiftId: string;
  shiftName: string;
  slotIndex: number;
  /** ช่องรายวัน — key = วันที่ */
  byDate: Map<string, ShiftAutoPlanDaySlot>;
};

/** แถวละ "ช่องกะ" (ตำแหน่ง × กะ × ลำดับช่อง) — มุมมองเดียวที่เห็นช่องที่ไม่มีคน */
function buildSlotRows(days: ShiftAutoPlanDay[]): SlotRow[] {
  const rows = new Map<string, SlotRow>();

  for (const day of days) {
    for (const slot of day.slots) {
      const key = `${slot.position}|${slot.shiftId}|${slot.slotIndex}`;
      const row = rows.get(key) ?? {
        key,
        position: slot.position,
        shiftId: slot.shiftId,
        shiftName: slot.shiftName,
        slotIndex: slot.slotIndex,
        byDate: new Map<string, ShiftAutoPlanDaySlot>(),
      };
      row.byDate.set(day.date, slot);
      rows.set(key, row);
    }
  }

  return [...rows.values()];
}

export default function ShiftAutoPlanPreview({
  plan,
  shifts,
}: {
  plan: ShiftAutoPlan;
  shifts: Shift[];
}) {
  // ขาดคนต้องเห็นก่อน จึงเริ่มที่มุมมองรายช่องกะเมื่อมีช่องขาด
  const [view, setView] = useState<ViewMode>(
    plan.understaffedSlots > 0 ? "slots" : "people",
  );

  const colorByShift = useMemo(
    () => new Map(shifts.map((shift) => [shift.id, shift.color])),
    [shifts],
  );

  const slotRows = useMemo(() => buildSlotRows(plan.days), [plan.days]);

  const dayHeads = plan.days.map((day) => (
    <th
      key={day.date}
      className={`${styles.dayHead} ${day.skipped ? styles.dayHeadHoliday : ""}`}
    >
      <Tooltip
        title={
          day.skipped
            ? `${dayjs(day.date).format("D/M/YYYY")} — ${day.holidayName ?? "วันหยุด"} (ไม่จัดกะ)`
            : dayjs(day.date).format("D/M/YYYY")
        }
      >
        <span className={styles.dayHeadInner}>
          <span className={styles.dayNum}>{dayjs(day.date).date()}</span>
          <span className={styles.dayDow}>{THAI_WEEKDAYS[day.weekday]}</span>
        </span>
      </Tooltip>
    </th>
  ));

  return (
    <div className={styles.wrap}>
      {/* ---------- สรุปยอด ---------- */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>กะทั้งช่วง (ตามปฏิทิน)</span>
          <strong>{plan.totalSlots}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>ช่องที่ต้องจัด</span>
          <strong>{plan.scheduledSlots}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>จัดได้</span>
          <strong className={styles.okValue}>{plan.filledSlots}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>ขาดคน</span>
          <strong
            className={
              plan.understaffedSlots > 0 ? styles.shortValue : styles.okValue
            }
          >
            {plan.understaffedSlots}
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span>วันทำงาน / วันในช่วง</span>
          <strong>
            {plan.workingDays} / {plan.dayCount ?? plan.daysInMonth}
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Coverage</span>
          <strong
            className={
              plan.coverage.pass ? styles.okValue : styles.shortValue
            }
          >
            {plan.coverage.pass
              ? "ผ่าน"
              : `ขาด ${plan.coverage.shortageSlots}`}
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Workload (spread)</span>
          <strong
            className={
              plan.workload.pass ? styles.okValue : styles.shortValue
            }
          >
            {plan.workload.pass
              ? "ใกล้เคียง"
              : `ต่าง ${plan.workload.maxSpread} วัน`}
          </strong>
        </div>
      </div>

      {!plan.coverage.pass ? (
        <Alert
          type="error"
          showIcon
          title="Coverage ยังไม่ผ่าน"
          description={`จัดได้ ${plan.coverage.assignedSlots} จากที่ต้องใช้ ${plan.coverage.requiredSlots} ช่อง — ต้องยืนยันบังคับบันทึกถ้าต้องการลงตารางนี้`}
        />
      ) : null}
      {!plan.workload.pass ? (
        <Alert
          type="warning"
          showIcon
          title="จำนวนวันทำงานยังไม่ใกล้เคียงกัน"
          description={plan.workload.groups
            .filter((group) => group.spread > 2)
            .map(
              (group) =>
                `${group.position} · ${group.shiftName}: ${group.minDays}–${group.maxDays} วัน (ต่าง ${group.spread})`,
            )
            .join(" · ")}
        />
      ) : null}

      {/* ---------- รายตำแหน่ง ---------- */}
      <div className={styles.positionCards}>
        {plan.positions.map((group) => {
          const short = group.availableEmployees < group.minimumEmployees;
          return (
            <div
              key={group.position}
              className={`${styles.positionCard} ${short ? styles.positionCardShort : ""}`}
            >
              <span className={styles.positionName}>{group.position}</span>
              <span className={styles.positionRow}>
                <span>ต้องใช้ต่อวัน</span>
                <span>{group.dailyHeadcount} คน</span>
              </span>
              <span className={styles.positionRow}>
                <span>คนขั้นต่ำที่ควรมี</span>
                <span>{group.minimumEmployees} คน</span>
              </span>
              <span className={styles.positionRow}>
                <span>มีพนักงาน</span>
                <span className={short ? styles.shortValue : undefined}>
                  {group.availableEmployees} คน
                </span>
              </span>
              <span className={styles.positionRow}>
                <span>กะทั้งช่วง</span>
                <span>{group.totalSlots} ช่อง</span>
              </span>
              <span className={styles.positionRow}>
                <span>ขาดคน</span>
                <span
                  className={
                    group.understaffedSlots > 0 ? styles.shortValue : undefined
                  }
                >
                  {group.understaffedSlots} ช่อง
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* ---------- คำเตือน ---------- */}
      {plan.warnings.map((warning, index) => (
        <Alert
          key={`${warning.code}-${index}`}
          type={WARNING_TONE[warning.code] ?? "info"}
          showIcon
          title={WARNING_LABEL[warning.code] ?? warning.code}
          description={warning.message}
        />
      ))}

      {/* ---------- ตารางกริด ---------- */}
      <div className={styles.toolbar}>
        <Segmented<ViewMode>
          value={view}
          onChange={setView}
          options={[
            { label: "รายช่องกะ", value: "slots" },
            { label: "รายคน", value: "people" },
          ]}
        />
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <i className={styles.swatch} style={{ background: "#8ab933" }} />
            เข้ากะ
          </span>
          <span className={styles.legendItem}>
            <i className={`${styles.swatch} ${styles.swatchShort}`} />
            ขาดคน
          </span>
          <span className={styles.legendItem}>
            <i className={`${styles.swatch} ${styles.swatchOff}`} />
            หยุดประจำสัปดาห์
          </span>
          <span className={styles.legendItem}>
            <i className={`${styles.swatch} ${styles.swatchHoliday}`} />
            วันหยุดบริษัท
          </span>
          <span className={styles.legendItem}>
            <i className={`${styles.swatch} ${styles.swatchLeave}`} />
            มีใบลาอนุมัติแล้ว
          </span>
        </div>
      </div>

      <div className={styles.scroller}>
        {view === "slots" ? (
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={`${styles.rowHead}`}>ช่องกะ</th>
                {dayHeads}
                <th className={styles.totalHead}>ขาด</th>
              </tr>
            </thead>
            <tbody>
              {slotRows.map((row) => {
                const shortCount = plan.days.filter((day) => {
                  const slot = row.byDate.get(day.date);
                  return !day.skipped && slot && !slot.userId;
                }).length;

                return (
                  <tr key={row.key}>
                    <th className={styles.rowHead} scope="row">
                      <span className={styles.rowLabel}>
                        {row.shiftName} #{row.slotIndex + 1}
                      </span>
                      <span className={styles.rowMeta}>{row.position}</span>
                    </th>
                    {plan.days.map((day) => {
                      if (day.skipped) {
                        return (
                          <td
                            key={day.date}
                            className={`${styles.cell} ${styles.cellHoliday}`}
                          />
                        );
                      }
                      const slot = row.byDate.get(day.date);
                      if (!slot?.userId) {
                        return (
                          <Tooltip
                            key={day.date}
                            title={`${dayjs(day.date).format("D/M")} — ${row.shiftName} (${row.position}) ไม่มีคนลง`}
                          >
                            <td className={`${styles.cell} ${styles.cellShort}`}>
                              <span className={styles.cellInner}>!</span>
                            </td>
                          </Tooltip>
                        );
                      }
                      const color = colorByShift.get(row.shiftId) || "#8ab933";
                      return (
                        <Tooltip
                          key={day.date}
                          title={`${dayjs(day.date).format("D/M")} — ${slot.displayName} (${slot.source === "REFILL" ? "คนเสริม" : "คนหลัก"})${slot.onApprovedLeave ? " · มีใบลาอนุมัติแล้ว" : ""}`}
                        >
                          <td
                            className={`${styles.cell} ${styles.cellFilled} ${
                              slot.source === "REFILL" ? styles.cellRefill : ""
                            } ${slot.onApprovedLeave ? styles.cellLeave : ""}`}
                            style={{ background: color, color: textOn(color) }}
                          >
                            <span className={styles.cellInner}>
                              {shiftMark(row.shiftName)}
                            </span>
                          </td>
                        </Tooltip>
                      );
                    })}
                    <td
                      className={`${styles.totalCell} ${shortCount > 0 ? styles.shortTotal : ""}`}
                    >
                      {shortCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={styles.rowHead}>พนักงาน</th>
                {dayHeads}
                <th className={styles.totalHead}>วันเข้ากะ</th>
              </tr>
            </thead>
            <tbody>
              {plan.positions.map((group) => (
                <Fragment key={group.position}>
                  <tr className={styles.groupRow}>
                    <td colSpan={plan.days.length + 2}>
                      {group.position} · คนหลัก{" "}
                      {
                        group.employees.filter((e) => e.role === "MAIN").length
                      }{" "}
                      · คนเสริม{" "}
                      {group.employees.filter((e) => e.role === "REFILL").length}
                    </td>
                  </tr>
                  {group.employees.map((employee) => {
                    const slotByDate = new Map(
                      plan.days.flatMap((day) =>
                        day.slots
                          .filter((slot) => slot.userId === employee.userId)
                          .map(
                            (slot) =>
                              [day.date, slot] as [
                                string,
                                ShiftAutoPlanDaySlot,
                              ],
                          ),
                      ),
                    );

                    return (
                      <tr key={employee.userId}>
                        <th className={styles.rowHead} scope="row">
                          <span className={styles.rowLabel}>
                            {employee.displayName}
                          </span>
                          <span className={styles.rowMeta}>
                            {employee.role === "MAIN"
                              ? `คนหลัก · ${employee.primaryShiftName ?? "-"}`
                              : "คนเสริม"}{" "}
                            · หยุด{employee.dayOffLabel}
                          </span>
                        </th>
                        {plan.days.map((day) => {
                          if (day.skipped) {
                            return (
                              <td
                                key={day.date}
                                className={`${styles.cell} ${styles.cellHoliday}`}
                              />
                            );
                          }
                          const slot = slotByDate.get(day.date);
                          if (!slot) {
                            const isDayOff =
                              day.weekday === employee.dayOffWeekday;
                            return (
                              <Tooltip
                                key={day.date}
                                title={`${dayjs(day.date).format("D/M")} — ${
                                  isDayOff ? "วันหยุดประจำสัปดาห์" : "ไม่ได้ลงกะ"
                                }`}
                              >
                                <td className={`${styles.cell} ${styles.cellOff}`}>
                                  <span className={styles.cellInner}>·</span>
                                </td>
                              </Tooltip>
                            );
                          }
                          const color =
                            colorByShift.get(slot.shiftId) || "#8ab933";
                          return (
                            <Tooltip
                              key={day.date}
                              title={`${dayjs(day.date).format("D/M")} — ${slot.shiftName}${slot.onApprovedLeave ? " · มีใบลาอนุมัติแล้ว" : ""}`}
                            >
                              <td
                                className={`${styles.cell} ${styles.cellFilled} ${
                                  slot.source === "REFILL"
                                    ? styles.cellRefill
                                    : ""
                                } ${slot.onApprovedLeave ? styles.cellLeave : ""}`}
                                style={{ background: color, color: textOn(color) }}
                              >
                                <span className={styles.cellInner}>
                                  {shiftMark(slot.shiftName)}
                                </span>
                              </td>
                            </Tooltip>
                          );
                        })}
                        <td className={styles.totalCell}>
                          {employee.assignedDays}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className={styles.footnote}>
        กะที่ข้ามคืนของวันสุดท้ายจะคาบไปถึงเช้าวันถัดจากช่วงที่จัด —
        รอบกะยังบันทึกไว้ที่วันที่เริ่มกะเหมือนเดิม
      </p>
    </div>
  );
}
