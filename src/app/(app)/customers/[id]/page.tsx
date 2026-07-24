"use client";

import { use } from "react";

import CustomerDetailPage from "@/components/masters/customers/CustomerDetailPage";

type CustomerDetailRoutePageProps = {
  params: Promise<{ id: string }>;
};

export default function CustomerDetailRoutePage({
  params,
}: CustomerDetailRoutePageProps) {
  const { id } = use(params);
  return <CustomerDetailPage id={id} />;
}
