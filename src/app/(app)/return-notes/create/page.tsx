"use client";

import { Suspense } from "react";
import { Spin } from "antd";

import ReturnNoteCreatePage from "@/components/return-notes/ReturnNoteCreatePage";

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <ReturnNoteCreatePage />
    </Suspense>
  );
}
