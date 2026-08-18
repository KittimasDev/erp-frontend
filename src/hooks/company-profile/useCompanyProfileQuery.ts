"use client";

import { useQuery } from "@tanstack/react-query";

import { getCompanyProfile } from "@/lib/api/company-profile";
import { getAccessToken } from "@/lib/auth/token";

export const companyProfileQueryKey = [
  "master-data",
  "company-profile",
] as const;

/**
 * ข้อมูลบริษัท — ใช้ทั้งหน้าตั้งค่าและตอนสร้างหัวเอกสาร PDF
 * แก้นานๆ ครั้งแต่อ่านบ่อย จึงถือค่าไว้นานหน่อยไม่ให้ยิงซ้ำทุกครั้งที่กดพิมพ์
 */
export function useCompanyProfileQuery() {
  return useQuery({
    queryKey: companyProfileQueryKey,
    queryFn: () => getCompanyProfile(getAccessToken()),
    staleTime: 5 * 60 * 1000,
  });
}
