"use client";

import { useMemo, useSyncExternalStore } from "react";

import { PERMISSIONS_UPDATED_EVENT } from "@/lib/auth/permissions-access";
import type { StoredUser } from "@/lib/auth/session";

const STORAGE_KEY = "user";

/**
 * อ่านผู้ใช้ที่ login จาก localStorage แบบ subscribe
 *
 * ใช้ `useSyncExternalStore` ไม่ใช่ `setState` ใน effect — localStorage เป็น
 * external store การ subscribe จึงตรงกับที่ React ออกแบบไว้ และไม่ชนกฎ
 * `react-hooks/set-state-in-effect`
 *
 * `getSnapshot` คืน **string ดิบ** เพราะต้องเป็นค่าที่เท่ากันได้ด้วย `===`
 * ถ้าคืน object ที่ parse ใหม่ทุกครั้ง React จะ re-render วนไม่จบ
 */
function subscribe(onChange: () => void) {
  window.addEventListener(PERMISSIONS_UPDATED_EVENT, onChange);
  // storage event ยิงข้ามแท็บ — login/logout อีกแท็บแล้วแท็บนี้ตามด้วย
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PERMISSIONS_UPDATED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** ตอน SSR ยังไม่มี localStorage — คืน null กัน hydration mismatch */
function getServerSnapshot(): string | null {
  return null;
}

export function useStoredUser(): StoredUser | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }, [raw]);
}
