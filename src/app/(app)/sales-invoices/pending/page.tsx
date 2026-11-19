import { redirect } from "next/navigation";

import { arRoutes } from "@/lib/sales/ar-routes";

/** เส้นทางเดิม — ย้ายไปอยู่ใต้เมนูการเงิน › การรับเงิน */
export default function Page() {
  redirect(arRoutes.pending);
}
