"use client";

import { useEffect, useState } from "react";
import { Image, Spin, Typography } from "antd";

import { getT2900CameraPhotoBlob } from "@/lib/api/t2900";
import { getAccessToken } from "@/lib/auth/token";
import type { T2900CameraPhotoFlag } from "@/types/t2900";

type Props = {
  tckNo: string;
  photos: T2900CameraPhotoFlag[];
};

type Loaded = { key: string; label: string; url: string };

/** รูปกล้องจากบัตร T2900 (ดึงจาก payload ก่อนเปิดตั๋ว ERP) */
export default function T2900TicketPhotos({ tckNo, photos }: Props) {
  const [items, setItems] = useState<Loaded[]>([]);
  const [loading, setLoading] = useState(false);
  const present = photos.filter((photo) => photo.present);
  const presentSignature = present
    .map((photo) => `${photo.key}:${photo.label}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const wanted = presentSignature
      ? presentSignature.split("|").map((entry) => {
          const [key, ...rest] = entry.split(":");
          return { key, label: rest.join(":") };
        })
      : [];

    const load = async () => {
      if (wanted.length === 0) {
        setItems([]);
        return;
      }
      setLoading(true);
      const loaded: Loaded[] = [];
      for (const photo of wanted) {
        try {
          const { blob } = await getT2900CameraPhotoBlob(
            getAccessToken(),
            tckNo,
            photo.key,
          );
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          loaded.push({ key: photo.key, label: photo.label, url });
        } catch {
          // รูปที่เป็น URL ภายนอกหรืออ่านไม่ได้ — ข้าม
        }
      }
      if (!cancelled) {
        setItems(loaded);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [tckNo, presentSignature]);

  if (present.length === 0) {
    return (
      <Typography.Text type="secondary">
        บัตรนี้ไม่มีรูปจากกล้องเครื่องชั่ง
      </Typography.Text>
    );
  }
  if (loading) {
    return <Spin size="small" />;
  }
  if (items.length === 0) {
    return (
      <Typography.Text type="secondary">
        มีรูป {present.length} รูป แต่เปิดดูไม่ได้
      </Typography.Text>
    );
  }
  return (
    <Image.PreviewGroup>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((item) => (
          <div key={item.key}>
            <Image
              src={item.url}
              alt={item.label}
              style={{
                width: "100%",
                height: 130,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
            <Typography.Text
              type="secondary"
              style={{ display: "block", marginTop: 4, fontSize: 12 }}
            >
              {item.label}
            </Typography.Text>
          </div>
        ))}
      </div>
    </Image.PreviewGroup>
  );
}
