"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Alert,
  Button,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { CameraOutlined, RedoOutlined } from "@ant-design/icons";

import styles from "./ocr-capture.module.css";

/**
 * กล้องถ่ายใบชั่งในแอป
 *
 * ทำไมต้องมี: `<input capture="environment">` ที่ใช้อยู่เดิม **เดสก์ท็อปเบราว์เซอร์เมินทิ้ง**
 * ทั้งปุ่มกล้องและปุ่มเลือกไฟล์จึงเปิดหน้าต่างเลือกไฟล์เหมือนกัน กลายเป็นว่าบนคอมไม่มีทางถ่ายรูปได้เลย
 * ตัวนี้ใช้ `getUserMedia` จึงถ่ายได้จริงทั้งเว็บแคมบนคอมและกล้องมือถือ
 *
 * ข้อจำกัด: `getUserMedia` ทำงานเฉพาะ secure context (HTTPS หรือ localhost)
 * เปิดผ่าน LAN แบบ http จะใช้ไม่ได้ — ฝั่งเรียกต้องถอยไปใช้ input ตัวเดิมแทน
 */

type Props = {
  onCapture: (file: File) => void;
  onClose: () => void;
  /** ให้ผู้ใช้สลับไปใช้แอปกล้องของเครื่องแทน (มือถือมักได้ภาพคมกว่า) */
  onUseNativeCamera?: () => void;
};

/** กล้องที่เลือกไว้ล่าสุด — จำไว้เพื่อไม่ต้องมาเลือกใหม่ทุกครั้งที่เปิดกล้อง */
const STORED_DEVICE_KEY = "weigh-ticket-ocr-camera-device-id";
/** แนวกระดาษที่เลือกไว้ล่าสุด — หน้างานหนึ่งที่มักใช้ใบแบบเดียวซ้ำ ๆ */
const STORED_ORIENTATION_KEY = "weigh-ticket-ocr-guide-orientation";

type Orientation = "PORTRAIT" | "LANDSCAPE" | "TOP_STRIP";

/**
 * A4 = 210×297 มม. — ใบรับสินค้าที่ใช้จริงเป็นแนวตั้ง ส่วนใบชั่ง dot-matrix แบบแถบยาวเป็นแนวนอน
 *
 * `TOP_STRIP` = ครึ่งบนของ A4 แนวตั้ง (210×100 มม.) สำหรับใบที่ค่าสำคัญกระจุกอยู่ส่วนหัว
 *
 * ทำไมต้องมี: กรอบถูกย่อให้พอดี**ด้านที่แคบกว่า**ของเฟรมเสมอ กรอบแนวตั้งในเฟรม 16:9
 * จึงใช้ความกว้างได้แค่ `frameH × 0.707` — บนเว็บแคม 1280×720 เหลือรูปจริงแค่ ~496×702
 * แถบกว้างสัดส่วน 2.1 กินความกว้างได้เต็ม ได้ ~1248×594 คือพิกเซลมากกว่าเดิม 2.1 เท่า
 * บนกล้องความละเอียดต่ำ การเลือกกรอบให้พอดีกับสิ่งที่จะอ่านจึงสำคัญกว่าอย่างอื่น
 */
const GUIDE_RATIO: Record<Orientation, number> = {
  PORTRAIT: 210 / 297,
  LANDSCAPE: 297 / 210,
  TOP_STRIP: 210 / 100,
};

function readOrientation(): Orientation {
  const stored = readStored(STORED_ORIENTATION_KEY);
  return stored === "LANDSCAPE" || stored === "TOP_STRIP" ? stored : "PORTRAIT";
}

/** กรอบกินพื้นที่เฟรมเท่าไร — เหลือขอบไว้ให้เห็นว่ายังมีที่ว่างรอบใบ */
const GUIDE_FILL = 0.92;
/** ครอบตัดเผื่อออกนอกกรอบอีกนิด กันคนถ่ายจัดไม่พอดีแล้วตัวหนังสือริมใบหาย */
const CROP_BLEED = 0.03;

