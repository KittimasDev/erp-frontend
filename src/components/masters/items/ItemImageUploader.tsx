"use client";

import { useState } from "react";
import { App, Button, Popconfirm, Upload } from "antd";
import { DeleteOutlined, RobotOutlined, UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";

import {
  deleteItemImage,
  generateItemImage,
  uploadItemImage,
} from "@/lib/api/items";
import { getAccessToken } from "@/lib/auth/token";
import { itemsQueryKey } from "@/hooks/items/useItemsQuery";
import { useT } from "@/lib/i18n/useT";
import ItemImage from "./ItemImage";

const MAX_BYTES = 3 * 1024 * 1024;

type ItemImageUploaderProps = {
  itemId: string;
  imageFileName?: string | null;
};

/** อัปโหลด/ลบรูปสินค้าทันทีที่เลือกไฟล์ (ไม่ต้องรอกดบันทึกฟอร์ม) */
export default function ItemImageUploader({
  itemId,
  imageFileName,
}: ItemImageUploaderProps) {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  // รูปปัจจุบันหลังอัปโหลด/ลบ — prop อาจยังเป็นค่าเก่าจนกว่ารายการสินค้าจะโหลดใหม่
  const [current, setCurrent] = useState<string | null | undefined>(
    imageFileName,
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: itemsQueryKey });

  const handleUpload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      message.error(t("รูปต้องไม่เกิน 3 MB"));
      return;
    }
    setBusy(true);
    try {
      const res = await uploadItemImage(getAccessToken(), itemId, file);
      setCurrent(res.data.imageFileName);
      await refresh();
      message.success(t("อัปโหลดรูปสินค้าแล้ว"));
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("อัปโหลดรูปไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await generateItemImage(getAccessToken(), itemId);
      setCurrent(res.data.imageFileName);
      await refresh();
      message.success(t("AI สร้างรูปสินค้าแล้ว"));
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("สร้างรูปด้วย AI ไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteItemImage(getAccessToken(), itemId);
      setCurrent(null);
      await refresh();
      message.success(t("ลบรูปสินค้าแล้ว"));
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("ลบรูปไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <ItemImage itemId={itemId} imageFileName={current} size={72} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">
          {t("รูปสินค้า (อัปโหลด JPG PNG WEBP ไม่เกิน 3 MB หรือให้ AI สร้างจากข้อมูลสินค้า) — ใช้แสดงในหน้า 3D คลัง")}
        </span>
        <div className="flex gap-2">
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              void handleUpload(file);
              return false;
            }}
          >
            <Button size="small" icon={<UploadOutlined />} loading={busy}>
              {current ? t("เปลี่ยนรูป") : t("อัปโหลดรูป")}
            </Button>
          </Upload>
          <Popconfirm
            title={t("ให้ AI สร้างรูปสินค้านี้?")}
            description={
              current
                ? t("ส่งชื่อและคำอธิบายสินค้าไปยัง Gemini รูปใหม่จะแทนที่รูปเดิม")
                : t("ส่งชื่อและคำอธิบายสินค้าไปยัง Gemini (ใช้เวลาประมาณ 10-30 วินาที)")
            }
            okText={t("สร้างรูป")}
            cancelText={t("ยกเลิก")}
            onConfirm={() => void handleGenerate()}
          >
            <Button size="small" icon={<RobotOutlined />} loading={busy}>
              {t("สร้างรูปด้วย AI")}
            </Button>
          </Popconfirm>
          {current && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={busy}
              onClick={() => void handleDelete()}
            >
              {t("ลบรูป")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
