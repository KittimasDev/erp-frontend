"use client";

import { Spin } from "antd";

import { useT } from "@/lib/i18n/useT";

type PageLoadingProps = {
  label?: string;
};

export default function PageLoading({
  label = "กำลังโหลด...",
}: PageLoadingProps) {
  const t = useT();
  return (
    <div className="pageLoading" role="status" aria-live="polite">
      <div className="pageLoadingCard">
        <Spin size="large" />
        <p className="pageLoadingLabel">{t(label)}</p>
      </div>
    </div>
  );
}
