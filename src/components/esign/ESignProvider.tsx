"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  registerESignRequester,
  type ESignGrant,
  type ESignRequest,
  ESignCancelledError,
} from "@/lib/esign/esign-gate";

import ESignModal from "./ESignModal";

type QueueItem = {
  id: number;
  request: ESignRequest;
  resolve: (grant: ESignGrant) => void;
  reject: (error: unknown) => void;
};

/**
 * ติดตั้งครั้งเดียวใน root layout — ลงทะเบียน requester ให้ apiFetch
 * แสดง modal ทีละอัน (คิวตาม screenCode ที่ต่างกัน); screenCode เดียวกันถูกรวมที่ esign-gate แล้ว
 */
export default function ESignProvider() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const nextId = useRef(0);

  const requester = useCallback(
    (request: ESignRequest) =>
      new Promise<ESignGrant>((resolve, reject) => {
        nextId.current += 1;
        const item: QueueItem = {
          id: nextId.current,
          request,
          resolve,
          reject,
        };
        setQueue((prev) => [...prev, item]);
      }),
    [],
  );

  useEffect(() => {
    registerESignRequester(requester);
    return () => registerESignRequester(null);
  }, [requester]);

  const current = queue[0];

  const finish = (id: number) =>
    setQueue((prev) => prev.filter((item) => item.id !== id));

  if (!current) return null;

  return (
    <ESignModal
      key={current.id}
      request={current.request}
      onSuccess={(grant) => {
        current.resolve(grant);
        finish(current.id);
      }}
      onCancel={() => {
        current.reject(new ESignCancelledError());
        finish(current.id);
      }}
      onFatal={(error) => {
        current.reject(error);
        finish(current.id);
      }}
    />
  );
}
