import { downloadUserSignature } from "@/lib/api/user-signatures";
import { getAccessToken } from "@/lib/auth/token";

/**
 * ลายเซ็นผู้ใช้สำหรับใส่ใน PDF
 *
 * ต้องเป็น data URI ไม่ใช่ URL ของ API เพราะ html2canvas ตั้ง
 * `useCORS: true, allowTaint: false` และ endpoint ลายเซ็นต้องแนบ token
 * ซึ่งใส่ใน <img src> ไม่ได้ (เหตุผลเดียวกับโลโก้บริษัท)
 *
 * cache ต่อ userId รวมถึงเคส "ไม่มีลายเซ็น" (เก็บ null) กันยิงซ้ำทุกครั้งที่พิมพ์
 */
const cache = new Map<string, string | null>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("อ่านไฟล์ลายเซ็นไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

/**
 * คืน data URI ของลายเซ็น หรือ null ถ้าไม่มี/โหลดไม่ได้
 * ห้ามโยน error — ไม่มีลายเซ็นต้องไม่ทำให้พิมพ์เอกสารไม่ได้
 */
export async function getUserSignatureDataUrl(
  userId: string | undefined | null,
): Promise<string | null> {
  if (!userId) {
    return null;
  }
  const cached = cache.get(userId);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const { blob } = await downloadUserSignature(getAccessToken(), userId);
    const dataUrl = await blobToDataUrl(blob);
    cache.set(userId, dataUrl);
    return dataUrl;
  } catch {
    // 404 = ยังไม่ได้อัปลายเซ็น ซึ่งเป็นเคสปกติ
    cache.set(userId, null);
    return null;
  }
}

/** ล้าง cache หลังอัป/ลบลายเซ็น เพื่อให้พิมพ์เอกสารใบถัดไปได้รูปใหม่ */
export function invalidateUserSignature(userId?: string) {
  if (userId) {
    cache.delete(userId);
    return;
  }
  cache.clear();
}
