import type { CompanyProfile } from "@/types/company-profile";

/** ข้อมูลบริษัทเท่าที่เอกสารต้องใช้ */
export type CompanyInfoSnapshot = {
  nameTh: string;
  addressText: string;
  phone: string;
  taxId: string;
  logoUrl: string;
};

/**
 * ค่าสำรองเมื่อยังโหลดข้อมูลบริษัทไม่เสร็จ
 *
 * ตั้งให้ตรงกับข้อความที่เคยฝังในเอกสารทุกตัวอักษร ถ้าผู้ใช้กดพิมพ์เร็วกว่าที่
 * query จะตอบ เอกสารจะยังออกมาถูกเหมือนเดิม ไม่ใช่หัวเอกสารว่างเปล่า
 */
const FALLBACK: CompanyInfoSnapshot = {
  nameTh: "บริษัท เอสเอ็มที เอนเนอร์ยี่ จำกัด",
  addressText: "85 ถนนโยธา แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100",
  phone: "02-2359565-8",
  taxId: "0105563023124",
  logoUrl: "/9315db73-509d-48a7-a8a8-deccea44bb93.png",
};

/**
 * เก็บไว้ระดับ module เพราะฟังก์ชันสร้าง PDF เป็นฟังก์ชันธรรมดา
 * ไม่ได้อยู่ใน React จึงเรียก hook ไม่ได้ — `CompanyProfileSync` เป็นตัวเติมค่าให้
 */
let snapshot: CompanyInfoSnapshot = FALLBACK;

export function setCompanyInfoSnapshot(profile: CompanyProfile) {
  snapshot = {
    nameTh: profile.nameTh?.trim() || FALLBACK.nameTh,
    addressText: profile.addressText?.trim() || FALLBACK.addressText,
    phone: profile.phone?.trim() || "",
    taxId: profile.taxId?.trim() || "",
    logoUrl: profile.logoUrl?.trim() || FALLBACK.logoUrl,
  };
}

export function getCompanyInfoSnapshot(): CompanyInfoSnapshot {
  return snapshot;
}

/**
 * จัดรูปเลขประจำตัวผู้เสียภาษี
 * `grouped` = รูปแบบมาตรฐาน 1-4-5-2-1 เช่น 0 1055 63023 12 4
 * ใช้ตามที่แต่ละเอกสารเคยแสดง เพื่อไม่ให้หน้าตาเอกสารเปลี่ยนจากเดิม
 */
export function formatTaxId(
  taxId: string,
  style: "plain" | "grouped" = "plain",
): string {
  const digits = taxId.replace(/\D/g, "");

  if (style === "plain" || digits.length !== 13) {
    return taxId;
  }

  return [
    digits.slice(0, 1),
    digits.slice(1, 5),
    digits.slice(5, 10),
    digits.slice(10, 12),
    digits.slice(12, 13),
  ].join(" ");
}
