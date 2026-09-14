/**
 * ย่อ/บีบอัดรูปสลิปก่อนอัปโหลด — คงคุณภาพให้อ่านตัวเลขบนสลิปได้ชัด
 * PDF ไม่แตะต้อง
 */

const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.84;
const MIN_BYTES_TO_OPTIMIZE = 400 * 1024;

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    };
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("แปลงรูปไม่สำเร็จ"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export function replaceExtension(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "") || "payment-slip";
  return `${base}.${ext}`;
}

/**
 * คืน File ที่ optimize แล้ว หรือไฟล์เดิมถ้าไม่จำเป็น / optimize ไม่คุ้ม
 */
export async function optimizePaymentSlipFile(file: File): Promise<File> {
  if (file.type === "application/pdf") {
    return file;
  }

  if (!file.type.startsWith("image/")) {
    return file;
  }

  // รูปเล็กอยู่แล้ว ไม่ต้องเสียเวลา encode ใหม่
  if (file.size < MIN_BYTES_TO_OPTIMIZE) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // สลิปใช้ JPEG คุณภาพสูงพอให้อ่านข้อความได้ — ไฟล์เล็กลงกว่า PNG/WEBP ต้นฉบับมาก
    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);

    // ถ้าไม่ได้เล็กลงจริง เก็บต้นฉบับ
    if (blob.size >= file.size * 0.95) {
      return file;
    }

    return new File([blob], replaceExtension(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
