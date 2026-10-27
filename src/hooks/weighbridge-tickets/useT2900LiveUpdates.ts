"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth/token";
import { t2900OutboundTicketsQueryKey } from "./useT2900OutboundTicketsQuery";
import { t2900TicketDetailQueryKey } from "./useT2900TicketDetailQuery";

const EVENTS_URL = "/api/weighbridge/t2900/events";
/** ระหว่างที่สตรีมหลุด ดึงรายการซ้ำช้าๆ กันตกหล่น (เมื่อสตรีมต่อติดแล้วหยุด) */
const FALLBACK_REFRESH_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

type LiveEvent = { type?: string };

/**
 * ฟังสัญญาณจากหลังบ้าน (SSE) — มีบัตร T2900 เข้ามาใหม่หรือมีการยืนยันรับซื้อ จะดึงรายการ/รายละเอียดใหม่ทันที
 * ใช้ fetch stream แทน EventSource เพราะต้องแนบ Authorization header
 * หลุดแล้วต่อใหม่เอง (backoff) · ระหว่างหลุดดึงซ้ำทุก 30 วินาที · ต่อติดใหม่ดึงชดเชยหนึ่งครั้ง
 */
export function useT2900LiveUpdates(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let stopped = false;
    let fallbackTimer: ReturnType<typeof setInterval> | undefined;

    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: t2900OutboundTicketsQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: t2900TicketDetailQueryKey,
      });
    };

    const startFallback = () => {
      if (!fallbackTimer) {
        fallbackTimer = setInterval(refresh, FALLBACK_REFRESH_MS);
      }
    };
    const stopFallback = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const handleChunkBlock = (block: string) => {
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) {
          continue;
        }
        try {
          const event = JSON.parse(line.slice(5).trim()) as LiveEvent;
          if (event.type === "changed") {
            refresh();
          }
        } catch {
          // ข้ามข้อความที่ parse ไม่ได้
        }
      }
    };

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        controller.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve();
        });
      });

    const run = async () => {
      let attempt = 0;
      while (!stopped) {
        try {
          const response = await fetch(EVENTS_URL, {
            headers: {
              Accept: "text/event-stream",
              Authorization: `Bearer ${getAccessToken()}`,
            },
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error(`events ${response.status}`);
          }

          attempt = 0;
          stopFallback();
          refresh(); // ชดเชยสิ่งที่พลาดไประหว่างหลุด

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() ?? "";
            for (const block of blocks) {
              handleChunkBlock(block);
            }
          }
        } catch {
          if (stopped) {
            return;
          }
        }

        if (stopped) {
          return;
        }
        startFallback();
        attempt += 1;
        await sleep(Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** attempt));
      }
    };

    void run();

    return () => {
      stopped = true;
      controller.abort();
      stopFallback();
    };
  }, [enabled, queryClient]);
}
