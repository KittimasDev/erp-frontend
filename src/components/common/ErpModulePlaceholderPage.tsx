"use client";

import PlaceholderPage from "./PlaceholderPage";

type Props = {
  module: string;
  title: string;
};

export default function ErpModulePlaceholderPage({ module, title }: Props) {
  return (
    <PlaceholderPage
      eyebrow={module}
      title={title}
      description="อยู่ระหว่างพัฒนา — เมนูและสิทธิ์ใน Permission Matrix พร้อมแล้ว"
    />
  );
}
