import { redirect } from "next/navigation";

export default function UserAliasRedirectPage() {
  // /user (เอกพจน์) = ของฉัน → แท็บลายเซ็นของฉัน ซึ่งทุกคนเข้าได้
  redirect("/users?tab=signature");
}
