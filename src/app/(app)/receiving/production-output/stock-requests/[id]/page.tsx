import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/** ย้ายไปโมดูลการผลิตแล้ว — คงเส้นทางเดิมไว้กัน bookmark / ลิงก์เก่าพัง */
export default async function LegacyReceivingProductionOutputDetailPage({
  params,
}: Props) {
  const { id } = await params;
  permanentRedirect(`/production/output-stock-requests/${id}`);
}
