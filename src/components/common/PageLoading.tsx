"use client";

import { Spin } from "antd";

type PageLoadingProps = {
  label?: string;
};

export default function PageLoading({
  label = "กำลังโหลด...",
}: PageLoadingProps) {
  return (
    <div className="pageLoading" role="status" aria-live="polite">
      <div className="pageLoadingCard">
        <Spin size="large" />
        <p className="pageLoadingLabel">{label}</p>
      </div>
    </div>
  );
}
