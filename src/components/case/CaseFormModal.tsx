"use client";

import { useEffect, useState } from "react";
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
import { useTempCaseImagesQuery } from "@/hooks/temp-cases/useTempCaseImagesQuery";
import type {
  CreateTempCaseRequest,
  TempCase,
  TempCaseCategory,
  TempCaseStatus,
} from "@/types/temp-cases";
import styles from "@/components/masters/shared/master-page.module.css";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
  const [form] = Form.useForm<CaseFormValues>();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const imagesQuery = useTempCaseImagesQuery(
    mode === "edit" ? (initialCase?.id ?? null) : null,
    open && mode === "edit",
  );

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
    const attachments = imagesQuery.data?.data ?? [];
    if (!open || mode !== "edit" || attachments.length === 0) {
      return;
    }

    let cancelled = false;
    const urls: Record<string, string> = {};

    void (async () => {
      for (const attachment of attachments) {
        try {
          const { blob } = await downloadTempCaseImage(
            getAccessToken(),
            attachment.id,
          );
          if (cancelled) {
            return;
          }
          urls[attachment.id] = URL.createObjectURL(blob);
        } catch {
          // skip broken preview
        }
      }
      if (!cancelled) {
        setPreviewUrls((prev) => {
          Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
          return urls;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode, imagesQuery.data]);

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    accept: "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif",
    beforeUpload: (file) => {
      if (!file.type.startsWith("image/")) {
        message.error("รองรับเฉพาะไฟล์รูปภาพ");
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        message.error("ขนาดรูปต้องไม่เกิน 10MB");
        return Upload.LIST_IGNORE;
      }
      setPendingFiles((prev) => {
        if (prev.some((f) => f.name === file.name && f.size === file.size)) {
          return prev;
        }
        return [...prev, file];
      });
      return false;
    },
  };

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
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
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
          <h2>{isCreateMode ? "เพิ่มเคส" : "แก้ไขเคส"}</h2>
          <p>บันทึก issue จากหน้าจอในระบบ (ชั่วคราว — ลบได้เมื่อจบโปรเจกต์)</p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="หัวข้อ"
          name="title"
          rules={[{ required: true, message: "กรุณาระบุหัวข้อ" }]}
        >
          <Input placeholder="เช่น ปุ่มบันทึกกดแล้วไม่ทำงาน" maxLength={255} />
        </Form.Item>

        <Form.Item
          label="หมวด"
          name="categoryId"
          rules={[{ required: true, message: "กรุณาเลือกหมวด" }]}
        >
          <Select
            placeholder="เลือกหมวด"
            options={categories.map((c) => ({
              value: c.id,
              label: c.nameTh,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="URL หน้าจอ"
          name="pageUrl"
          rules={[
            { required: true, message: "กรุณาระบุ URL" },
            {
              pattern: /^(https?:\/\/|\/)/,
              message: "ต้องขึ้นต้นด้วย / หรือ http:// หรือ https://",
            },
          ]}
        >
          <Input placeholder="/purchase-orders/create หรือ https://..." />
        </Form.Item>

        <Form.Item
          label="คำอธิบาย"
          name="description"
          rules={[{ required: true, message: "กรุณาระบุคำอธิบาย" }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="อธิบายปัญหา / สิ่งที่ต้องการให้แก้"
          />
        </Form.Item>

        <Form.Item
          label="สถานะ"
          name="status"
          rules={[{ required: true, message: "กรุณาเลือกสถานะ" }]}
        >
          <Select
            options={[
              { value: "OPEN", label: "ยังไม่ทำ" },
              { value: "DONE", label: "ทำแล้ว" },
            ]}
          />
        </Form.Item>

        <Form.Item label="แนบรูป">
          <Upload {...uploadProps}>
            <Button>เลือกรูป</Button>
          </Upload>
          <div style={{ marginTop: 8, color: "#777", fontSize: 12 }}>
            รองรับ JPG/PNG/WEBP/GIF ไม่เกิน 10MB ต่อไฟล์
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
              {imagesQuery.isLoading ? (
                <Spin size="small" />
              ) : existingImages.length > 0 ? (
                <Image.PreviewGroup>
                  <Space wrap>
                    {existingImages.map((image) => (
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
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiBmaWxsPSIjZWVlIi8+PC9zdmc+"
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ) : (
                <div style={{ color: "#999", fontSize: 12 }}>ยังไม่มีรูปแนบ</div>
              )}
            </div>
          ) : null}
        </Form.Item>
      </Form>
    </Modal>
  );
}
