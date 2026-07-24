"use client";

import { use } from "react";

import CustomerFormPage from "@/components/masters/customers/CustomerFormPage";

type EditCustomerRoutePageProps = {
  params: Promise<{ id: string }>;
};

export default function EditCustomerRoutePage({
  params,
}: EditCustomerRoutePageProps) {
  const { id } = use(params);
  return <CustomerFormPage mode="edit" customerId={id} />;
}
