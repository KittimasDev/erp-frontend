/**
 * Intl.DateTimeFormat ที่ปีเป็น พ.ศ. ทุกภาษา โดยไม่มีคำต่อท้าย "BE"
 * (en-GB + ปฏิทินพุทธ จะต่อ " BE" ท้ายสตริง จึงตัดส่วน era ทิ้งก่อนประกอบ)
 * ค่าวันที่ที่เก็บ/ส่ง API ไม่เกี่ยว — ใช้เฉพาะตอนแสดงผล
 */
export function formatBuddhistIntl(
  date: Date,
  lang: "th" | "en",
  options: Intl.DateTimeFormatOptions,
): string {
  const locale = lang === "en" ? "en-GB-u-ca-buddhist" : "th-TH-u-ca-buddhist";
  const parts = new Intl.DateTimeFormat(locale, options).formatToParts(date);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.type === "era") {
      // ตัดตัวคั่นที่อยู่หน้า era ด้วย (เช่นช่องว่างก่อน "BE")
      const prev = out[out.length - 1];
      if (prev !== undefined && /^\s+$/.test(prev)) out.pop();
      continue;
    }
    out.push(part.value);
  }
  return out.join("").trim();
}
