"use client";

import { use } from "react";

import MaterialIssueDetailPage from "@/components/material-issues/MaterialIssueDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <MaterialIssueDetailPage id={id} />;
}
