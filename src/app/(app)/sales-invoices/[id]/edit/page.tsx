import { redirect } from "next/navigation";

import { arRoutes } from "@/lib/sales/ar-routes";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(arRoutes.edit(id));
}
