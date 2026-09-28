"use client";

import { useQuery } from "@tanstack/react-query";

import { getUnitConversionSettings } from "@/lib/api/unit-conversions";
import { getAccessToken } from "@/lib/auth/token";
import {
  domainConvertsUnits,
  type UnitConversionDomain,
} from "@/lib/units/domainCapability";

export const unitConversionSettingsQueryKey = [
  "master-data",
  "unit-conversions",
  "settings",
] as const;

export function useUnitConversionSettingsQuery() {
  return useQuery({
    queryKey: unitConversionSettingsQueryKey,
    queryFn: () => getUnitConversionSettings(getAccessToken()),
    /*
      เป็นค่า env ฝั่ง backend เปลี่ยนได้แค่ตอน deploy — ไม่ต้อง refetch ถี่
      แต่ไม่ใช้ Infinity เพราะอยากให้ tab ที่เปิดค้างข้ามการ deploy เห็นค่าใหม่
    */
    staleTime: 30 * 60_000,
  });
}

/**
 * โดเมนนี้ให้ผู้ใช้เลือกหน่วยอื่นนอกจากหน่วยหลักได้ไหม
 *
 * ต้องผ่านทั้งสองด่าน: โดเมนอยู่ใน UNIT_CONVERTING_DOMAINS (backend แปลงเป็น)
 * และสวิตช์ระดับระบบเปิดอยู่ · กำลังโหลด/โหลดพลาด = ปิดไว้ก่อน ห้าม fail-open
 * ไม่งั้นผู้ใช้เลือกหน่วยได้แล้วโดน 400 ตอนกดบันทึก
 */
export function useDomainConvertsUnits(domain: UnitConversionDomain): boolean {
  const settings = useUnitConversionSettingsQuery();
  return domainConvertsUnits(domain, settings.data?.data.enabled);
}
