import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import {
  ESignCancelledError,
  hasESignRequester,
  obtainESignGrant,
  releaseBatchGrant,
  takeBatchGrant,
} from "@/lib/esign/esign-gate";
import type { ESignAction, ESignMode } from "@/types/esign";

export class ApiError extends Error {
  /** รหัสข้อผิดพลาดจาก body.code (เช่น ESIGN_REQUIRED, ESIGN_INVALID) */
  public readonly code?: string;
  /** true = ผู้ใช้กดยกเลิกหน้ายืนยันตัวตน (E-Signature) */
  public readonly esignCancelled: boolean;

  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
    esignCancelled = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.esignCancelled = esignCancelled;
    if (typeof body === "object" && body !== null && "code" in body) {
      const raw = (body as { code: unknown }).code;
      if (typeof raw === "string") this.code = raw;
    }
  }
}

type ESignRequiredInfo = {
  screenCode: string;
  mode: ESignMode;
  action: ESignAction;
  documentId: string;
};

const ESIGN_ACTIONS: readonly string[] = ["APPROVE", "REJECT", "RETURN"];

/** อ่าน 428 ESIGN_REQUIRED จาก body — ไม่ครบ = ไม่ใช่เคส E-Signature */
function readESignRequired(data: unknown): ESignRequiredInfo | null {
  if (typeof data !== "object" || data === null) return null;
  const body = data as Record<string, unknown>;
  if (
    body.code !== "ESIGN_REQUIRED" ||
    typeof body.screenCode !== "string" ||
    typeof body.documentId !== "string" ||
    typeof body.action !== "string" ||
    !ESIGN_ACTIONS.includes(body.action)
  ) {
    return null;
  }
  const mode: ESignMode = body.mode === "LOGIN" ? "LOGIN" : "PASSWORD";
  return {
    screenCode: body.screenCode,
    mode,
    action: body.action as ESignAction,
    documentId: body.documentId,
  };
}

/**
 * ข้อความ error จาก backend — Nest validation (class-validator) ส่ง `message` เป็น array
 * ต้องรวมเป็นข้อความเดียว ไม่งั้นผู้ใช้เห็นแค่ "คำขอไม่สำเร็จ" ทั้งที่ backend บอกสาเหตุมาแล้ว
 */
function extractErrorMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const raw = (data as { message: unknown }).message;
    if (typeof raw === "string" && raw.trim()) return raw;
    if (Array.isArray(raw)) {
      const parts = raw.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      );
      if (parts.length > 0) return [...new Set(parts)].join(" · ");
    }
  }
  return "คำขอไม่สำเร็จ";
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
  /** Skip auto-redirect on 401 (e.g. login request) */
  skipAuthRedirect?: boolean;
  /**
   * เลขรุ่นเอกสารที่ผู้ใช้เห็นตอนเริ่มแก้ — ส่งเป็น header `If-Match`
   * ไม่ตรงกับของจริงบน server จะได้ 409 แทนที่จะบันทึกทับงานคนอื่นเงียบ ๆ
   */
  ifMatch?: number | string | null;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, token, headers, skipAuthRedirect, ifMatch, ...rest } = options;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const send = async (grantToken?: string) => {
    const response = await fetch(path, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isFormData
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(ifMatch !== undefined && ifMatch !== null
          ? { "If-Match": `"${ifMatch}"` }
          : {}),
        ...headers,
        ...(grantToken ? { "x-esign-grant": grantToken } : {}),
      },
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => null);
    return { response, data };
  };

  let { response, data } = await send();

  /**
   * E-Signature: backend ตอบ 428 โดยยังไม่ทำอะไร → หา grant แล้วยิงซ้ำ (grant ใช้ได้เอกสารละครั้ง ไม่ cache ข้ามเอกสาร)
   * 1) grant ของ batch (withESignBatch) ที่ครอบคลุมเอกสารนี้และยังไม่ถูกใช้ → แนบเลยไม่ถาม
   * 2) ไม่งั้นเปิด modal ขอ grant เฉพาะ [documentId] + action — ถ้ายังโดนปฏิเสธ ถามอีกรอบเดียวแล้วจบ
   */
  const accessKey = token ?? "";
  let prompts = 0;
  let batchTried = false;
  while (response.status === 428 && hasESignRequester()) {
    const info = readESignRequired(data);
    if (!info) break;
    try {
      let grant: string | null = null;
      let fromBatch = false;
      if (!batchTried) {
        batchTried = true;
        grant = takeBatchGrant(
          accessKey,
          info.screenCode,
          info.action,
          info.documentId,
        );
        fromBatch = grant !== null;
      }
      if (!grant) {
        if (prompts >= 2) break;
        prompts += 1;
        grant = await obtainESignGrant(accessKey, {
          screenCode: info.screenCode,
          mode: info.mode,
          action: info.action,
          documentIds: [info.documentId],
        });
      }
      ({ response, data } = await send(grant));
      if (fromBatch && !response.ok && response.status !== 428) {
        // backend ปล่อย grant คืนเมื่อล้มด้วย business error → ลองเอกสารเดิมซ้ำได้
        releaseBatchGrant(
          accessKey,
          info.screenCode,
          info.action,
          info.documentId,
          grant,
        );
      }
    } catch (error) {
      if (error instanceof ESignCancelledError) {
        throw new ApiError(error.message, 428, data, true);
      }
      throw error;
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(data);

    const isLoginRequest = path.includes("/auth/login");

    if (
      response.status === 401 &&
      !skipAuthRedirect &&
      !isLoginRequest
    ) {
      redirectToLogin();
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

/** อัปโหลด multipart — ไม่บังคับ Content-Type เพื่อให้ browser ใส่ boundary */
export function apiUpload<T>(
  path: string,
  formData: FormData,
  options: Omit<ApiFetchOptions, "body"> = {},
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: options.method ?? "POST",
    body: formData,
  });
}

/**
 * ดาวน์โหลด binary (blob) พร้อม auth — ใช้สำหรับ preview/ดาวน์โหลดไฟล์แนบ
 */
export async function apiDownloadBlob(
  path: string,
  options: {
    token?: string | null;
    skipAuthRedirect?: boolean;
  } = {},
): Promise<{ blob: Blob; filename?: string }> {
  const { token, skipAuthRedirect } = options;

  const response = await fetch(path, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : "ดาวน์โหลดไฟล์ไม่สำเร็จ";

    if (response.status === 401 && !skipAuthRedirect) {
      redirectToLogin();
    }

    throw new ApiError(message, response.status, data);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const utf8Name = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const asciiName = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  const rawName = utf8Name ?? asciiName;
  const filename = rawName
    ? decodeURIComponent(rawName.replace(/"/g, ""))
    : undefined;

  return { blob, filename };
}
