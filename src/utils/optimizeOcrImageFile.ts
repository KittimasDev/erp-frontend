/**
 * เตรียมรูปใบชั่งก่อนส่งไปให้ OCR อ่าน
 *
 * ต่างจาก optimizePaymentSlipFile ตรงเป้าหมาย: สลิปแค่ต้อง "อ่านออกด้วยตา" แต่ OCR
 * ต้องแยกตัวอักษรออกจากพื้นหลัง จึงเก็บความละเอียดสูงกว่า บีบน้อยกว่า ไม่ข้ามไฟล์เล็ก
 * และเพิ่มคอนทราสต์ให้ตัวเลขแบบ dot-matrix ที่จางมากอ่านง่ายขึ้น
 *
 * ทั้งหมดทำบน canvas ฝั่ง browser ทำให้ backend ไม่ต้องมี native dependency อย่าง sharp
 *
 * **เคยลองแล้วแย่ลง อย่าทำซ้ำ** (วัดกับใบจริง ดู DEVELOPMENT.md หัวข้อ OCR)
 * — binarize แบบ Sauvola, ปรับคอนทราสต์ตามหน้าต่างรอบพิกเซล, และขยายภาพก่อนอ่าน
 * ทั้งสามอย่างทำให้ tesseract อ่านค่าสำคัญได้น้อยลงจริง ๆ ไม่ใช่แค่ช้าลง
 *
 * ใบแนวตั้งทั้งหน้าจะถูกตัดเหลือประมาณ 65% บน (หัวเอกสาร + ตารางชั่ง) ก่อนย่อและยืดคอนทราสต์
 * เพราะภาพ CCTV ครึ่งล่างทำให้ PSM 6 อ่านได้ไม่ครบ — รูปที่ครอบตารางมาแล้วจะไม่ถูกตัดซ้ำ
 */

import {
  canvasToBlob,
  loadImageFromFile,
  replaceExtension,
} from "./optimizePaymentSlipFile";

const MAX_EDGE_PX = 2400;
const JPEG_QUALITY = 0.92;
/** ตัดหัวท้าย histogram ทิ้งก่อนยืดคอนทราสต์ กันจุดด่างหรือแสงสะท้อนมาดึงช่วง */
const CLIP_PERCENTILE = 0.02;

/**
 * ใบรับสินค้าแนวตั้งมีรูป CCTV ครึ่งล่าง — ตัดทิ้งก่อนอ่าน
 * ค่าเดียวกับ `OCR_PORTRAIT_MIN_ASPECT` / `OCR_TEXT_REGION_HEIGHT_RATIO` ฝั่ง backend
 * รูปที่ครอบตารางมาแล้ว (แนวนอน / TOP_STRIP) จะไม่ถูกตัดซ้ำ
 */
const PORTRAIT_MIN_ASPECT = 1.2;
const TEXT_REGION_HEIGHT_RATIO = 0.65;

/**
 * กรอบต้นฉบับที่จะส่งให้ OCR — ครึ่งบนของใบแนวตั้ง หรือทั้งรูปถ้าไม่ใช่แนวตั้ง
 *
 * ตัดก่อนย่อ เพื่อให้เพดาน 2400px ไปอยู่ที่ตัวหนังสือ ไม่ไปเสียกับภาพกล้องวงจรปิด
 */
export function ocrSourceCrop(
  width: number,
  height: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (width <= 0 || height <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(1, width), sh: Math.max(1, height) };
  }
  if (height / width < PORTRAIT_MIN_ASPECT) {
    return { sx: 0, sy: 0, sw: width, sh: height };
  }
  return {
    sx: 0,
    sy: 0,
    sw: width,
    sh: Math.max(1, Math.round(height * TEXT_REGION_HEIGHT_RATIO)),
  };
}

/** จำนวนพิกเซลต่อแถบ — เล็กพอให้แต่ละแถบจบใน ~10-30ms เบราว์เซอร์จะได้แทรกการวาดจอได้ */
const PIXELS_PER_CHUNK = 200_000;

