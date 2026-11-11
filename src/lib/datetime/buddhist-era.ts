import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import customParseFormat from "dayjs/plugin/customParseFormat";

/**
 * ปี พ.ศ. ทั้งระบบ (แสดงผลเท่านั้น — ค่าที่เก็บ/ส่ง API ยังเป็น ค.ศ. ISO 8601 เหมือนเดิม)
 *
 * - แสดง: ใช้ token `BBBB` ของ dayjs (ปลั๊กอิน buddhistEra) เช่น `DD/MM/BBBB` → 11/11/2569
 * - อ่านที่ผู้ใช้พิมพ์: ปลั๊กอินด้านล่างทำให้ `dayjs("11/11/2569", "DD/MM/BBBB")` ได้ 11 พ.ย. 2026
 *   · ปี >= 2400 ถือเป็น พ.ศ. แล้วลบ 543 · ปีที่น้อยกว่านั้น (เช่นพิมพ์ 2026) ถือเป็น ค.ศ. อยู่แล้ว
 *     จึงไม่เกิดการบวก/ลบ 543 ซ้ำ (ไม่ได้ปี 3112 หรือ 1483)
 *
 * import ไฟล์นี้ครั้งเดียวที่ราก (AntdProvider) — ไม่แตะ `dayjs().format("YYYY-MM-DD")` ที่ใช้คุยกับ API
 */

/** รูปแบบวันที่ที่แสดงผู้ใช้ (พ.ศ.) */
export const BE_DATE_FORMAT = "DD/MM/BBBB";
export const BE_DATETIME_FORMAT = "DD/MM/BBBB HH:mm";
export const BE_MONTH_FORMAT = "MM/BBBB";

const BE_OFFSET = 543;
const BE_THRESHOLD = 2400;
const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;
const TOKEN = /\[[^\]]*\]|BBBB|YYYY|DD|D|MM|M|HH|H|hh|h|mm|m|ss|s|SSS|A|a|Z{1,2}/g;

/** เปลี่ยนปีใน text ตาม format ที่มี BBBB เป็น ค.ศ. แล้วคืน [text, format] ที่ใช้ parse ด้วย YYYY ได้ */
function normalizeBuddhist(text: string, format: string): [string, string] | null {
  const tokens: string[] = [];
  let pattern = "";
  let last = 0;
  for (const m of format.matchAll(TOKEN)) {
    const lit = format.slice(last, m.index);
    pattern += lit.replace(ESCAPE_RE, "\\$&");
    const tok = m[0];
    if (tok.startsWith("[")) {
      pattern += tok.slice(1, -1).replace(ESCAPE_RE, "\\$&");
    } else if (tok === "A" || tok === "a") {
      pattern += "([AaPp][Mm])";
      tokens.push(tok);
    } else if (tok === "BBBB" || tok === "YYYY") {
      pattern += String.raw`(\d{1,4})`;
      tokens.push(tok);
    } else {
      pattern += String.raw`(\d{1,3}|[+-]\d{2}:?\d{2})`;
      tokens.push(tok);
    }
    last = (m.index ?? 0) + tok.length;
  }
  pattern += format.slice(last).replace(ESCAPE_RE, "\\$&");
  const match = new RegExp(`^${pattern}$`).exec(text.trim());
  if (!match) return null;
  const idx = tokens.indexOf("BBBB");
  if (idx < 0) return null;
  const year = Number(match[idx + 1]);
  const ce = year >= BE_THRESHOLD ? year - BE_OFFSET : year;
  // ประกอบ text ใหม่โดยแทนเฉพาะปี
  let rebuilt = "";
  let cursor = 0;
  let group = 0;
  const src = text.trim();
  // หาตำแหน่งของ group ปีใน src ด้วยการวนทีละ token ตาม match
  let pos = 0;
  for (const tok of tokens) {
    group += 1;
    const piece = match[group];
    const at = src.indexOf(piece, pos);
    if (tok === "BBBB") {
      rebuilt += src.slice(cursor, at) + String(ce).padStart(4, "0");
      cursor = at + piece.length;
    }
    pos = at + piece.length;
  }
  rebuilt += src.slice(cursor);
  return [rebuilt, format.replace("BBBB", "YYYY")];
}

let installed = false;

export function installBuddhistEra() {
  if (installed) return;
  installed = true;
  dayjs.extend(customParseFormat);
  dayjs.extend(buddhistEra);
  dayjs.extend((_option, dayjsClass) => {
    const proto = dayjsClass.prototype as unknown as {
      parse: (cfg: { date?: unknown; args?: unknown[] }) => unknown;
    };
    const original = proto.parse;
    proto.parse = function (cfg) {
      const args = cfg.args ? Array.from(cfg.args as ArrayLike<unknown>) : [];
      const format = args[1];
      if (typeof cfg.date === "string" && typeof format === "string" && format.includes("BBBB")) {
        const normalized = normalizeBuddhist(cfg.date, format);
        if (normalized) {
          args[0] = normalized[0];
          args[1] = normalized[1];
          cfg = { ...cfg, date: normalized[0], args };
        }
      }
      return original.call(this, cfg);
    };
  });
}

installBuddhistEra();
