"use client";

import { useEffect, useMemo, useState } from "react";
import { Image, Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";

import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { getT2900CameraPhotoBlob } from "@/lib/api/t2900";
import { getWeighbridgeTicketT2900CameraPhotos } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";

type Props = {
  ticketId: string;
  /** เลขบัตร T2900 — ใช้ดึงรูปจากข้อมูลบัตรแทน เมื่อไฟล์แนบไม่อยู่บนดิสก์ของเซิร์ฟเวอร์ที่เปิดอยู่ */
  tckNo?: string;
};

type PreviewItem = {
  id: string;
  title: string;
  url: string;
};

function isImageMime(mime?: string) {
  return Boolean(mime && mime.startsWith("image/"));
}

export default function T2900CameraPhotosGallery({ ticketId, tckNo }: Props) {
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  const query = useQuery({
    queryKey: ["weighbridge-ticket", ticketId, "t2900-camera-photos"],
    queryFn: () =>
      getWeighbridgeTicketT2900CameraPhotos(getAccessToken(), ticketId),
    enabled: Boolean(ticketId),
  });

  // อ้างอิงคงที่ — `?? []` ตรงๆ สร้างอาร์เรย์ใหม่ทุก render ทำให้ useEffect ด้านล่างวนไม่จบ
  const cameraFiles = useMemo(() => query.data?.data ?? [], [query.data?.data]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    const load = async () => {
      if (cameraFiles.length === 0) {
        setPreviews((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      setLoadingPreviews(true);
      try {
        const items: PreviewItem[] = [];
        for (const file of cameraFiles) {
          if (file.mimeType && !isImageMime(file.mimeType)) {
            continue;
          }
          try {
            let blob: Blob;
            try {
              ({ blob } = await downloadDocumentAttachment(
                getAccessToken(),
                file.id,
              ));
            } catch (error) {
              // ไฟล์แนบอาจถูกสร้างโดย backend อีกเครื่อง (เช่น docker ที่รับ ingest) จึงไม่มีบนดิสก์นี้
              // — รูปต้นฉบับยังอยู่ในข้อมูลบัตร T2900 ดึงจากตรงนั้นแทน
              const key = (file.originalFileName ?? "").replace(/\.[^.]+$/, "");
              if (!tckNo || !key) {
                throw error;
              }
              ({ blob } = await getT2900CameraPhotoBlob(
                getAccessToken(),
                tckNo,
                key,
              ));
            }
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            items.push({
              id: file.id,
              title: file.description || file.originalFileName || "รูปกล้อง",
              url,
            });
          } catch {
            // ข้ามไฟล์ที่ดาวน์โหลดไม่ได้
          }
        }
        if (!cancelled) {
          setPreviews(items);
        }
      } finally {
        if (!cancelled) {
          setLoadingPreviews(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [cameraFiles, tckNo]);

  if (query.isLoading || loadingPreviews) {
    return <Spin size="small" />;
  }

  if (query.isError) {
    return (
      <Typography.Text type="danger">
        โหลดรูปกล้องไม่สำเร็จ
      </Typography.Text>
    );
  }

  if (cameraFiles.length === 0) {
    return (
      <Typography.Text type="secondary">
        ยังไม่มีรูปจากกล้องเครื่องชั่ง
      </Typography.Text>
    );
  }

  if (previews.length === 0) {
    return (
      <Typography.Text type="secondary">
        มีไฟล์แนบ {cameraFiles.length} ไฟล์ แต่เปิดดูรูปไม่ได้
      </Typography.Text>
    );
  }

  return (
    <Image.PreviewGroup>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {previews.map((item) => (
          <div key={item.id}>
            <Image
              src={item.url}
              alt={item.title}
              style={{
                width: "100%",
                height: 120,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
            <Typography.Text
              type="secondary"
              style={{ display: "block", marginTop: 4, fontSize: 12 }}
            >
              {item.title}
            </Typography.Text>
          </div>
        ))}
      </div>
    </Image.PreviewGroup>
  );
}