/**
 * ความละเอียดสตรีมที่ขอจากกล้อง — ขอสูงไว้ เพราะเราทิ้งพิกเซลไปเยอะตอนครอบตัด
 *
 * กรอบ A4 แนวตั้งในเฟรมแนวนอนกินความกว้างได้แค่ `frameH × 0.707 × GUIDE_FILL` เท่านั้น
 * ขอ 1920×1080 จะเหลือรูปจริงแค่ ~745×1053 ซึ่งเล็กกว่าใบตัวอย่างที่วัดได้ 8/8 (1063×1539)
 * เกินครึ่งเมื่อคิดเป็นพื้นที่ — ตัวเลข dot-matrix เหลือเส้นละ 2-3 พิกเซล tesseract อ่านไม่ออก
 * เคยเจอจริง: ถ่ายด้วย S22 แล้วอ่านไม่ได้เลย ทั้งที่กล้องถ่าย 50MP ได้
 *
 * ขอ 4K แทนจะได้รูปครอบแล้ว ~1489×2106 คือละเอียดกว่าใบตัวอย่างที่จูนมา
 *
 * ใช้ `ideal` ไม่ใช่ `exact` — กล้องที่ทำ 4K ไม่ได้ (เว็บแคมคอมส่วนใหญ่) จะคืนค่าที่ใกล้ที่สุด
 * ให้เองโดยไม่ error ส่วน `MAX_EDGE_PX` ในขั้นเตรียมรูปเป็นเพดานกันไฟล์บวมอยู่แล้ว
 */
const CAPTURE_RESOLUTION = {
  width: { ideal: 3840 },
  height: { ideal: 2160 },
} as const;

type Rect = { x: number; y: number; width: number; height: number };

/** กรอบสัดส่วน `ratio` ที่ใหญ่ที่สุดซึ่งวางกลางเฟรมขนาด frameW×frameH ได้ */
function guideRect(frameW: number, frameH: number, ratio: number): Rect {
  const width = Math.min(frameW, frameH * ratio) * GUIDE_FILL;
  const height = width / ratio;
  return {
    x: (frameW - width) / 2,
    y: (frameH - height) / 2,
    width,
    height,
  };
}

/** ขยายกรอบออกด้านละ CROP_BLEED แล้วหนีบไม่ให้ล้นเฟรม */
function withBleed(rect: Rect, frameW: number, frameH: number): Rect {
  const padX = rect.width * CROP_BLEED;
  const padY = rect.height * CROP_BLEED;
  const x = Math.max(0, rect.x - padX);
  const y = Math.max(0, rect.y - padY);
  return {
    x,
    y,
    width: Math.min(frameW - x, rect.width + padX * 2),
    height: Math.min(frameH - y, rect.height + padY * 2),
  };
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // เบราว์เซอร์ปิด storage ไว้ก็ไม่เป็นไร แค่ต้องเลือกใหม่ทุกครั้ง
  }
}

function forgetStoredDeviceId(): void {
  try {
    window.localStorage.removeItem(STORED_DEVICE_KEY);
  } catch {
    // เหมือนข้างบน — ไม่มี storage ก็ไม่มีอะไรต้องลืม
  }
}

function describeCameraError(error: unknown): string {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง กรุณากดอนุญาตแล้วลองใหม่";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "ไม่พบกล้องบนเครื่องนี้";
  }
  if (name === "NotReadableError") {
    return "กล้องถูกโปรแกรมอื่นใช้งานอยู่ กรุณาปิดโปรแกรมนั้นแล้วลองใหม่";
  }
  return "เปิดกล้องไม่สำเร็จ กรุณาลองใหม่หรือเลือกรูปจากเครื่องแทน";
}

