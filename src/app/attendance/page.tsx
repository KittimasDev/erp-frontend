import type { Metadata } from "next";

import TimeClockPage from "@/components/attendance/TimeClockPage";

export const metadata: Metadata = {
  title: "ลงเวลาเข้า-ออกงาน | SMT ERP",
  description: "หน้าลงเวลาเข้า-ออกงานสำหรับพนักงาน",
};

/**
 * หน้าเดียวที่เข้าตรงจากลิงก์ได้เลย ไม่ต้องผ่านหน้า portal
 * อยู่นอก route group `(app)` จึงไม่มี AppShell/sidebar — ตัวหน้าเช็ค token เอง
 */
export default function AttendanceRoutePage() {
  return <TimeClockPage />;
}
