"use client";

import { getScreenActionPermissions } from "@/lib/auth/permissions-access";

/**
 * สิทธิ์เข้าหน้าจอที่คิวงานนั้นอยู่ — ใช้เป็น `canAccess` ของ badge
 *
 * มีไว้เพื่อไม่ให้ต้องเขียน `isAdministrator() || isMatrixPermissionMode() ...`
 * ซ้ำในทุกโมดูล · `getScreenActionPermissions` จัดการเคส admin (`*`) และเคส
 * สิทธิ์ยังโหลดไม่เสร็จให้แล้ว
 *
 * ไม่มีสิทธิ์ = ไม่ยิง request เลย กัน 403 รัว ๆ จาก badge ที่ poll ทุก 60 วิ
 */
export function canAccessBadgeScreen(...screenCodes: string[]): boolean {
  return screenCodes.some((code) => getScreenActionPermissions(code).canView);
}
