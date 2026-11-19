import { redirect } from "next/navigation";

import { arRoutes } from "@/lib/sales/ar-routes";

/** เส้นทางเดิม — ใบตั้งลูกหนี้ย้ายไปอยู่ใต้เมนูการเงิน › การรับเงิน */
export default function Page() {
  redirect(arRoutes.list);
}
