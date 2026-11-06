"use client";

import { useEffect, useState } from "react";
import { Modal, Progress, Spin, Typography } from "antd";

import { useT } from "@/lib/i18n/useT";

import styles from "./ocr-capture.module.css";

/**
 * การ์ดบอกสถานะระหว่างอ่านใบชั่งจากรูป
 *
 * ต้องขึ้น **ตั้งแต่วินาทีที่ผู้ใช้เลือกรูป** ไม่ใช่ตอนยิง API — ช่วงเตรียมรูปบนมือถือ
 * กินเวลาหลายวินาทีและเดิมไม่มีอะไรบอกเลย ผู้ใช้จึงคิดว่ากดไม่ติด
 *
 * ไม่ใช้ `PageLoading` / `MasterPageGate` เพราะสองตัวนั้นซ่อนทั้งหน้า
 * ทำให้ไม่เห็นรูปที่เพิ่งถ่าย ซึ่งเป็นตัวยืนยันที่ชัดที่สุดว่าระบบรับรูปไปแล้ว
 */

export type OcrScanStage = "PREPARING" | "READING";

type Props = {
  stage: OcrScanStage;
  /** เปอร์เซ็นต์จริงของขั้นเตรียมรูป (0-100) — ขั้นอ่านไม่รู้เปอร์เซ็นต์ */
  percent?: number;
  previewUrl?: string | null;
};

const STAGE_LABEL: Record<OcrScanStage, string> = {
  PREPARING: "กำลังเตรียมรูป...",
  READING: "กำลังอ่านใบชั่ง...",
};

/** เกินเท่านี้ถือว่านานผิดปกติ ต้องบอกผู้ใช้ว่ายังทำงานอยู่ ไม่ได้ค้าง */
const SLOW_AFTER_SECONDS = 20;

export default function OcrScanProgressOverlay({
  stage,
  percent,
  previewUrl,
}: Props) {
  const t = useT();
  // component นี้ถูก mount ใหม่ทุกครั้งที่เริ่มสแกนรอบใหม่ (ฝั่งเรียก render แบบมีเงื่อนไข)
  // นาฬิกาจึงเริ่มที่ 0 เองโดยไม่ต้องรีเซ็ต และไม่ต้องอ่านเวลาปัจจุบันตอน render
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Modal
      open
      centered
      width={400}
      footer={null}
      closable={false}
      mask={{ closable: false }}
      keyboard={false}
      title={null}
    >
      <div role="status" aria-live="polite" className={styles.scanCard}>
        {previewUrl ? (
          // รูปมาจาก blob ในเครื่อง ไม่ต้องโหลดกลับจาก server
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={t("รูปใบชั่งที่เพิ่งเลือก")}
            className={styles.scanThumb}
          />
        ) : null}

        <Spin size="large" />

        <p className={styles.scanStage}>{t(STAGE_LABEL[stage])}</p>

        <Progress
          percent={stage === "PREPARING" ? Math.round(percent ?? 0) : 100}
          status="active"
          showInfo={stage === "PREPARING"}
          size="small"
        />

        <Typography.Text type="secondary" className={styles.scanElapsed}>
          {t("ผ่านไป {elapsed} วินาที · ปกติใช้เวลา 5-15 วินาที", { elapsed })}
        </Typography.Text>

        {elapsed >= SLOW_AFTER_SECONDS ? (
          <p className={styles.scanSlow}>
            {t("ใช้เวลานานกว่าปกติ ระบบยังทำงานอยู่ กรุณารอสักครู่")}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
