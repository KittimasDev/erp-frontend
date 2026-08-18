"use client";

import { useEffect } from "react";

import { useCompanyProfileQuery } from "@/hooks/company-profile/useCompanyProfileQuery";
import { setCompanyInfoSnapshot } from "@/lib/company/company-info";

/**
 * เชื่อม master `ข้อมูลบริษัท` เข้ากับฟังก์ชันสร้าง PDF
 *
 * ฟังก์ชัน `generate*Pdf` เป็นฟังก์ชันธรรมดา เรียก hook ไม่ได้ จึงต้องมีตัวกลาง
 * คอยเก็บค่าล่าสุดไว้ให้ ตัวนี้ mount อยู่ใน AppShell จึงทำงานทุกหน้าในระบบ
 * และไม่เรนเดอร์อะไรออกมา
 */
export default function CompanyProfileSync() {
  const { data } = useCompanyProfileQuery();

  useEffect(() => {
    if (data?.data) {
      setCompanyInfoSnapshot(data.data);
    }
  }, [data]);

  return null;
}
