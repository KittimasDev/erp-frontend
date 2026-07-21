"use client";

import { use } from "react";

import MaterialIssueFormPage from "@/components/material-issues/MaterialIssueFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <MaterialIssueFormPage mode="edit" id={id} />;
}
