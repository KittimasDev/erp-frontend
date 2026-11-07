"use client";

import { useQuery } from "@tanstack/react-query";
import { PictureOutlined } from "@ant-design/icons";

import { downloadItemImage } from "@/lib/api/items";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";

type ItemImageProps = {
  itemId: string;
  /** ชื่อไฟล์รูปจาก master — ว่าง = ยังไม่มีรูป ไม่ต้องยิง request */
  imageFileName?: string | null;
  size?: number;
  alt?: string;
  className?: string;
};

/** รูปสินค้าจาก master (ดึงเป็น blob พร้อม token) ไม่มีรูปแสดงไอคอนแทน */
export default function ItemImage({
  itemId,
  imageFileName,
  size = 48,
  alt = "",
  className = "",
}: ItemImageProps) {
  const t = useT();
  const { data: src } = useQuery({
    queryKey: ["item-image", itemId, imageFileName],
    queryFn: async () => {
      const { blob } = await downloadItemImage(getAccessToken(), itemId);
      return URL.createObjectURL(blob);
    },
    enabled: Boolean(imageFileName),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });

  const box = {
    width: size,
    height: size,
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={box}
        className={`rounded-md object-cover border border-slate-300 ${className}`}
      />
    );
  }

  return (
    <span
      style={box}
      className={`inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-400 border border-slate-200 ${className}`}
      title={imageFileName ? t("กำลังโหลดรูป") : t("ยังไม่มีรูปสินค้า")}
    >
      <PictureOutlined />
    </span>
  );
}
