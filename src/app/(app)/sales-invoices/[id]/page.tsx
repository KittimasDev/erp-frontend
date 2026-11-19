import { redirect } from "next/navigation";

import { arRoutes } from "@/lib/sales/ar-routes";

/** เส้นทางเดิม (ลิงก์ในแจ้งเตือน/บุ๊กมาร์ก) — ย้ายไปอยู่ใต้เมนูการเงิน › การรับเงิน */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(arRoutes.detail(id));
}
