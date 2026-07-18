"use client";

import { use } from "react";

import WarehouseLocationFormPage from "@/components/masters/warehouse-locations/WarehouseLocationFormPage";

type EditWarehouseLocationRoutePageProps = {
  params: Promise<{ id: string }>;
};

export default function EditWarehouseLocationRoutePage({
  params,
}: EditWarehouseLocationRoutePageProps) {
  const { id } = use(params);
  return <WarehouseLocationFormPage mode="edit" locationId={id} />;
}
