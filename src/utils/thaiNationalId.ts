/** ตรวจเลขประจำตัวประชาชนไทย 13 หลัก + หลักตรวจสอบ (checksum) — สูตรเดียวกับ backend */
export function isValidThaiNationalId(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(value[i]) * (13 - i);
  }
  return (11 - (sum % 11)) % 10 === Number(value[12]);
}
