import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import T2900TicketDetailPage from "@/components/weighbridge/T2900TicketDetailPage";
import WeighbridgeTicketDetailPage from "@/components/weighbridge/WeighbridgeTicketDetailPage";
import { isErpTicketId } from "@/components/weighbridge/ticket-origin";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * หน้ารายละเอียดเดียวของรับซื้อยาง ทำงานได้ 2 แบบ
 * - UUID = ตั๋วที่เปิดแล้วใน ERP (เปิดเองหรือมาจากเครื่องชั่ง) → ขั้นตอน คัดแยก/จ่ายเงิน/เข้าคลัง + เอกสาร
 * - เลขบัตรชั่ง = บัตรจากเครื่องชั่งที่ยังไม่เปิดตั๋ว → ตรวจข้อมูลแล้วกดยืนยันเปิดตั๋ว
 *   (ถ้าบัตรนั้นเปิดตั๋วไปแล้ว หน้าบัตรจะพาไปหน้าตั๋ว ERP เอง)
 */
export default async function ReceivingTicketDetailRoutePage({
  params,
}: PageProps) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  return (
    <Suspense fallback={<PageLoading />}>
      {isErpTicketId(decoded) ? (
        <WeighbridgeTicketDetailPage ticketId={decoded} />
      ) : (
        <T2900TicketDetailPage tckNo={decoded} />
      )}
    </Suspense>
  );
}
