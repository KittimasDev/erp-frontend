"use client";

import { useEffect, useState } from "react";
import { App, Button, Popconfirm, Space, Typography, Upload } from "antd";
import type { UploadProps } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  HighlightOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import { myProfileQueryKey, useMeQuery } from "@/hooks/auth/useMeQuery";
import {
  deleteMySignature,
  downloadMySignature,
  uploadMySignature,
} from "@/lib/api/user-signatures";
import { getAccessToken } from "@/lib/auth/token";
import { invalidateUserSignature } from "@/lib/user/user-signature";

import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./MySignaturePage.module.css";

/** ต้องตรงกับ MAX_SIGNATURE_BYTES ฝั่ง backend (user-signatures.controller.ts) */
const MAX_SIGNATURE_BYTES = 1024 * 1024;
const TEMPLATE_URL = "/signature-template.png";

type MySignaturePageProps = {
  /** ฝังในหน้าอื่น — ข้าม section ชั้นนอกไม่ให้ padding ซ้อนกัน */
  embedded?: boolean;
};

export default function MySignaturePage({
  embedded = false,
}: MySignaturePageProps) {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const meQuery = useMeQuery();
  const me = meQuery.data?.data;
  const hasSignature = Boolean(me?.hasSignature);

  /**
   * ลายเซ็นต้องแนบ token จึงใส่ใน img src ตรง ๆ ไม่ได้
   * โหลดเป็น blob แล้วทำ object URL — แบบเดียวกับพรีวิวโลโก้บริษัท
   */
  useEffect(() => {
    if (!hasSignature) {
      // ไม่ setState ในสาขานี้ — ค่าที่ค้างถูกกันด้วย hasSignature ตอนเรนเดอร์
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { blob } = await downloadMySignature(getAccessToken());
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setPreview(objectUrl);
      } catch {
        if (!cancelled) {
          setPreview(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    // signatureUpdatedAt เปลี่ยนทุกครั้งที่อัปโหลด — บังคับให้โหลดรูปใหม่
  }, [hasSignature, me?.signatureUpdatedAt]);

  const refresh = async () => {
    if (me?.id) {
      invalidateUserSignature(me.id);
    }
    await queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handlePick = async (file: File) => {
    if (file.type !== "image/png") {
      message.error(t("ไฟล์ต้องเป็น PNG เท่านั้น"));
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      message.error(t("ไฟล์ลายเซ็นต้องไม่เกิน 1 MB"));
      return;
    }

    setBusy(true);
    try {
      const response = await uploadMySignature(getAccessToken(), file);
      await refresh();
      message.success(response.message || t("อัปโหลดลายเซ็นสำเร็จแล้ว"));
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("อัปโหลดลายเซ็นไม่สำเร็จ"),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      const response = await deleteMySignature(getAccessToken());
      setPreview(null);
      await refresh();
      message.success(response.message || t("ลบลายเซ็นสำเร็จแล้ว"));
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("ลบลายเซ็นไม่สำเร็จ"),
      );
    } finally {
      setBusy(false);
    }
  };

  /** antd ไม่ต้องยิงเอง — เราอัปโหลดผ่าน apiUpload ที่แนบ token ให้ */
  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: ".png,image/png",
    disabled: busy,
    beforeUpload: (file) => {
      void handlePick(file as unknown as File);
      return Upload.LIST_IGNORE;
    },
  };

  const content = (
    <>
      <div className={masterStyles.filterCard}>
        <div className={masterStyles.filterHeader}>
          <div>
            <div className={masterStyles.filterEyebrow}>{t("ลายเซ็นของฉัน")}</div>
            <h3>{t("อัปโหลดลายเซ็นสำหรับเอกสาร")}</h3>
            <p>
              {t("ลายเซ็นนี้จะไปแสดงในช่องผู้จัดทำของเอกสารขายที่คุณเป็นผู้สร้าง (ใบเสนอราคา · ใบสั่งขาย · ใบแจ้งหนี้) — รับไฟล์ PNG ไม่เกิน 1 MB")}
            </p>
          </div>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>SIGNATURE</div>
            <h3>{t("ลายเซ็นปัจจุบัน")}</h3>
            <p>
              {hasSignature
                ? t("มีลายเซ็นแล้ว — อัปโหลดใหม่จะทับของเดิม")
                : t("ยังไม่มีลายเซ็น เอกสารจะเว้นช่องให้เซ็นด้วยปากกาเหมือนเดิม")}
            </p>
          </div>
        </div>

        <div className={styles.signatureBody}>
          <div className={styles.previewBox}>
            {hasSignature && preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={t("ลายเซ็นของฉัน")}
                className={styles.previewImage}
              />
            ) : (
              <div className={styles.previewEmpty}>
                <HighlightOutlined />
                <span>{t("ยังไม่มีลายเซ็น")}</span>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <Space wrap>
              <Upload {...uploadProps}>
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={busy}
                  className={masterStyles.createButton}
                >
                  {hasSignature ? t("เปลี่ยนลายเซ็น") : t("อัปโหลดลายเซ็น (PNG)")}
                </Button>
              </Upload>
              <Button
                icon={<DownloadOutlined />}
                href={TEMPLATE_URL}
                download="signature-template.png"
              >
                {t("ดาวน์โหลด template")}
              </Button>
              {hasSignature ? (
                <Popconfirm
                  title={t("ลบลายเซ็น")}
                  description={t("เอกสารจะกลับไปเว้นช่องให้เซ็นด้วยปากกา")}
                  okText={t("ลบ")}
                  cancelText={t("ยกเลิก")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void handleRemove()}
                >
                  <Button danger icon={<DeleteOutlined />} disabled={busy}>
                    {t("ลบลายเซ็น")}
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>

            <div className={styles.howTo}>
              <Typography.Text strong>{t("วิธีทำลายเซ็น")}</Typography.Text>
              <ol>
                <li>{t("กด ดาวน์โหลด template")}</li>
                <li>
                  <b>{t("ถ้าเซ็นบนจอ")}</b> {t("(แท็บเล็ต / ปากกา stylus / โปรแกรมแก้รูป) — เซ็นทับ template ไปเลย พื้นหลังโปร่งใสอยู่แล้ว เซฟเป็น")}{" "}
                  <b>.png</b> {t("ได้ทันที ไม่ต้องครอปไม่ต้องลบพื้นหลัง")}
                </li>
                <li>
                  <b>{t("ถ้าเซ็นบนกระดาษ")}</b> {t("— พิมพ์ template ออกมา เซ็นกลางแผ่นด้วยปากกาสีเข้มให้ใหญ่พอสมควร แล้วถ่ายรูป/สแกนกลับเข้าเครื่อง")}
                </li>
                <li>{t("ครอปให้เหลือแค่ลายเซ็น ตัดพื้นที่ว่างรอบ ๆ ออก")}</li>
                <li>
                  {t("ลบพื้นหลังให้โปร่งใสถ้าทำได้ แล้วเซฟเป็นไฟล์")} <b>.png</b>
                </li>
                <li>{t("กลับมาที่หน้านี้แล้วกด อัปโหลดลายเซ็น")}</li>
              </ol>
              <Typography.Text type="secondary">
                {t("template เป็นผืนโปร่งใสเปล่า ไม่มีกรอบไม่มีเส้นโดยตั้งใจ — เปิดดูจะเหมือนว่างเปล่าหรือเห็นเป็นลายตาราง ถือว่าถูกต้องแล้ว · ที่ไม่ใส่เส้นเพราะเส้นจะติดไปโผล่ในช่องลายเซ็นบนเอกสาร และที่ทำโปร่งใสเพราะพื้นขาวทึบจะกลายเป็นกล่องสี่เหลี่ยมทับเนื้อเอกสาร")}
              </Typography.Text>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return <section className={masterStyles.page}>{content}</section>;
}
