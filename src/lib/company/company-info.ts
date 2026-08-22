import {
  downloadCompanyLogo,
  getCompanyProfile,
} from "@/lib/api/company-profile";
import { getAccessToken } from "@/lib/auth/token";
import type { CompanyProfile } from "@/types/company-profile";

/** บัญชีธนาคารหลักเท่าที่เอกสารต้องใช้ */
export type CompanyBankInfo = {
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
};

/** ข้อมูลบริษัทเท่าที่เอกสารต้องใช้ — มาจาก master `ข้อมูลบริษัท` ทั้งหมด */
export type CompanyInfoSnapshot = {
  nameTh: string;
  /** ชื่อย่อสำหรับท้ายเอกสาร ตกมาที่ชื่อเต็มถ้าไม่ได้ตั้ง */
  shortName: string;
  addressText: string;
  phone: string;
  taxId: string;
  /** path โลโก้ที่พิมพ์เองในหน้า master (ใช้เมื่อไม่ได้อัปโหลดไฟล์) */
  logoUrl: string;
  /**
   * โลโก้ที่อัปโหลดไว้ แปลงเป็น data URI แล้ว
   *
   * ต้องเป็น data URI ไม่ใช่ blob URL หรือ URL ของ API เพราะ html2canvas
   * ตั้ง `useCORS: true, allowTaint: false` และ endpoint โลโก้ต้องแนบ token
   * ซึ่งใส่ใน `<img src>` ไม่ได้
   */
  logoDataUrl: string | null;
  /** บัญชีหลักที่ active — เอกสารกลุ่มขายเอาไปโชว์ */
  bankAccount: CompanyBankInfo | null;
};

let snapshot: CompanyInfoSnapshot | null = null;
/** เก็บเป็น promise กันยิงซ้อนตอนกดพิมพ์รัว ๆ */
let pending: Promise<CompanyInfoSnapshot> | null = null;
/**
 * โหลดครบจาก API แล้วหรือยัง (รวมโลโก้)
 * ค่าที่ `setCompanyInfoSnapshot` อุ่นไว้ยังไม่นับ เพราะไม่มี logoDataUrl
 */
let loaded = false;

function pickDefaultBankAccount(
  profile: CompanyProfile,
): CompanyBankInfo | null {
  const account = (profile.bankAccounts ?? []).find(
    (item) => item.isDefault && item.isActive,
  );
  if (!account) {
    return null;
  }
  return {
    bankName: account.bankName?.trim() ?? "",
    branchName: account.branchName?.trim() ?? "",
    accountName: account.accountName?.trim() ?? "",
    accountNumber: account.accountNumber?.trim() ?? "",
  };
}

function toSnapshot(
  profile: CompanyProfile,
  logoDataUrl: string | null,
): CompanyInfoSnapshot {
  const nameTh = profile.nameTh?.trim() || "";
  return {
    nameTh,
    shortName: profile.shortName?.trim() || nameTh,
    addressText: profile.addressText?.trim() || "",
    phone: profile.phone?.trim() || "",
    taxId: profile.taxId?.trim() || "",
    logoUrl: profile.logoUrl?.trim() || "",
    logoDataUrl,
    bankAccount: pickDefaultBankAccount(profile),
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("อ่านไฟล์โลโก้ไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

/**
 * อุ่นค่าไว้ล่วงหน้าจาก React (`CompanyProfileSync`) เพื่อให้กดพิมพ์ครั้งแรกไม่ต้องรอ
 * ไม่แตะ `logoDataUrl` — ตัวนั้น `ensureCompanyInfo()` เป็นคนโหลด
 */
export function setCompanyInfoSnapshot(profile: CompanyProfile) {
  snapshot = toSnapshot(profile, snapshot?.logoDataUrl ?? null);
}

/**
 * โหลดข้อมูลบริษัทให้พร้อมก่อนสร้างเอกสาร — generator ทุกตัวต้อง `await` ตัวนี้ก่อน
 *
 * ไม่มีค่า hardcode สำรองอีกแล้ว ถ้าโหลดไม่ได้จะโยน error ให้ผู้ใช้เห็น
 * ดีกว่าพิมพ์เอกสารที่มีชื่อบริษัทเก่าหรือหัวเอกสารว่างออกไป
 */
export async function ensureCompanyInfo(): Promise<CompanyInfoSnapshot> {
  if (loaded && snapshot) {
    return snapshot;
  }
  if (pending) {
    return pending;
  }

  pending = (async () => {
    const token = getAccessToken();
    let profile: CompanyProfile;
    try {
      profile = (await getCompanyProfile(token)).data;
    } catch {
      throw new Error("โหลดข้อมูลบริษัทไม่สำเร็จ — ยังสร้างเอกสารไม่ได้");
    }

    let logoDataUrl: string | null = null;
    if (profile.hasLogoFile) {
      try {
        const { blob } = await downloadCompanyLogo(token);
        logoDataUrl = await blobToDataUrl(blob);
      } catch {
        // โลโก้โหลดไม่ได้ไม่ควรบล็อกการพิมพ์ — ตกไปใช้ logoUrl ที่ตั้งไว้
        logoDataUrl = null;
      }
    }

    snapshot = toSnapshot(profile, logoDataUrl);
    loaded = true;
    return snapshot;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

/** ล้าง cache เมื่อข้อมูลบริษัทถูกแก้ — พิมพ์ใบถัดไปต้องได้ค่าใหม่ทันที */
export function invalidateCompanyInfo() {
  snapshot = null;
  pending = null;
  loaded = false;
}

/** อ่านค่าที่โหลดไว้แล้วแบบไม่ throw — ใช้ในหน้าจอ React ที่มี fallback ของตัวเอง */
export function peekCompanyInfo(): CompanyInfoSnapshot | null {
  return snapshot;
}

/**
 * อ่านค่าแบบซิงก์สำหรับตัวประกอบ HTML ของเอกสาร
 * ต้องเรียกหลัง `ensureCompanyInfo()` เสมอ — ถ้ายังไม่มีข้อมูลให้พังดัง ๆ
 * ดีกว่าพิมพ์หัวเอกสารว่างออกมาแล้วไม่มีใครรู้
 */
export function getCompanyInfoSnapshot(): CompanyInfoSnapshot {
  if (!snapshot) {
    throw new Error(
      "ยังไม่ได้โหลดข้อมูลบริษัท — ต้อง await ensureCompanyInfo() ก่อนประกอบเอกสาร",
    );
  }
  return snapshot;
}

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