/**
 * คืน main thread ให้เบราว์เซอร์ไปวาดจอหนึ่งเฟรม
 *
 * มี setTimeout คู่ไว้ด้วยเพราะ `requestAnimationFrame` ไม่ทำงานตอนแท็บถูกซ่อน —
 * บนมือถือผู้ใช้สลับไปแอปกล้องหรือสลับแอประหว่างเตรียมรูปได้ ถ้าพึ่ง rAF อย่างเดียวงานจะค้าง
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    requestAnimationFrame(finish);
    window.setTimeout(finish, 50);
  });
}

/**
 * แปลงเป็นเกรย์สเกลแล้วยืดคอนทราสต์ให้เต็มช่วง 0-255
 * ทำในที่ (mutate ImageData) เพื่อไม่ต้อง copy บัฟเฟอร์ใหญ่ซ้ำ
 *
 * แบ่งงานเป็นแถบแล้วคืนเฟรมระหว่างแถบ — รูปจากมือถือมีหลายล้านพิกเซล
 * ถ้าวนรวดเดียวจะ block main thread จนสปินเนอร์หยุดหมุน ซึ่งดูเหมือนแอปแฮงค์
 */
async function toHighContrastGrayscale(
  image: ImageData,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const { data } = image;
  const histogram = new Uint32Array(256);
  const step = PIXELS_PER_CHUNK * 4;

  // pass 1 — หาความสว่างของแต่ละพิกเซลพร้อมนับ histogram ไปด้วย
  for (let start = 0; start < data.length; start += step) {
    const end = Math.min(start + step, data.length);
    for (let i = start; i < end; i += 4) {
      const luminance =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const level =
        luminance < 0 ? 0 : luminance > 255 ? 255 : Math.round(luminance);
      data[i] = level;
      histogram[level] += 1;
    }
    onProgress?.(end / data.length);
    await nextFrame();
  }

  const totalPixels = data.length / 4;
  const clipCount = Math.floor(totalPixels * CLIP_PERCENTILE);

  let low = 0;
  let seen = 0;
  while (low < 255 && seen + histogram[low] <= clipCount) {
    seen += histogram[low];
    low += 1;
  }

  let high = 255;
  seen = 0;
  while (high > 0 && seen + histogram[high] <= clipCount) {
    seen += histogram[high];
    high -= 1;
  }

  // pass 2 — ยืดค่าที่ได้ให้เต็มช่วงแล้วเขียนกลับทั้งสามช่องสี
  const span = high - low;
  for (let start = 0; start < data.length; start += step) {
    const end = Math.min(start + step, data.length);
    for (let i = start; i < end; i += 4) {
      const level = data[i];
      const stretched = span <= 0 ? level : ((level - low) / span) * 255;
      const clamped = stretched < 0 ? 0 : stretched > 255 ? 255 : stretched;
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
      data[i + 3] = 255;
    }
    onProgress?.(end / data.length);
    await nextFrame();
  }
}

/**
 * สัดส่วนเวลาของแต่ละขั้น ใช้แปลงความคืบหน้าของแต่ละขั้นเป็นเปอร์เซ็นต์รวม
 * ค่าพวกนี้เป็นการประมาณจากรูปมือถือทั่วไป ไม่ต้องเป๊ะ ขอแค่ progress เดินหน้าไม่กระตุก
 */
const STAGE_WEIGHT = {
  DECODE: 0.15,
  GRAYSCALE: 0.75,
  ENCODE: 0.1,
} as const;

export type OptimizeOcrImageOptions = {
  /** ความคืบหน้า 0..1 — เรียกถี่พอจะให้ progress bar ขยับได้ลื่น */
  onProgress?: (ratio: number) => void;
};

/** คืนไฟล์ที่เตรียมแล้ว หรือไฟล์เดิมถ้าเตรียมไม่สำเร็จ */
export async function optimizeOcrImageFile(
  file: File,
  options: OptimizeOcrImageOptions = {},
): Promise<File> {
  const { onProgress } = options;
  if (!file.type.startsWith("image/")) {
    onProgress?.(1);
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const crop = ocrSourceCrop(img.naturalWidth, img.naturalHeight);
    const longest = Math.max(crop.sw, crop.sh);
    const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round(crop.sw * scale));
    const height = Math.max(1, Math.round(crop.sh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      onProgress?.(1);
      return file;
    }

    // ค่าเริ่มต้นคือ "low" — รูปจากมือถือถูกย่อลงมาเยอะ คุณภาพการย่อจึงมีผลกับความคมของเลข
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      img,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      width,
      height,
    );
    onProgress?.(STAGE_WEIGHT.DECODE);

    const image = ctx.getImageData(0, 0, width, height);
    await toHighContrastGrayscale(image, (ratio) => {
      onProgress?.(STAGE_WEIGHT.DECODE + STAGE_WEIGHT.GRAYSCALE * ratio);
    });
    ctx.putImageData(image, 0, 0);
    onProgress?.(STAGE_WEIGHT.DECODE + STAGE_WEIGHT.GRAYSCALE);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    onProgress?.(1);
    return new File([blob], replaceExtension(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    onProgress?.(1);
    return file;
  }
}
