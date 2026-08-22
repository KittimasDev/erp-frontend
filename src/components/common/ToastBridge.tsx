"use client";

import { App } from "antd";
import { useEffect } from "react";

import { setErrorToast } from "@/lib/ui/toast-bridge";

/**
 * ลงทะเบียน message ของ antd ให้โค้ดนอก React ใช้ได้ (ดู lib/ui/toast-bridge)
 * ไม่เรนเดอร์อะไร
 */
export default function ToastBridge() {
  const { message } = App.useApp();

  useEffect(() => {
    setErrorToast((content) => message.error(content));
    return () => setErrorToast(null);
  }, [message]);

  return null;
}
