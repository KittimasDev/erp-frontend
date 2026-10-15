import dayjs from "dayjs";

export const PLAN_ROUND_COUNT = 6;

export function addIsoDays(iso: string, days: number) {
  return dayjs(iso).add(days, "day").format("YYYY-MM-DD");
}

export type PlannedRound = {
  index: number;
  startDate: string;
  endDate: string;
  shutdownStartDate: string;
  shutdownEndDate: string;
};

/** ตัวอย่าง 6 รอบบนฟอร์ม — วันจริงคำนวณซ้ำที่เซิร์ฟเวอร์ตอนบันทึก */
export function previewSixRounds(startDate: string): PlannedRound[] {
  const rounds: PlannedRound[] = [];
  let cursor = startDate;
  for (let index = 1; index <= PLAN_ROUND_COUNT; index += 1) {
    const endDate = addIsoDays(cursor, 44);
    const shutdownStartDate = addIsoDays(cursor, 45);
    const shutdownEndDate = addIsoDays(cursor, 47);
    rounds.push({
      index,
      startDate: cursor,
      endDate,
      shutdownStartDate,
      shutdownEndDate,
    });
    cursor = addIsoDays(shutdownEndDate, 1);
  }
  return rounds;
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return dayjs(iso.slice(0, 10)).format("DD/MM/YYYY");
}

export function roundWindow(startDate: string) {
  return {
    startDate,
    endDate: addIsoDays(startDate, 44),
    shutdownStartDate: addIsoDays(startDate, 45),
    shutdownEndDate: addIsoDays(startDate, 47),
  };
}

export type DraftHoliday = { date: string; note: string };

export type DraftRound = PlannedRound & { selected: boolean; holidays: DraftHoliday[] };

export function draftFromFirstStart(startDate: string): DraftRound[] {
  return previewSixRounds(startDate).map((round) => ({
    ...round,
    selected: true,
    holidays: [],
  }));
}

/** วันหยุดของรอบเลือกได้ตั้งแต่วันเริ่มผลิตถึงวันสุดท้ายของ Shutdown */
export function isWithinRound(round: PlannedRound, iso: string) {
  return iso >= round.startDate && iso <= round.shutdownEndDate;
}

export function isShutdownDay(round: PlannedRound, iso: string) {
  return iso >= round.shutdownStartDate && iso <= round.shutdownEndDate;
}

export type DroppedHoliday = { index: number; date: string; note: string };

export type ExistingWindow = {
  roundNo: string;
  startDate: string;
  shutdownEndDate: string;
};

function rangesOverlap(
  a: { startDate: string; shutdownEndDate: string },
  b: { startDate: string; shutdownEndDate: string },
) {
  return a.startDate <= b.shutdownEndDate && b.startDate <= a.shutdownEndDate;
}

/**
 * เปลี่ยนวันเริ่มรอบที่ index แล้วจัดรอบถัดไปให้ชิดกัน รอบก่อนหน้าไม่เปลี่ยน
 * วันหยุดที่หลุดช่วงใหม่ถูกตัดทิ้งและคืนใน dropped
 */
export function shiftDraftStart(
  rounds: DraftRound[],
  index: number,
  newStart: string,
  existing: ExistingWindow[],
):
  | { ok: true; rounds: DraftRound[]; dropped: DroppedHoliday[] }
  | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newStart)) {
    return { ok: false, message: "วันเริ่มไม่ถูกต้อง" };
  }
  const next = rounds.map((round) => ({ ...round }));
  const dropped: DroppedHoliday[] = [];
  let cursor = newStart;
  for (let i = index; i < next.length; i += 1) {
    const window = roundWindow(cursor);
    const earlier = next.slice(0, i).find((round) => rangesOverlap(window, round));
    if (earlier) {
      return { ok: false, message: `ช่วงวันทับกับรอบที่ ${earlier.index}` };
    }
    const clash = existing.find((round) => rangesOverlap(window, round));
    if (clash) {
      return { ok: false, message: `ช่วงวันทับกับรอบ ${clash.roundNo}` };
    }
    const moved = { ...next[i], ...window };
    const kept = moved.holidays.filter((holiday) => isWithinRound(moved, holiday.date));
    for (const holiday of moved.holidays) {
      if (!kept.includes(holiday)) dropped.push({ index: moved.index, ...holiday });
    }
    next[i] = { ...moved, holidays: kept };
    cursor = addIsoDays(window.shutdownEndDate, 1);
  }
  return { ok: true, rounds: next, dropped };
}

/** ช่วงว่างระหว่าง Shutdown ของรอบก่อนกับวันเริ่มรอบนี้ ไม่มีเมื่อรอบชิดกัน */
export function gapBetween(
  previousShutdownEnd: string,
  startDate: string,
): { from: string; to: string } | null {
  const from = addIsoDays(previousShutdownEnd, 1);
  const to = addIsoDays(startDate, -1);
  if (from > to) return null;
  return { from, to };
}
