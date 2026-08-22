import { redirect } from "next/navigation";

export default function UserAliasRedirectPage() {
  // /user (เอกพจน์) = ของฉัน → หน้าโปรไฟล์ ซึ่งทุกคนเข้าได้
  redirect("/profile");
}
