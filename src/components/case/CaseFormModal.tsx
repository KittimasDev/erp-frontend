"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Form,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import { App } from "antd";

import { downloadTempCaseImage } from "@/lib/api/temp-cases";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { useTempCaseImagesQuery } from "@/hooks/temp-cases/useTempCaseImagesQuery";
import type {
  CreateTempCaseRequest,
  TempCase,
  TempCaseCategory,
  TempCaseStatus,
} from "@/types/temp-cases";
import styles from "@/components/masters/shared/master-page.module.css";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function isAllowedImageFile(file: File) {
  if (file.type.startsWith("image/")) {
    return true;
  }
  const name = file.name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

type CaseFormValues = {
  title: string;
  description: string;
  pageUrl: string;
  categoryId: string;
  status: TempCaseStatus;
};

export type CaseFormSubmitPayload = CreateTempCaseRequest & {
  pendingFiles: File[];
};

type CaseFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialCase?: TempCase | null;
  categories: TempCaseCategory[];
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CaseFormSubmitPayload) => void;
};

export default function CaseFormModal({
  open,
  mode,
  initialCase,
  categories,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: CaseFormModalProps) {
  const { message } = App.useApp();
  const t = useT();
  const [form] = Form.useForm<CaseFormValues>();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});
  const [previewFailed, setPreviewFailed] = useState(false);

  const imagesQuery = useTempCaseImagesQuery(
    mode === "edit" ? (initialCase?.id ?? null) : null,
    open && mode === "edit",
  );

  const revokePreviewUrls = () => {
    Object.values(previewUrlsRef.current).forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    previewUrlsRef.current = {};
    setPreviewUrls({});
  };

  useEffect(() => {
    const urls = pendingFiles.map((file) => URL.createObjectURL(file));
    setPendingPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingFiles]);

  useEffect(() => {
    if (!open) {
      setPendingFiles([]);
      return;
    }

    if (mode === "edit" && initialCase) {
      form.setFieldsValue({
        title: initialCase.title,
        description: initialCase.description,
        pageUrl: initialCase.pageUrl,
        categoryId: initialCase.categoryId,
        status: initialCase.status,
      });
      return;
    }

    form.setFieldsValue({
      title: "",
      description: "",
      pageUrl: typeof window !== "undefined" ? window.location.href : "/",
      categoryId: categories[0]?.id,
      status: "OPEN",
    });
  }, [open, mode, initialCase, categories, form]);

  useEffect(() => {
    if (!open || mode !== "edit" || !initialCase?.id) {
      revokePreviewUrls();
      setPreviewFailed(false);
      return;
    }

    const attachments = imagesQuery.data?.data ?? [];
    if (!imagesQuery.data && (imagesQuery.isLoading || imagesQuery.isFetching)) {
      return;
    }
    if (attachments.length === 0) {
      revokePreviewUrls();
      setPreviewFailed(false);
      return;
    }

    let cancelled = false;
    const created: string[] = [];

    void (async () => {
      const next: Record<string, string> = {};
      let failed = 0;
      for (const attachment of attachments) {
        try {
          const { blob } = await downloadTempCaseImage(
            getAccessToken(),
            initialCase.id,
            attachment.id,
          );
          if (cancelled) {
            return;
          }
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[attachment.id] = url;
        } catch {
          failed += 1;
        }
      }
      if (cancelled) {
        created.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
      previewUrlsRef.current = next;
      setPreviewUrls(next);
      setPreviewFailed(failed > 0 && Object.keys(next).length === 0);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load blobs when modal/case/list changes
  }, [
    open,
    mode,
    initialCase?.id,
    imagesQuery.dataUpdatedAt,
    imagesQuery.isLoading,
    imagesQuery.isFetching,
  ]);

  const addPendingFile = (file: File) => {
    if (!isAllowedImageFile(file)) {
      message.error(t("รองรับเฉพาะไฟล์รูปภาพ JPG PNG WEBP GIF"));
      return false;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      message.error(t("ขนาดรูปต้องไม่เกิน 10MB"));
      return false;
    }
    setPendingFiles((prev) => {
      if (prev.some((f) => f.name === file.name && f.size === file.size)) {
        return prev;
      }
      return [...prev, file];
    });
    return true;
  };

  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    accept: "image/*,.jpg,.jpeg,.png,.webp,.gif",
    beforeUpload: (file) => {
      addPendingFile(file);
      return Upload.LIST_IGNORE;
    },
    customRequest: ({ onSuccess }) => {
      onSuccess?.("ok");
    },
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      if (files.length === 0) {
        return;
      }
      event.preventDefault();
      files.forEach((file) => addPendingFile(file));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paste while modal open
  }, [open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      pageUrl: values.pageUrl.trim(),
      categoryId: values.categoryId,
      status: values.status,
      pendingFiles,
    });
  };

  const isCreateMode = mode === "create";
  const existingImages = imagesQuery.data?.data ?? [];

  return (
    <Modal
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? t("บันทึก") : t("อัปเดต")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      width={680}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE CASE" : "EDIT CASE"}
          </div>
          <h2>{isCreateMode ? t("เพิ่มเคส") : t("แก้ไขเคส")}</h2>
          <p>{t("บันทึก issue จากหน้าจอในระบบ (ชั่วคราว — ลบได้เมื่อจบโปรเจกต์)")}</p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label={t("หัวข้อ")}
          name="title"
          rules={[{ required: true, message: t("กรุณาระบุหัวข้อ") }]}
        >
          <Input placeholder={t("เช่น ปุ่มบันทึกกดแล้วไม่ทำงาน")} maxLength={255} />
        </Form.Item>

        <Form.Item
          label={t("หมวด")}
          name="categoryId"
          rules={[{ required: true, message: t("กรุณาเลือกหมวด") }]}
        >
          <Select
            placeholder={t("เลือกหมวด")}
            options={categories.map((c) => ({
              value: c.id,
              label: c.nameTh,
            }))}
          />
        </Form.Item>

        <Form.Item
          label={t("URL หน้าจอ")}
          name="pageUrl"
          rules={[
            { required: true, message: t("กรุณาระบุ URL") },
            {
              pattern: /^(https?:\/\/|\/)/,
              message: t("ต้องขึ้นต้นด้วย / หรือ http:// หรือ https://"),
            },
          ]}
        >
          <Input placeholder={t("/purchase-orders/create หรือ https://...")} />
        </Form.Item>

        <Form.Item
          label={t("คำอธิบาย")}
          name="description"
          rules={[{ required: true, message: t("กรุณาระบุคำอธิบาย") }]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t("อธิบายปัญหา / สิ่งที่ต้องการให้แก้")}
          />
        </Form.Item>

        <Form.Item
          label={t("สถานะ")}
          name="status"
          rules={[{ required: true, message: t("กรุณาเลือกสถานะ") }]}
        >
          <Select
            options={[
              { value: "OPEN", label: t("ยังไม่ทำ") },
              { value: "DONE", label: t("ทำแล้ว") },
            ]}
          />
        </Form.Item>

        <Form.Item label={t("แนบรูป")}>
          <Upload {...uploadProps}>
            <Button>{t("เลือกรูป")}</Button>
          </Upload>
          <div style={{ marginTop: 8, color: "#777", fontSize: 12 }}>
            {t("รองรับ JPG/PNG/WEBP/GIF ไม่เกิน 10MB ต่อไฟล์ — หรือ Ctrl+V วางภาพจากคลิปบอร์ด")}
          </div>

          {pendingFiles.length > 0 ? (
            <Space wrap style={{ marginTop: 12 }}>
              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  style={{ position: "relative" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingPreviewUrls[index]}
                    alt={file.name}
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #e1e2dd",
                    }}
                  />
                  <Button
                    size="small"
                    danger
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      padding: "0 6px",
                      height: 22,
                    }}
                    onClick={() =>
                      setPendingFiles((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </Button>
                </div>
              ))}
            </Space>
          ) : null}

          {!isCreateMode ? (
            <div style={{ marginTop: 12 }}>
              {imagesQuery.isLoading || imagesQuery.isFetching ? (
                <Spin size="small" />
              ) : existingImages.length > 0 ? (
                <Image.PreviewGroup>
                  <Space wrap>
                    {existingImages.map((image) =>
                      previewUrls[image.id] ? (
                        <Image
                          key={image.id}
                          src={previewUrls[image.id]}
                          alt={image.originalFileName || "case image"}
                          width={72}
                          height={72}
                          style={{
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #e1e2dd",
                          }}
                        />
                      ) : (
                        <div
                          key={image.id}
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 8,
                            border: "1px solid #e1e2dd",
                            display: "grid",
                            placeItems: "center",
                            color: "#999",
                            fontSize: 11,
                          }}
                        >
                          {previewFailed ? t("โหลดไม่ได้") : <Spin size="small" />}
                        </div>
                      ),
                    )}
                  </Space>
                </Image.PreviewGroup>
              ) : (
                <div style={{ color: "#999", fontSize: 12 }}>{t("ยังไม่มีรูปแนบ")}</div>
              )}
            </div>
          ) : null}
        </Form.Item>
      </Form>
    </Modal>
  );
}
