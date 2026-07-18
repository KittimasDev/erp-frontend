"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import UserManagementPage from "@/components/users/UserManagementPage";

export default function UsersRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <UserManagementPage />
    </Suspense>
  );
}
