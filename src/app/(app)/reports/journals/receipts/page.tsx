"use client";

import ComingSoonPage from "@/components/common/ComingSoonPage";
import { useT } from "@/lib/i18n/useT";

export default function Page() {
  const t = useT();
  return (
    <ComingSoonPage
      title={t("สมุดรายวันรับ")}
      description={t("รายการรับเงินเรียงตามวันที่ (กำลังพัฒนา)")}
    />
  );
}
