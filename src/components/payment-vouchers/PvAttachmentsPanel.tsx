"use client";

import { App, Button, Popconfirm, Table, Tag, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, DownloadOutlined, EyeOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { ApiError } from "@/lib/api/client";
import { downloadDocumentAttachment, getDocumentAttachments } from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import { useT, tNow } from "@/lib/i18n/useT";
import { useVoucherAttachmentMutations } from "@/hooks/payment-vouchers/usePaymentVouchers";
import type { DocumentAttachment } from "@/types/document-attachments";

export const PV_DOCUMENT_TYPE = "PAYMENT_VOUCHER";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPT = ".pdf,.jpg,.jpeg,.png";

/** ตรวจชนิด/ขนาดไฟล์ก่อนแนบ (backend ตรวจซ้ำ) — คืนข้อความ error หรือ null */
export function validatePvFile(file: File): string | null {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_MIME.includes(file.type) || !["pdf", "jpg", "jpeg", "png"].includes(ext)) {
    return tNow("แนบได้เฉพาะไฟล์ PDF, JPG, JPEG, PNG");
  }
  if (file.size > MAX_BYTES) return tNow("ไฟล์ใหญ่เกิน 20MB");
  return null;
}

const fileTypeLabel = (mime?: string) =>
  mime === "application/pdf" ? "PDF" : mime === "image/png" ? "PNG" : mime?.startsWith("image/") ? "JPG" : (mime ?? "—");

type Props =
  | {
      /** โหมดหน้ารายละเอียด: แนบ/ลบกับ PV จริง */
      voucherId: string;
      /** ร่าง/ไม่อนุมัติ และมีสิทธิ์แก้ไขเท่านั้น */
      canEdit: boolean;
      pendingFiles?: undefined;
    }
  | {
      /** โหมดหน้าสร้าง: เก็บไฟล์ไว้ก่อน แล้วอัปโหลดหลังบันทึกร่างสำเร็จ */
      voucherId?: undefined;
      canEdit: true;
      pendingFiles: { files: File[]; onChange: (files: File[]) => void };
    };

/** เอกสารแนบ / หลักฐานประกอบการขออนุมัติจ่าย (หลักฐานโอนจริงบันทึกที่เมนูบันทึกจ่ายเงิน) */
export default function PvAttachmentsPanel(props: Props) {
  const { message } = App.useApp();
  const t = useT();
  const voucherId = props.voucherId ?? "";
  const query = useQuery({
    queryKey: ["payment-vouchers", "attachments", voucherId],
    queryFn: () => getDocumentAttachments(getAccessToken(), { documentType: PV_DOCUMENT_TYPE, documentId: voucherId }),
    enabled: Boolean(voucherId),
  });
  const { upload, remove } = useVoucherAttachmentMutations(voucherId);
  const files = query.data?.data ?? [];

  const fetchBlob = async (file: DocumentAttachment) => {
    try {
      return await downloadDocumentAttachment(getAccessToken(), file.id);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t("เปิดไฟล์ไม่สำเร็จ"));
      return null;
    }
  };
  const preview = async (file: DocumentAttachment) => {
    const res = await fetchBlob(file);
    if (res) window.open(URL.createObjectURL(res.blob), "_blank", "noopener");
  };
  const download = async (file: DocumentAttachment) => {
    const res = await fetchBlob(file);
    if (!res) return;
    const url = URL.createObjectURL(res.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = res.filename || file.originalFileName || "file";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const beforeUpload = (file: File) => {
    const err = validatePvFile(file);
    if (err) {
      message.error(`${file.name}: ${err}`);
      return Upload.LIST_IGNORE;
    }
    if (props.pendingFiles) {
      props.pendingFiles.onChange([...props.pendingFiles.files, file]);
    } else {
      upload.mutate(file);
    }
    return false;
  };

  const columns: ColumnsType<DocumentAttachment> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("ชื่อไฟล์"), dataIndex: "originalFileName", render: (v?: string) => v || t("ไฟล์") },
    { title: t("ประเภทไฟล์"), dataIndex: "mimeType", width: 100, render: (v?: string) => <Tag>{fileTypeLabel(v)}</Tag> },
    { title: t("วันที่แนบ"), dataIndex: "createdAt", width: 150, render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    { title: t("ผู้แนบ"), dataIndex: "uploadedByName", width: 150, render: (v?: string) => v ?? "—" },
    {
      title: "",
      key: "actions",
      width: 190,
      render: (_v, file) => (
        <span style={{ display: "inline-flex", gap: 6 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => void preview(file)}>
            {t("ดู")}
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => void download(file)} aria-label={t("ดาวน์โหลด")} />
          {props.canEdit ? (
            <Popconfirm title={t("ลบไฟล์นี้?")} okText={t("ลบ")} cancelText={t("ยกเลิก")} onConfirm={() => remove.mutate(file.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} aria-label={t("ลบไฟล์")} />
            </Popconfirm>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <div>
      {props.pendingFiles ? (
        props.pendingFiles.files.length === 0 ? (
          <p style={{ color: "#8a94a6", margin: "4px 0 8px" }}>{t("ยังไม่มีไฟล์แนบ — ไฟล์จะถูกอัปโหลดเมื่อบันทึกร่าง")}</p>
        ) : (
          <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
            {props.pendingFiles.files.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                {f.name} <Tag>{fileTypeLabel(f.type)}</Tag>
                <Button
                  size="small"
                  type="link"
                  danger
                  onClick={() => props.pendingFiles.onChange(props.pendingFiles.files.filter((_, j) => j !== i))}
                >
                  {t("เอาออก")}
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <Table
          size="small"
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={files}
          pagination={false}
          locale={{ emptyText: t("ยังไม่มีไฟล์แนบ") }}
          style={{ marginBottom: 8 }}
        />
      )}
      {props.canEdit ? (
        <Upload accept={ACCEPT} multiple showUploadList={false} beforeUpload={beforeUpload}>
          <Button icon={<UploadOutlined />} loading={upload.isPending}>
            {t("แนบไฟล์ (PDF, JPG, JPEG, PNG ไม่เกิน 20MB)")}
          </Button>
        </Upload>
      ) : null}
    </div>
  );
}
