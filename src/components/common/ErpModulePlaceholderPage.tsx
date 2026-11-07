"use client";

import PlaceholderPage from "./PlaceholderPage";

import { useT } from "@/lib/i18n/useT";

type Props = {
  module: string;
  title: string;
};

export default function ErpModulePlaceholderPage({ module, title }: Props) {
  const t = useT();
  return (
    <PlaceholderPage
      eyebrow={module}
      title={title}
      description={t("อยู่ระหว่างพัฒนา — เมนูและสิทธิ์ใน Permission Matrix พร้อมแล้ว")}
    />
  );
}
