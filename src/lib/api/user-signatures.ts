import { apiDownloadBlob, apiFetch, apiUpload } from "./client";

const BASE = "/api/user-signatures";

export type UserSignatureApiResponse = {
  statusCode: number;
  message: string;
  data: {
    hasSignature: boolean;
    signatureUpdatedAt?: string | null;
  };
};

export function uploadMySignature(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<UserSignatureApiResponse>(`${BASE}/me`, formData, { token });
}

export function deleteMySignature(token: string) {
  return apiFetch<UserSignatureApiResponse>(`${BASE}/me`, {
    method: "DELETE",
    token,
  });
}

/** ลายเซ็นต้องแนบ token จึงใส่ใน <img src> ตรง ๆ ไม่ได้ — ดึงเป็น blob แทน */
export function downloadMySignature(token: string) {
  return apiDownloadBlob(`${BASE}/me`, { token });
}

/**
 * ลายเซ็นของผู้ใช้คนอื่น — ใช้ตอนสร้าง PDF เพราะคนพิมพ์กับผู้จัดทำเป็นคนละคน
 * `skipAuthRedirect` เพราะ 404 (ยังไม่มีลายเซ็น) เป็นเคสปกติ ไม่ใช่ปัญหา auth
 */
export function downloadUserSignature(token: string, userId: string) {
  return apiDownloadBlob(`${BASE}/${userId}`, {
    token,
    skipAuthRedirect: true,
  });
}
