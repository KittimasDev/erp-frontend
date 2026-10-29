import { redirect } from "next/navigation";

/** รวมเข้าหน้าตารางการผลิตแล้ว — รอบผลิตจริงอยู่แท็บ "รอบผลิตจริง" */
export default function Page() {
  redirect("/production/schedule?tab=cycles");
}
