"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import ProfilePage from "@/components/profile/ProfilePage";

export default function ProfileRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProfilePage />
    </Suspense>
  );
}
