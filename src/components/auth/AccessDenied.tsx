"use client";

import { Button, Result } from "antd";
import { useRouter } from "next/navigation";

import { clearActivePortalModule } from "@/lib/auth/portal-module";

type AccessDeniedProps = {
  screenCodes?: string[] | null;
};

export default function AccessDenied({ screenCodes }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <Result
      status="403"
      title="ไม่สามารถเข้าถึงหน้านี้ได้"
      subTitle={
        screenCodes?.length
          ? `บัญชีของคุณยังไม่ได้รับสิทธิ์สำหรับหน้าจอ: ${screenCodes.join(" หรือ ")} — ตั้งค่าได้ที่ Permission Matrix`
          : "บัญชีของคุณยังไม่ได้รับสิทธิ์เปิดหน้านี้ — ตั้งค่าได้ที่ Permission Matrix"
      }
      extra={
        <Button
          type="primary"
          onClick={() => {
            clearActivePortalModule();
            router.replace("/");
          }}
        >
          ย้อนกลับ
        </Button>
      }
    />
  );
}
