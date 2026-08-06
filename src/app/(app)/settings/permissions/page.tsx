import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ roleId?: string | string[] }>;
};

export default async function PermissionsRedirectPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const raw = params.roleId;
  const roleId =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  if (roleId) {
    redirect(
      `/users?tab=permissions&roleId=${encodeURIComponent(roleId)}`,
    );
  }
  redirect("/users?tab=roles");
}
