"use client";

import { useEffect } from "react";

/**
 * ช่องตัวเลขทั้งระบบ (antd InputNumber และ <input type="number">) รับได้เฉพาะตัวเลข
 * — กันตัวอักษร ภาษาไทย e/E และ + ที่พิมพ์/วางเข้ามา · เครื่องหมาย "-" ใช้ได้เฉพาะช่องที่ min ติดลบหรือไม่ได้ตั้ง min
 * ทำที่เดียวระดับเอกสาร จึงครอบคลุมทุกหน้าโดยไม่ต้องแก้ทีละช่อง
 */
const NUMERIC_SELECTOR = "input.ant-input-number-input, input[type='number']";

function numericTarget(event: Event): HTMLInputElement | null {
  const el = event.target;
  if (!(el instanceof HTMLInputElement)) return null;
  return el.matches(NUMERIC_SELECTOR) ? el : null;
}

function allowsNegative(input: HTMLInputElement): boolean {
  const raw = input.getAttribute("aria-valuemin") ?? input.getAttribute("min");
  if (raw == null || raw === "") return true;
  const min = Number(raw);
  return Number.isNaN(min) || min < 0;
}

/** ตัดตัวที่ไม่ใช่ตัวเลขออก — คงจุดทศนิยมไว้ตัวเดียว และ "-" เฉพาะหน้าสุด */
function sanitize(text: string, input: HTMLInputElement): string {
  const negative = allowsNegative(input);
  let out = "";
  let dot = false;
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !dot) {
      dot = true;
      out += ch;
    } else if (ch === "-" && negative && out === "") out += ch;
    // ลูกน้ำคั่นหลักพันที่วางมา (1,000) ถูกตัดทิ้ง เหลือ 1000
  }
  return out;
}

export default function NumericInputGuard() {
  useEffect(() => {
    const onBeforeInput = (event: InputEvent) => {
      const input = numericTarget(event);
      if (!input) return;
      // เฉพาะการพิมพ์/วางข้อความ — ลบ/undo ปล่อยผ่าน
      if (event.inputType !== "insertText" && event.inputType !== "insertFromPaste") return;
      if (event.data == null) return; // วางผ่าน paste event ด้านล่าง
      if (sanitize(event.data, input) !== event.data) event.preventDefault();
    };

    const onPaste = (event: ClipboardEvent) => {
      const input = numericTarget(event);
      if (!input) return;
      const text = event.clipboardData?.getData("text") ?? "";
      const clean = sanitize(text, input);
      if (clean === text) return;
      event.preventDefault();
      if (clean) document.execCommand("insertText", false, clean);
    };

    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("paste", onPaste, true);
    return () => {
      document.removeEventListener("beforeinput", onBeforeInput, true);
      document.removeEventListener("paste", onPaste, true);
    };
  }, []);

  return null;
}
