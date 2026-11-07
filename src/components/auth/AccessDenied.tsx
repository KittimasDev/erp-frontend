"use client";

import { Button, Result } from "antd";
import { useRouter } from "next/navigation";

import { clearActivePortalModule } from "@/lib/auth/portal-module";
import { useT } from "@/lib/i18n/useT";

type AccessDeniedProps = {
  screenCodes?: string[] | null;
};

export default function AccessDenied({ screenCodes }: AccessDeniedProps) {
  const router = useRouter();
  const t = useT();

  return (
    <Result
      status="403"
      title={t("ไม่สามารถเข้าถึงหน้านี้ได้")}
      subTitle={
        screenCodes?.length
          ? t("บัญชีของคุณยังไม่ได้รับสิทธิ์สำหรับหน้าจอ: {screens} — ตั้งค่าได้ที่ Permission Matrix", { screens: screenCodes.join(` ${t("หรือ")} `) })
          : t("บัญชีของคุณยังไม่ได้รับสิทธิ์เปิดหน้านี้ — ตั้งค่าได้ที่ Permission Matrix")
      }
      extra={
        <Button
          type="primary"
          onClick={() => {
            clearActivePortalModule();
            router.replace("/");
          }}
        >
          {t("ย้อนกลับ")}
        </Button>
      }
    />
  );
}
