import { permanentRedirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** ย้ายไปโมดูลการผลิตแล้ว — ส่ง query เดิมไปด้วย (ticketId / productionOrderId ฯลฯ) */
export default async function LegacyReceivingProductionOutputCreatePage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      search.set(key, value[0]);
    }
  }
  const query = search.toString();
  permanentRedirect(
    `/production/output-stock-requests/create${query ? `?${query}` : ""}`,
  );
}
