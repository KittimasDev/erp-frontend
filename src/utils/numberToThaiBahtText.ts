/**
 * Convert number to Thai baht text, e.g. 524.30 → ห้าร้อยยี่สิบสี่บาทสามสิบสตางค์
 */
export function numberToThaiBahtText(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "";
  }

  const abs = Math.abs(Math.round(n * 100) / 100);
  const baht = Math.floor(abs);
  const satang = Math.round((abs - baht) * 100);

  const bahtText = integerToThai(baht);
  if (satang === 0) {
    return `${bahtText}บาทถ้วน`;
  }
  return `${bahtText}บาท${integerToThai(satang)}สตางค์`;
}

function integerToThai(num: number): string {
  if (num === 0) {
    return "ศูนย์";
  }

  const digits = [
    "ศูนย์",
    "หนึ่ง",
    "สอง",
    "สาม",
    "สี่",
    "ห้า",
    "หก",
    "เจ็ด",
    "แปด",
    "เก้า",
  ];

  function underThousand(n: number): string {
    if (n === 0) return "";
    let text = "";
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;

    if (hundreds > 0) {
      text += `${digits[hundreds]}ร้อย`;
    }
    if (tens > 0) {
      if (tens === 1) {
        text += "สิบ";
      } else if (tens === 2) {
        text += "ยี่สิบ";
      } else {
        text += `${digits[tens]}สิบ`;
      }
    }
    if (ones > 0) {
      if (tens > 0 && ones === 1) {
        text += "เอ็ด";
      } else {
        text += digits[ones];
      }
    }
    return text;
  }

  if (num < 1000) {
    return underThousand(num);
  }

  const millions = Math.floor(num / 1_000_000);
  const rest = num % 1_000_000;
  const thousands = Math.floor(rest / 1000);
  const below = rest % 1000;

  let text = "";
  if (millions > 0) {
    text += `${integerToThai(millions)}ล้าน`;
  }
  if (thousands > 0) {
    text += `${underThousand(thousands)}พัน`;
  }
  if (below > 0) {
    text += underThousand(below);
  }
  return text;
}
