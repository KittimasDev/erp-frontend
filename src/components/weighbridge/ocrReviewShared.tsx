"use client";

import type { ReactNode } from "react";
import { Alert, Empty, Tag, Tooltip } from "antd";
import { ScanOutlined } from "@ant-design/icons";

import { ERP_TIMEZONE } from "@/lib/datetime/erp-timezone";

import styles from "./ocr-capture.module.css";

/**
 * ของที่ popup ของ OCR ทั้งสองตัวใช้ร่วมกัน
 * (เติมค่าลงตั๋วที่เปิดอยู่ กับ เปิดตั๋วใหม่จากรูป) — หน้าตาต้องเหมือนกัน
 */

/** เกณฑ์สีและการติ๊กให้อัตโนมัติ — ต่ำกว่า LOW ถือว่าเชื่อไม่ได้ ผู้ใช้ต้องติ๊กเอง */
export const CONFIDENCE_GOOD = 0.85;
export const CONFIDENCE_LOW = 0.6;

export function formatWeight(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} กก.`;
}

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} บาท`;
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: ERP_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/**
 * ป้ายความเชื่อมั่นของค่าที่อ่านมา
 *
 * `hideWhenGood` ใช้ในฟอร์มที่มีหลายสิบช่อง — ป้ายเขียวที่โผล่ทุกช่องไม่ได้บอกอะไรเพิ่ม
 * แต่ทำให้ตาไล่หาช่องที่ต้องตรวจจริง ๆ ไม่เจอ ค่าที่อ่านมาดีคือเรื่องปกติ ไม่ต้องประกาศ
 */
export function ConfidenceTag({
  confidence,
  hideWhenGood,
}: {
  confidence: number;
  hideWhenGood?: boolean;
}) {
  const percent = Math.round(confidence * 100);
  if (confidence >= CONFIDENCE_GOOD) {
    return hideWhenGood ? null : <Tag color="green">{percent}%</Tag>;
  }
  if (confidence >= CONFIDENCE_LOW) {
    return <Tag color="orange">{percent}%</Tag>;
  }
  return (
    <Tooltip title="ความเชื่อมั่นต่ำ ระบบไม่ติ๊กให้ ตรวจกับใบจริงก่อนใช้">
      <Tag color="red">{percent}%</Tag>
    </Tooltip>
  );
}

/* ── ชิ้นส่วนหน้าตาที่ popup ทั้งสองใช้ร่วมกัน ─────────────────────────────── */

/** หัว modal สีเข้ม — สำนวนเดียวกับ modal ของหน้า master data ทั้งระบบ */
export function OcrModalHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={styles.modalHeader}>
      <span className={styles.modalIcon}>
        <ScanOutlined />
      </span>
      <div className={styles.modalHeadText}>
        <div className={styles.modalEyebrow}>อ่านจากรูปใบชั่ง</div>
        <h2 className={styles.modalTitle}>{title}</h2>
        {subtitle ? (
          <span className={styles.modalSubtitle}>{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}

/** การ์ดหนึ่งหมวดของฟอร์ม — หัวข้อมีแถบเขียวนำหน้าเหมือนหัวข้อในหน้าอื่น */
export function OcrSection({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.ocrSection}>
      <h3 className={styles.ocrSectionTitle}>
        {title}
        {extra}
      </h3>
      {children}
    </section>
  );
}

/**
 * หนึ่งช่องในฟอร์ม — คืนสองก้อนติดกันโดยไม่มี wrapper
 * เพราะ label กับ control ต้องเป็นลูกโดยตรงของ grid `.ocrField` ถึงจะเรียงคอลัมน์ตรงกันทั้งการ์ด
 */
export function OcrField({
  label,
  confidence,
  children,
}: {
  label: ReactNode;
  /** ใส่แล้วจะมีป้ายเตือนต่อท้ายชื่อช่อง เฉพาะตอนที่อ่านมาไม่มั่นใจ */
  confidence?: number;
  children: ReactNode;
}) {
  return (
    <>
      <div className={styles.ocrFieldLabel}>
        {label}
        {confidence === undefined ? null : (
          <ConfidenceTag confidence={confidence} hideWhenGood />
        )}
      </div>
      <div>{children}</div>
    </>
  );
}

/**
 * กล่องเตือนใบเดียวรวมทุกเรื่อง
 *
 * ของเดิมเป็น Alert ซ้อนกันได้ถึงสามใบ กินพื้นที่บนสุดจนไม่เห็นฟอร์ม
 * และเมื่อทุกใบมีกรอบสีของตัวเอง ตาจะอ่านว่า "มีปัญหาสามเรื่องที่ไม่เกี่ยวกัน"
 * ทั้งที่จริงคือรายการสิ่งที่ต้องตรวจก่อนกดยืนยัน
 */
export function OcrNotice({
  messages,
  type = "warning",
}: {
  messages: string[];
  type?: "warning" | "error";
}) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <Alert
      type={type}
      showIcon
      title={
        messages.length === 1 ? (
          messages[0]
        ) : (
          <ul className={styles.ocrNoticeList}>
            {messages.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        )
      }
    />
  );
}

/** คอลัมน์ซ้ายของ popup — รูปที่ถ่ายมา กับสรุปว่าอ่านได้ดีแค่ไหน */
export function OcrPreviewPane({
  previewUrl,
  rows,
}: {
  previewUrl: string | null;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <aside className={styles.ocrPreview}>
      {previewUrl ? (
        // รูปมาจาก blob ในเครื่อง ไม่ต้องโหลดกลับจาก server
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="รูปใบชั่งที่ถ่ายมา" />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="ไม่มีรูปตัวอย่าง"
        />
      )}
      <div>
        {rows.map((row) => (
          <div key={row.label} className={styles.ocrMetaRow}>
            <span className={styles.ocrMetaLabel}>{row.label}</span>
            <span className={styles.ocrMetaValue}>{row.value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
