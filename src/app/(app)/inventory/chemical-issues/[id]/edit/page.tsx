"use client";

import { use } from "react";

import ChemicalIssueFormPage from "@/components/chemical-issues/ChemicalIssueFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ChemicalIssueFormPage mode="edit" id={id} />;
}
