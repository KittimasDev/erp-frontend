"use client";

import { useState } from "react";
import { Alert, Input, Modal, Typography } from "antd";

import { ApiError } from "@/lib/api/client";
import { verifyESign } from "@/lib/api/esign";
import { getAccessToken } from "@/lib/auth/token";
import type { ESignGrant, ESignRequest } from "@/lib/esign/esign-gate";
import { useT } from "@/lib/i18n/useT";

type Props = {
  request: ESignRequest;
  onSuccess: (grant: ESignGrant) => void;
  onCancel: () => void;
  /** error ที่ต้องจบทันที (เช่น session ถูกเพิกถอน) — reject คำขอเดิม */
  onFatal: (error: unknown) => void;
};

function readAttemptsLeft(body: unknown): number | null {
  if (typeof body === "object" && body !== null && "attemptsLeft" in body) {
    const raw = (body as { attemptsLeft: unknown }).attemptsLeft;
    if (typeof raw === "number") return raw;
  }
  return null;
}

export default function ESignModal({
  request,
  onSuccess,
  onCancel,
  onFatal,
}: Props) {
  const t = useT();
  const isLogin = request.mode === "LOGIN";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  const batchTitle = t(
    request.action === "APPROVE"
      ? "ยืนยันตัวตนเพื่ออนุมัติ {n} รายการ"
      : request.action === "REJECT"
        ? "ยืนยันตัวตนเพื่อปฏิเสธ {n} รายการ"
        : "ยืนยันตัวตนเพื่อส่งกลับ {n} รายการ",
    { n: request.documentIds.length },
  );

  const ready = password.length > 0 && (!isLogin || username.trim().length > 0);

  const submit = async () => {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyESign(getAccessToken(), {
        screenCode: request.screenCode,
        action: request.action,
        documentIds: request.documentIds,
        password,
        ...(isLogin ? { username: username.trim() } : {}),
      });
      const { grantToken, expiresInSeconds } = res.data;
      if (!grantToken) {
        setError(t("ไม่ได้รับโทเคนยืนยัน กรุณาลองใหม่"));
        setLoading(false);
        return;
      }
      onSuccess({ grantToken, expiresInSeconds });
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        // รหัสผิด — เปิด modal ค้างไว้ให้ลองใหม่
        setError(e.message);
        setAttemptsLeft(readAttemptsLeft(e.body));
        setPassword("");
        setLoading(false);
        return;
      }
      if (e instanceof ApiError && e.status === 401) {
        // session ถูกเพิกถอน — apiFetch พากลับหน้า login ให้แล้ว
        onFatal(e);
        return;
      }
      setError(e instanceof ApiError ? e.message : t("ยืนยันตัวตนไม่สำเร็จ"));
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      // อยู่เหนือ modal อื่นเสมอ และถูกยกเว้นจาก CSS ที่ซ่อน modal ใบอื่นระหว่างยืนยันตัวตน (ดู globals.css)
      rootClassName="esign-modal-root"
      zIndex={1100}
      title={t("ยืนยันตัวตน (E-Signature)")}
      okText={t("ยืนยัน")}
      cancelText={t("ยกเลิก")}
      okButtonProps={{ disabled: !ready }}
      confirmLoading={loading}
      maskClosable={false}
      onCancel={() => !loading && onCancel()}
      onOk={() => void submit()}
      destroyOnHidden
    >
      {request.documentIds.length > 1 ? (
        <Typography.Paragraph strong>{batchTitle}</Typography.Paragraph>
      ) : null}
      <Typography.Paragraph type="secondary">
        {isLogin
          ? t("กรอก Username และรหัสผ่านเพื่อยืนยันการทำรายการ — Username ต้องเป็นของผู้ที่เข้าสู่ระบบอยู่เท่านั้น")
          : t("ยืนยันรหัสผ่านของผู้ที่เข้าสู่ระบบอยู่")}
      </Typography.Paragraph>

      {isLogin ? (
        <>
          <Typography.Text strong>{t("Username")}</Typography.Text>
          <Input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            style={{ marginBottom: 12 }}
          />
        </>
      ) : null}

      <Typography.Text strong>{t("รหัสผ่าน")}</Typography.Text>
      <Input.Password
        autoFocus={!isLogin}
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
        onPressEnter={() => void submit()}
      />

      {error ? (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 8 }}
          title={error}
          description={
            attemptsLeft !== null
              ? t("เหลือโอกาสอีก {n} ครั้ง — ถ้าผิดครบจะถูกออกจากระบบ", {
                  n: attemptsLeft,
                })
              : undefined
          }
        />
      ) : null}
    </Modal>
  );
}
