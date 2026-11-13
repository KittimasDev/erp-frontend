"use client";

import {
  CheckCircleFilled,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { CSSProperties } from "react";
import { Skeleton, Tag, Typography } from "antd";

import { useESignatureHistory } from "@/hooks/esign/useESignatureHistory";
import { formatBuddhistIntl } from "@/lib/datetime/intl-be";
import { ERP_TIMEZONE } from "@/lib/datetime/erp-timezone";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { ESignatureRecord } from "@/types/esign";

type Props = {
  documentId?: string;
  className?: string;
  style?: CSSProperties;
};

function formatSignedAt(iso: string, lang: "th" | "en", at: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = { timeZone: ERP_TIMEZONE } as const;
  const date = formatBuddhistIntl(d, lang, {
    ...base,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = formatBuddhistIntl(d, lang, {
    ...base,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return lang === "th" ? `${date} ${at} ${time} น.` : `${date} ${at} ${time}`;
}

export default function ESignatureHistoryCard({ documentId, className, style }: Props) {
  const t = useT();
  const language = useLanguage();
  const { data, isLoading } = useESignatureHistory(documentId);

  if (!documentId) return null;

  const records: ESignatureRecord[] = data ?? [];

  const actionLabel = (a?: ESignatureRecord["action"]) => {
    if (a === "APPROVE") return t("อนุมัติเอกสาร");
    if (a === "REJECT") return t("ไม่อนุมัติเอกสาร");
    if (a === "RETURN") return t("ตีกลับเอกสาร");
    return t("ยืนยันเอกสาร");
  };
  const methodLabel = (m: string) => {
    if (m === "PASSWORD_CONFIRMATION") return "Password Confirmation";
    if (m === "LOGIN_CONFIRMATION") return "Login Confirmation";
    return m;
  };

  const border = "1px solid var(--ant-color-border-secondary, #f0f0f0)";

  return (
    <section
      className={className}
      style={{
        border,
        borderRadius: 12,
        background: "var(--ant-color-bg-container, #fff)",
        padding: 16,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingBottom: 12,
          borderBottom: border,
        }}
      >
        <Typography.Text strong style={{ fontSize: 15 }}>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          {t("ประวัติ E-Signature")}
        </Typography.Text>
        {records.length > 0 ? (
          <Tag variant="filled" style={{ margin: 0 }}>
            {t("{n} รายการ", { n: records.length })}
          </Tag>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} style={{ marginTop: 16 }} />
      ) : records.length === 0 ? (
        <div style={{ padding: "20px 0 8px", textAlign: "center" }}>
          <div>
            <Typography.Text>{t("ไม่มีประวัติ E-Signature")}</Typography.Text>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("หน้านี้ปิดการยืนยันตัวตน หรือยังไม่มีการอนุมัติ")}
          </Typography.Text>
        </div>
      ) : (
        records.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              gap: 12,
              padding: "14px 0",
              borderTop: i === 0 ? undefined : border,
            }}
          >
            <CheckCircleFilled
              style={{ color: "var(--ant-color-success, #52c41a)", fontSize: 20, marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Typography.Text strong>{actionLabel(r.action)}</Typography.Text>
                <Tag color="success" style={{ margin: 0 }}>
                  {t("สำเร็จ")}
                </Tag>
              </div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                <div>
                  {t("ผู้อนุมัติ")}:{" "}
                  <span style={{ fontWeight: 600 }}>{r.signedByName || "-"}</span>
                </div>
                <div>
                  <Typography.Text type="secondary">
                    {formatSignedAt(r.signedAt, language, language === "th" ? "เวลา" : "at")}
                  </Typography.Text>
                </div>
                <div>
                  {t("วิธีเซ็น")}: {methodLabel(r.signatureMethod)}
                </div>
                {r.documentNo ? (
                  <div>
                    {t("อ้างอิง")}: {r.documentNo}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
