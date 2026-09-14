/**
 * จับคู่ทะเบียนที่ OCR อ่านมากับรถใน master
 *
 * ต้องมีฝั่ง frontend ด้วยเพราะหน้าจอโหลดรายการรถมาอยู่แล้ว การจับคู่ในเบราว์เซอร์
 * จึงไม่ต้องยิง API เพิ่ม และผู้ใช้เห็นผลทันทีตอนแก้ทะเบียนในช่อง
 * ตรรกะเดียวกับ `backend/src/weighbridge/ocr/parsers/normalize-license-plate.util.ts`
 * ถ้าแก้ที่ใดที่หนึ่งต้องแก้อีกที่ให้ตรงกัน
 */

import type { Truck } from "@/types/trucks";

const THAI_MARKS_RE = /[ัิ-ฺ็-๎]/;
const THAI_DIGIT_BASE = 0x0e50;
const SARA_AM = "ำ";
const SARA_AA = "า";

/**
 * ทำทะเบียนให้เป็นคีย์เทียบ — `บต-5752` / `บต 5752` / `บต5752` → `บต5752`
 * ตัดขีด ช่องว่าง วรรณยุกต์ และแปลงเลขไทยเป็นอารบิก
 */
export function normalizePlateKey(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }
  let out = "";
  for (const char of raw.normalize("NFC")) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= THAI_DIGIT_BASE && code <= THAI_DIGIT_BASE + 9) {
      out += String(code - THAI_DIGIT_BASE);
      continue;
    }
    if (THAI_MARKS_RE.test(char)) {
      continue;
    }
    out += char === SARA_AM ? SARA_AA : char;
  }
  return out.toLowerCase().replace(/[^ก-ฮ0-9a-z]/g, "");
}

function bigrams(text: string): string[] {
  if (text.length < 2) {
    return text.length === 1 ? [text] : [];
  }
  const out: string[] = [];
  for (let i = 0; i < text.length - 1; i += 1) {
    out.push(text.slice(i, i + 2));
  }
  return out;
}

/** ความคล้ายของทะเบียนสองตัว 0..1 — ตรงเป๊ะได้ 1 */
export function scorePlateSimilarity(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const left = normalizePlateKey(a);
  const right = normalizePlateKey(b);
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  if (left === right) {
    return 1;
  }
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  if (leftGrams.length === 0 || rightGrams.length === 0) {
    return 0;
  }
  const pool = new Map<string, number>();
  for (const gram of leftGrams) {
    pool.set(gram, (pool.get(gram) ?? 0) + 1);
  }
  let hits = 0;
  for (const gram of rightGrams) {
    const remaining = pool.get(gram) ?? 0;
    if (remaining > 0) {
      pool.set(gram, remaining - 1);
      hits += 1;
    }
  }
  return Math.min(0.99, (2 * hits) / (leftGrams.length + rightGrams.length));
}

export type TruckPlateCandidate = {
  truck: Truck;
  score: number;
};

/**
 * หารถจากทะเบียน — คืนคันที่ตรงเป๊ะ (หลัง normalize) และคันที่ใกล้เคียงไว้เสนอผู้ใช้
 * เสนอตัวเลือกเป็นตัวช่วยลดการสร้างรถซ้ำตอน OCR อ่านทะเบียนเพี้ยนไปตัวสองตัว
 */
export function matchTruckByPlate(
  plate: string | null | undefined,
  trucks: Truck[],
): { best: Truck | null; candidates: TruckPlateCandidate[] } {
  const key = normalizePlateKey(plate);
  if (!key) {
    return { best: null, candidates: [] };
  }

  const exact = trucks.filter(
    (truck) => normalizePlateKey(truck.licensePlate) === key,
  );
  const candidates = trucks
    .map((truck) => ({
      truck,
      score: scorePlateSimilarity(plate, truck.licensePlate),
    }))
    .filter((row) => row.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { best: exact[0] ?? null, candidates };
}
