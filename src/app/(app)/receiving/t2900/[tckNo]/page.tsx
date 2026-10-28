import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ tckNo: string }>;
};

/** ลิงก์เดิมของหน้าบัตร T2900 — รวมเป็นหน้า /receiving/[id] แล้ว พาไปหน้าเดียวกัน */
export default async function ReceivingT2900TicketRedirectPage({
  params,
}: PageProps) {
  const { tckNo } = await params;
  redirect(`/receiving/${tckNo}`);
}
