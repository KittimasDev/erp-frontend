"use client";

import { use } from "react";

import WarehouseFormPage from "@/components/masters/warehouses/WarehouseFormPage";

type EditWarehouseRoutePageProps = {
  params: Promise<{ id: string }>;
};

export default function EditWarehouseRoutePage({
  params,
}: EditWarehouseRoutePageProps) {
  const { id } = use(params);
  return <WarehouseFormPage mode="edit" warehouseId={id} />;
}
