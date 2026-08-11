import type { Metadata } from "next";

import OvertimeSelfPage from "@/components/overtime/OvertimeSelfPage";

export const metadata: Metadata = {
  title: "ขอทำงานล่วงเวลา (OT) | SMT ERP",
  description: "หน้าขอทำงานล่วงเวลาสำหรับพนักงาน",
};

/**
 * คู่กับ `/attendance` — เข้าตรงจากลิงก์ได้เลย ไม่ผ่าน portal
 * อยู่นอก route group `(app)` จึงไม่มี AppShell/sidebar
 */
export default function OvertimeRoutePage() {
  return <OvertimeSelfPage />;
}