export default function CameraCaptureModal({
  onCapture,
  onClose,
  onUseNativeCamera,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  /** กล้องที่ผู้ใช้เลือกเอง — undefined = ให้เบราว์เซอร์เลือกตามความเหมาะสม */
  const [deviceId, setDeviceId] = useState<string | undefined>();
  /** กล้องที่กำลังสตรีมอยู่จริง ใช้เป็นค่าที่โชว์ในรายการเลือก */
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  // เปลี่ยนค่านี้เพื่อสั่งเปิดกล้องใหม่ — กรณีผู้ใช้เพิ่งไปกดอนุญาตในเบราว์เซอร์
  const [retryKey, setRetryKey] = useState(0);
  const shotFileRef = useRef<File | null>(null);

  // อ่านค่าที่จำไว้ครั้งเดียวตอน mount — อ่านตอน render ผิดกฎ purity ของโปรเจกต
  const [orientation, setOrientation] = useState<Orientation>(readOrientation);
  /** ขนาดภาพจริงจากกล้อง — รู้ตอน metadata มาถึง ไม่ใช่ตอนเปิดสตรีม */
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(
    null,
  );

  // เปิดกล้องที่เลือก และปิด track ทุกตัวตอนออก
  // (ไม่ปิด = ไฟกล้องยังติดค้างหลังปิด modal)
  useEffect(() => {
    let cancelled = false;
    let started: MediaStream | null = null;

    const start = async () => {
      // ครั้งแรกใช้กล้องที่เคยเลือกไว้ ถ้าไม่มีก็ขอกล้องหลังไว้ก่อน (สำคัญกับมือถือ)
      const wanted = deviceId ?? readStored(STORED_DEVICE_KEY) ?? undefined;
      try {
        let media: MediaStream;
        try {
          media = await navigator.mediaDevices.getUserMedia({
            video: {
              // ต้องเป็น `exact` เท่านั้น — `ideal` สำหรับ deviceId เป็นแค่คำแนะนำ
              // Chrome มักเมินแล้วคืนกล้องตัวเดิม ทำให้เลือกกล้องในรายการแล้วภาพไม่เปลี่ยน
              ...(wanted
                ? { deviceId: { exact: wanted } }
                : { facingMode: { ideal: "environment" } }),
              ...CAPTURE_RESOLUTION,
            },
            audio: false,
          });
        } catch (cause) {
          // กล้องที่จำไว้ถูกถอดออกไปแล้ว (เช่นปลดมือถือที่ทำเป็นเว็บแคม) — ถอยไปใช้ตัวที่มี
          const name =
            typeof cause === "object" && cause !== null && "name" in cause
              ? String((cause as { name: unknown }).name)
              : "";
          const deviceGone =
            name === "OverconstrainedError" || name === "NotFoundError";
          if (!wanted || !deviceGone) {
            throw cause;
          }
          // ลืมกล้องตัวนั้นทิ้ง ไม่งั้นครั้งหน้าจะเสียเวลาลองเปิดกล้องที่ไม่มีอยู่แล้วซ้ำอีก
          forgetStoredDeviceId();
          media = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              ...CAPTURE_RESOLUTION,
            },
            audio: false,
          });
        }

        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        started = media;
        setStream(media);
        setError(null);
        // บางเบราว์เซอร์ไม่คืน deviceId ใน settings — ใช้ตัวที่ขอไปแทนเพื่อให้รายการโชว์ถูก
        setActiveDeviceId(
          media.getVideoTracks()[0]?.getSettings().deviceId ?? wanted,
        );

        // ต้องได้สิทธิ์ก่อนถึงจะเห็นชื่อกล้อง จึงอ่านรายการหลังเปิดสตรีมสำเร็จ
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setDevices(all.filter((device) => device.kind === "videoinput"));
        }
      } catch (cause) {
        if (!cancelled) {
          setError(describeCameraError(cause));
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      started?.getTracks().forEach((track) => track.stop());
    };
  }, [deviceId, retryKey]);

  // ผูกสตรีมเข้ากับ <video> — แยกจาก effect ด้านบนเพราะ element พร้อมคนละจังหวะกับสตรีม
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!shotUrl) {
      return;
    }
    return () => URL.revokeObjectURL(shotUrl);
  }, [shotUrl]);

  const ratio = GUIDE_RATIO[orientation];
  const videoRatio = frame ? frame.width / frame.height : 4 / 3;
  // กรอบบนจอกับกรอบที่ครอบตัดคิดจากสูตรเดียวกัน ต่างกันแค่หน่วย (% กับพิกเซลของวิดีโอ)
  const guideStyle = ((): CSSProperties | null => {
    if (!frame) {
      return null;
    }
    const rect = guideRect(frame.width, frame.height, ratio);
    return {
      left: `${(rect.x / frame.width) * 100}%`,
      top: `${(rect.y / frame.height) * 100}%`,
      width: `${(rect.width / frame.width) * 100}%`,
      height: `${(rect.height / frame.height) * 100}%`,
    };
  })();

  const handleShoot = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      return;
    }
    const frameW = video.videoWidth;
    const frameH = video.videoHeight;
    const crop = withBleed(guideRect(frameW, frameH, ratio), frameW, frameH);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(crop.width);
    canvas.height = Math.round(crop.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    // ค่าเริ่มต้นคือ "low" ซึ่งเห็นผลตอนไฟล์ถูกย่อต่อในขั้นเตรียมรูป
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      video,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        shotFileRef.current = new File(
          [blob],
          `weigh-ticket-${Date.now()}.jpg`,
          { type: "image/jpeg", lastModified: Date.now() },
        );
        setShotUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.95,
    );
  }, [ratio]);

  const readFrameSize = (event: { currentTarget: HTMLVideoElement }) => {
    const video = event.currentTarget;
    if (video.videoWidth && video.videoHeight) {
      setFrame({ width: video.videoWidth, height: video.videoHeight });
    }
  };

  const handleUseShot = () => {
    const file = shotFileRef.current;
    if (file) {
      onCapture(file);
    }
  };

  const loading = !stream && !error;

  return (
    <Modal
      open
      centered
      width={720}
      title="ถ่ายรูปใบชั่ง"
      onCancel={onClose}
      footer={
        shotUrl ? (
          <Space>
            <Button icon={<RedoOutlined />} onClick={() => setShotUrl(null)}>
              ถ่ายใหม่
            </Button>
            <Button type="primary" onClick={handleUseShot}>
              ใช้รูปนี้
            </Button>
          </Space>
        ) : error ? (
          // กล้องเปิดไม่ได้ — ไม่ต้องมีปุ่มถ่ายค้างไว้ให้กดไม่ได้ ให้ทางไปต่อแทน
          <Space>
            {onUseNativeCamera ? (
              <Button onClick={onUseNativeCamera}>ใช้แอปกล้องของเครื่อง</Button>
            ) : null}
            <Button
              type="primary"
              icon={<RedoOutlined />}
              onClick={() => {
                setError(null);
                setRetryKey((value) => value + 1);
              }}
            >
              ลองอีกครั้ง
            </Button>
          </Space>
        ) : (
          <Button
            type="primary"
            icon={<CameraOutlined />}
            disabled={!stream}
            onClick={handleShoot}
          >
            ถ่าย
          </Button>
        )
      }
    >
      {!error ? (
        <div className={styles.cameraToolbar}>
          {/*
            แนวกระดาษกำหนดทั้งกรอบที่เห็นและขอบที่ครอบตัดจริง จึงต้องให้เลือกก่อนถ่าย
            ไม่ใช่มาครอบทีหลัง — คนถ่ายจะได้จัดใบให้เต็มกรอบตั้งแต่แรก
          */}
          <Segmented<Orientation>
            value={orientation}
            options={[
              { value: "PORTRAIT", label: "แนวตั้ง (A4)" },
              { value: "LANDSCAPE", label: "แนวนอน" },
              // กล้องความละเอียดต่ำอ่านทั้งใบไม่ไหว — ถ่ายเฉพาะหัวใบให้ตัวหนังสือใหญ่ขึ้นแทน
              { value: "TOP_STRIP", label: "เฉพาะส่วนบน" },
            ]}
            onChange={(value) => {
              setOrientation(value);
              writeStored(STORED_ORIENTATION_KEY, value);
            }}
          />
          {/*
            รายการเลือกกล้อง — จำเป็นบนคอมที่มีกล้องหลายตัว (เว็บแคมในตัว + มือถือที่ทำเป็นเว็บแคม)
            กล้องบนคอมไม่รายงาน facingMode การสลับหน้า/หลังจึงไม่มีความหมาย ต้องเลือกจากชื่ออุปกรณ์
          */}
          {devices.length > 1 ? (
            <Select
              style={{ minWidth: 240, flex: "1 1 240px" }}
              value={activeDeviceId}
              placeholder="เลือกกล้อง"
              options={devices.map((device, index) => ({
                value: device.deviceId,
                label: device.label || `กล้อง ${index + 1}`,
              }))}
              onChange={(value: string) => {
                setDeviceId(value);
                writeStored(STORED_DEVICE_KEY, value);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : (
        <div
          className={styles.cameraStage}
          style={{ "--video-ratio": videoRatio } as CSSProperties}
        >
          {/*
            วิดีโอต้อง mount ค้างไว้เสมอ แล้วเอารูปที่ถ่ายมาทับ — ถ้าสลับ element กันไปมา
            ตอนกด "ถ่ายใหม่" จะได้ <video> ตัวใหม่ที่ยังไม่มี srcObject แล้วจอดำ
          */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={styles.cameraVideo}
            style={{ visibility: shotUrl ? "hidden" : "visible" }}
            onLoadedMetadata={readFrameSize}
            // มือถือบางรุ่นเปลี่ยนความละเอียดของสตรีมหลังเปิดกล้องได้ (เช่นตอนหมุนเครื่อง)
            // ถ้าไม่ฟัง resize ด้วย กรอบจะค้างอยู่ที่สัดส่วนเดิมแล้วไปคนละที่กับที่ครอบตัดจริง
            onResize={readFrameSize}
          />
          {shotUrl ? (
            // รูปที่เพิ่งถ่าย เก็บเป็น blob ในเครื่อง
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shotUrl}
              alt="รูปใบชั่งที่เพิ่งถ่าย"
              className={styles.cameraShot}
              style={{ objectFit: "contain" }}
            />
          ) : null}

          {guideStyle && !shotUrl && !loading ? (
            <div className={styles.captureGuide} style={guideStyle}>
              <span className={`${styles.guideCorner} ${styles.guideCornerTl}`} />
              <span className={`${styles.guideCorner} ${styles.guideCornerTr}`} />
              <span className={`${styles.guideCorner} ${styles.guideCornerBl}`} />
              <span className={`${styles.guideCorner} ${styles.guideCornerBr}`} />
              <span className={styles.guideHint}>วางใบชั่งให้เต็มกรอบ</span>
            </div>
          ) : null}

          {loading ? (
            <div className={styles.cameraOverlay}>
              {/* ไม่ใช้ `Spin tip` แบบไม่มีลูก เพราะ AntD 6 จะเตือนว่าใช้ได้เฉพาะแบบครอบเนื้อหา */}
              <Space orientation="vertical" align="center">
                <Spin size="large" />
                <span>กำลังเปิดกล้อง...</span>
              </Space>
            </div>
          ) : null}
        </div>
      )}

      {!error && !shotUrl ? (
        <Typography.Text type="secondary" className={styles.cameraFootnote}>
          ระบบจะตัดเฉพาะในกรอบไปอ่าน จัดใบให้เต็มกรอบและไม่เอียง ตัวเลขจะแม่นขึ้นมาก
          {onUseNativeCamera ? (
            <>
              {" · "}
              <Button type="link" size="small" onClick={onUseNativeCamera}>
                ใช้แอปกล้องของเครื่อง
              </Button>
            </>
          ) : null}
        </Typography.Text>
      ) : null}
    </Modal>
  );
}
