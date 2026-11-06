"use client";

import { App, Button, Popconfirm, Upload } from "antd";
import { DeleteOutlined, DownloadOutlined, PaperClipOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import {
  deleteDocumentAttachment,
  downloadDocumentAttachment,
  getDocumentAttachments,
  uploadDocumentAttachment,
} from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { DocumentAttachment } from "@/types/document-attachments";

type Props = {
  documentType: string;
  documentId: string;
  /** ผู้ใช้แนบ/ลบไฟล์ได้หรือไม่ (ผูกสิทธิ์ที่หน้าที่เรียกใช้) */
  canEdit?: boolean;
  emptyText?: string;
  uploadLabel?: string;
  /** เรียกหลังแนบ/ลบสำเร็จ — ให้หน้าที่เรียกรีเฟรชจำนวนไฟล์ */
  onChanged?: () => void;
};

const keyOf = (type: string, id: string) => ["document-attachments", type, id] as const;

/** รายการไฟล์แนบของเอกสารใดก็ได้ในระบบไฟล์แนบกลาง (ใช้กับ SDS ของสารเคมี / COA ของ Lot) */
export default function DocumentAttachmentsPanel({
  documentType,
  documentId,
  canEdit = true,
  emptyText,
  uploadLabel,
  onChanged,
}: Props) {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  const key = keyOf(documentType, documentId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getDocumentAttachments(getAccessToken(), { documentType, documentId }),
  });
  const files = query.data?.data ?? [];

  const changed = () => {
    void queryClient.invalidateQueries({ queryKey: key });
    onChanged?.();
  };
  const errorMessage = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

  const upload = useMutation({
    mutationFn: (file: File) =>
      uploadDocumentAttachment(getAccessToken(), { file, documentType, documentId }),
    onSuccess: () => {
      message.success(t("แนบไฟล์แล้ว"));
      changed();
    },
    onError: (e) => message.error(errorMessage(e, t("แนบไฟล์ไม่สำเร็จ"))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteDocumentAttachment(getAccessToken(), id),
    onSuccess: () => {
      message.success(t("ลบไฟล์แล้ว"));
      changed();
    },
    onError: (e) => message.error(errorMessage(e, t("ลบไฟล์ไม่สำเร็จ"))),
  });

  const download = async (file: DocumentAttachment) => {
    try {
      const { blob, filename } = await downloadDocumentAttachment(getAccessToken(), file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || file.originalFileName || "file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      message.error(errorMessage(e, t("ดาวน์โหลดไฟล์ไม่สำเร็จ")));
    }
  };

  return (
    <div>
      {files.length === 0 ? (
        <p style={{ color: "#8a94a6", margin: "4px 0 8px" }}>{emptyText ?? t("ยังไม่มีไฟล์แนบ")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px" }}>
          {files.map((file) => (
            <li key={file.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
              <PaperClipOutlined />
              <span style={{ flex: 1, overflowWrap: "anywhere" }}>
                {file.originalFileName || t("ไฟล์")}
                {file.uploadedByName ? (
                  <span style={{ color: "#8a94a6", fontSize: 12 }}> · {file.uploadedByName}</span>
                ) : null}
              </span>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => void download(file)}>
                {t("ดาวน์โหลด")}
              </Button>
              {canEdit ? (
                <Popconfirm
                  title={t("ลบไฟล์นี้?")}
                  okText={t("ลบ")}
                  cancelText={t("ยกเลิก")}
                  onConfirm={() => remove.mutate(file.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label={t("ลบไฟล์")} />
                </Popconfirm>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <Upload
          showUploadList={false}
          beforeUpload={(file) => {
            upload.mutate(file);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />} loading={upload.isPending}>
            {uploadLabel ?? t("แนบไฟล์")}
          </Button>
        </Upload>
      ) : null}
    </div>
  );
}
