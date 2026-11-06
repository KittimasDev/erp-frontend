"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { App, Button, Space, Tooltip } from "antd";
import { CameraOutlined, PictureOutlined } from "@ant-design/icons";

import { useT } from "@/lib/i18n/useT";
import { optimizeOcrImageFile } from "@/utils/optimizeOcrImageFile";

import CameraCaptureModal from "./CameraCaptureModal";
import OcrScanProgressOverlay from "./OcrScanProgressOverlay";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  disabled?: boolean;
  /** true ระหว่างที่ฝั่งเรียกกำลังยิง API อ่านใบชั่ง */
  pending?: boolean;
  /** ข้อความบนปุ่ม — หน้ารายการใช้ว่า "เปิดตั๋วจากรูปใบชั่ง" หน้าคัดแยกใช้ค่าเริ่มต้น */
  label?: string;
  onScan: (file: File, previewUrl: string) => void;
};

/**
 * เบราว์เซอร์นี้เปิดกล้องในแอปได้ไหม
 *
 * `getUserMedia` มีเฉพาะบน secure context (HTTPS หรือ localhost) — เปิดผ่าน LAN แบบ http
 * จะไม่มีให้ใช้ ต้องถอยไปใช้ `<input capture>` ซึ่งบนมือถือจะเรียกแอปกล้องของเครื่องให้อยู่ดี
 *
 * เช็คตอนกดปุ่ม ไม่ใช่ตอน render — การอ่านค่าจาก environment ระหว่าง render ผิดกฎ purity ของโปรเจกต
 */
function canUseInAppCamera(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/**
 * ปุ่มถ่ายรูปใบชั่ง
 *
 * ปุ่มกล้องเปิด **กล้องจริงในแอป** (`getUserMedia`) จึงถ่ายได้ทั้งเว็บแคมบนคอมและกล้องมือถือ
 * ของเดิมใช้แค่ `<input capture="environment">` ซึ่งเดสก์ท็อปเบราว์เซอร์เมินทิ้ง
 * ทำให้บนคอมทั้งสองปุ่มเปิดหน้าต่างเลือกไฟล์เหมือนกัน เหมือนไม่มีทางถ่ายรูป
 * เปิดกล้องในแอปไม่ได้ (เช่นรันผ่าน LAN แบบ http) จะถอยไปใช้ input ตัวเดิมให้อัตโนมัติ
 *
 * ไม่ใช้ AntD Upload เพราะมันไม่ส่งต่อ attribute `capture`
 *
 * ปุ่มนี้เป็นเจ้าของ **ทั้งช่วงเวลารอ** ตั้งแต่เลือกรูปจนอ่านเสร็จ ไม่ใช่แค่ช่วงยิง API
 * เพราะช่วงเตรียมรูปกินเวลาหลายวินาทีบนมือถือและเดิมไม่มีอะไรบอกผู้ใช้เลย
 * ทำที่นี่ที่เดียวได้ครบทั้งหน้ารายการและหน้าคัดแยก เพราะสองหน้านั้นส่ง `pending` เข้ามาอยู่แล้ว
 */
export default function WeighTicketOcrCaptureButton({
  disabled,
  pending,
  label,
  onScan,
}: Props) {
  const { message } = App.useApp();
  const t = useT();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [preparing, setPreparing] = useState(false);
  const [preparePercent, setPreparePercent] = useState(0);
  const [pickedPreviewUrl, setPickedPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const busy = preparing || Boolean(pending);

  // ปล่อยรูปตัวอย่างของรอบนี้เมื่อขึ้นรอบใหม่หรือออกจากหน้า
  useEffect(() => {
    if (!pickedPreviewUrl) {
      return;
    }
    return () => URL.revokeObjectURL(pickedPreviewUrl);
  }, [pickedPreviewUrl]);

  /** ทางเข้าเดียวของทุกแหล่งรูป — กล้องในแอป แอปกล้องของเครื่อง และการเลือกไฟล์ */
  const startScan = (file: File) => {
    if (busy) {
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      message.error(t("รองรับเฉพาะไฟล์รูป JPG, PNG หรือ WEBP"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      message.error(t("ไฟล์ใหญ่เกิน 10 MB กรุณาถ่ายใหม่"));
      return;
    }

    // โชว์รูปต้นฉบับทันที ผู้ใช้จะได้เห็นว่าระบบรับรูปแล้วตั้งแต่เสี้ยววินาทีแรก
    // ไม่ต้องรอให้เตรียมรูปเสร็จก่อน
    setPickedPreviewUrl(URL.createObjectURL(file));
    setPreparePercent(0);
    setPreparing(true);

    void (async () => {
      try {
        const prepared = await optimizeOcrImageFile(file, {
          onProgress: (ratio) => setPreparePercent(ratio * 100),
        });
        onScan(prepared, URL.createObjectURL(prepared));
      } finally {
        setPreparing(false);
      }
    })();
  };

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    // ล้างค่าทันที ไม่งั้นเลือกไฟล์ชื่อเดิมซ้ำจะไม่เกิด change event
    input.value = "";
    if (file) {
      startScan(file);
    }
  };

  const handleCameraClick = () => {
    if (canUseInAppCamera()) {
      setCameraOpen(true);
      return;
    }
    // เปิดกล้องในแอปไม่ได้ (เช่นรันผ่าน LAN แบบ http) — บนมือถือ input ตัวนี้จะเรียกแอปกล้องให้
    cameraRef.current?.click();
  };

  const handleUseNativeCamera = () => {
    setCameraOpen(false);
    cameraRef.current?.click();
  };

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handlePick}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handlePick}
      />
      <Space.Compact>
        <Button
          type="primary"
          icon={<CameraOutlined />}
          loading={busy}
          disabled={disabled || busy}
          onClick={handleCameraClick}
        >
          {label ?? t("ถ่ายรูปใบชั่ง")}
        </Button>
        <Tooltip title={t("เลือกรูปที่ถ่ายไว้แล้ว")}>
          <Button
            icon={<PictureOutlined />}
            aria-label={t("เลือกรูปใบชั่งจากเครื่อง")}
            disabled={disabled || busy}
            onClick={() => galleryRef.current?.click()}
          />
        </Tooltip>
      </Space.Compact>

      {cameraOpen ? (
        <CameraCaptureModal
          onCapture={(file) => {
            setCameraOpen(false);
            startScan(file);
          }}
          onClose={() => setCameraOpen(false)}
          onUseNativeCamera={handleUseNativeCamera}
        />
      ) : null}

      {busy ? (
        <OcrScanProgressOverlay
          stage={preparing ? "PREPARING" : "READING"}
          percent={preparePercent}
          previewUrl={pickedPreviewUrl}
        />
      ) : null}
    </>
  );
}
