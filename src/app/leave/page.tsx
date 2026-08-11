import type { Metadata } from "next";

import LeaveSelfPage from "@/components/leave/LeaveSelfPage";

export const metadata: Metadata = {
  title: "ขอลางาน | SMT ERP",
  description: "หน้ายื่นคำขอลางานสำหรับพนักงาน",
};

/**
 * คู่กับ `/attendance` และ `/overtime` — เข้าตรงจากลิงก์ได้เลย ไม่ผ่าน portal
 * อยู่นอก route group `(app)` จึงไม่มี AppShell/sidebar
 */
export default function LeaveRoutePage() {
  return <LeaveSelfPage />;
}
