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
      title="ไม่มีสิทธิ์เข้าหน้านี้"
      subTitle={
        screenCodes?.length
          ? `ต้องการสิทธิ์หน้าจอ: ${screenCodes.join(" หรือ ")} — ตั้งค่าได้ที่ Permission Matrix`
          : "บัญชีของคุณไม่มีสิทธิ์เปิดหน้านี้อ้างอิง Permission Matrix"
      }
      extra={
        <Button
          type="primary"
          onClick={() => {
            clearActivePortalModule();
            router.replace("/");
          }}
        >
          กลับหน้าแรก
        </Button>
      }
    />
  );
}
