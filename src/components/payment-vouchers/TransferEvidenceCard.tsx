"use client";

import { useQuery } from "@tanstack/react-query";
import { App, Button, Card, Typography } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";

import { downloadDocumentAttachment, getDocumentAttachments } from "@/lib/api/document-attachments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import {
  ATTACHMENT_GROUP_PAYMENT,
  DOCUMENT_TYPE_SUPPLIER_PAYMENT,
  type DocumentAttachment,
} from "@/types/document-attachments";

const PAYMENT_EVIDENCE_GROUP = "PAYMENT_EVIDENCE";

async function loadTransferEvidence(voucherId: string, paymentIds: string[], legacy: boolean) {
  const token = getAccessToken();
  if (legacy) {
    const res = await getDocumentAttachments(token, {
      documentType: DOCUMENT_TYPE_SUPPLIER_PAYMENT,
      documentId: voucherId,
    });
    return (res.data ?? []).filter((file) => file.attachmentGroup === ATTACHMENT_GROUP_PAYMENT);
  }
  const lists = await Promise.all(
    paymentIds.map((paymentId) =>
      getDocumentAttachments(token, {
        documentType: DOCUMENT_TYPE_SUPPLIER_PAYMENT,
        documentId: paymentId,
      }),
    ),
  );
  return lists.flatMap((res) =>
    (res.data ?? []).filter((file) => file.attachmentGroup === PAYMENT_EVIDENCE_GROUP),
  );
}

/** หลักฐานโอนแบบอ่านอย่างเดียว — ใบเก่าอยู่ที่ใบสำคัญ ใบจากคิวอยู่ที่รายการจ่าย */
export default function TransferEvidenceCard({
  voucherId,
  paymentIds,
  legacy,
}: {
  voucherId: string;
  paymentIds: string[];
  legacy: boolean;
}) {
  const t = useT();
  const { message } = App.useApp();
  const query = useQuery({
    queryKey: ["payment-vouchers", "transfer-evidence", voucherId, legacy, paymentIds],
    queryFn: () => loadTransferEvidence(voucherId, paymentIds, legacy),
    enabled: legacy || paymentIds.length > 0,
  });
  if (!legacy && paymentIds.length === 0) return null;
  const files = query.data ?? [];

  const openFile = async (file: DocumentAttachment, download: boolean) => {
    try {
      const { blob, filename } = await downloadDocumentAttachment(getAccessToken(), file.id);
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || file.originalFileName || "evidence";
        link.click();
      } else {
        window.open(url, "_blank", "noopener");
      }
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : t("เปิดไฟล์ไม่สำเร็จ"));
    }
  };

  return (
    <Card title={t("หลักฐานการโอน")} size="small">
      {query.isLoading ? (
        <Typography.Text type="secondary">{t("กำลังโหลด...")}</Typography.Text>
      ) : files.length === 0 ? (
        <Typography.Text type="secondary">{t("ยังไม่มีไฟล์หลักฐาน")}</Typography.Text>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {files.map((file) => (
            <li key={file.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <Typography.Text style={{ flex: 1 }}>{file.originalFileName || t("ไฟล์แนบ")}</Typography.Text>
              <Button size="small" icon={<EyeOutlined />} onClick={() => void openFile(file, false)}>
                {t("ดู")}
              </Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => void openFile(file, true)}>
                {t("ดาวน์โหลด")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
