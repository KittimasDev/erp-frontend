"use client";

import ErpModulePlaceholderPage from "@/components/common/ErpModulePlaceholderPage";
import { useT } from "@/lib/i18n/useT";

export default function Page() {
  const t = useT();
  return (
    <ErpModulePlaceholderPage
      module={t("คลังวัตถุดิบ")}
      title={t("เบิกยางเข้ากระบวนการเตรียมยาง")}
    />
  );
}
