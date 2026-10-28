"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Collapse,
  Descriptions,
  InputNumber,
  Popconfirm,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useConfirmT2900TicketMutation } from "@/hooks/weighbridge-tickets/useConfirmT2900TicketMutation";
import { useT2900LiveUpdates } from "@/hooks/weighbridge-tickets/useT2900LiveUpdates";
import { useT2900TicketDetailQuery } from "@/hooks/weighbridge-tickets/useT2900TicketDetailQuery";
import type { T2900ErpTicketDetail, T2900PriceSource } from "@/types/t2900";

import T2900CameraPhotosGallery from "./T2900CameraPhotosGallery";
import T2900TicketPhotos from "./T2900TicketPhotos";
import styles from "./WeighbridgeDashboardPage.module.css";

const LIST_HREF = "/receiving?tab=t2900";

const PRICE_SOURCE_LABEL: Record<T2900PriceSource, string> = {
  T2900: "ราคามากับบัตรชั่ง",
  PRICE_RULE: "จากตารางราคารับซื้อ ERP",
  NONE: "ยังไม่มีราคา",
};

const RECORD_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "ใช้งาน",
  UPDATED: "แก้ไขแล้ว",
  CANCELLED: "ยกเลิก",
};

/** ฟิลด์ที่แสดงในส่วนหลักแล้ว — ที่เหลือไปอยู่ใน "ข้อมูลดิบอื่น" */
const SHOWN_KEYS = new Set([
  "TckNo",
  "SeqNo",
  "TruckNo",
  "CustID",
  "CustomerName",
  "ProdID",
  "ProdName",
  "DateIn",
  "TimeIn",
  "DateOut",
  "TimeOut",
  "GrossWt",
  "TruckWt",
  "NetWt",
  "ProdWt",
  "KgPrc",
  "ProdPrc",
  "TotalPrc",
  "DscPrc",
  "TckSts",
  "TckMode",
  "RecDtTm",
  "recordStatus",
  "lastUpdatedAt",
  "Note1",
  "Note2",
]);

function formatNumber(value: unknown, digits = 3) {
  const n = Number(value);
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(n)
  ) {
    return "-";
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatBaht(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("th-TH");
}

function inOutText(date?: string, time?: string) {
  return date && time ? `${date} ${time}` : "ยังไม่ชั่ง";
}

/** สถานะในแถบ Steps ให้ตรงกับหน้าตั๋วเดิม: คัดแยกและชั่ง → ออกใบจ่ายเงิน → เข้าคลัง */
function resolveStepper(detail: T2900ErpTicketDetail): {
  current: number;
  status: "process" | "finish" | "error";
} {
  if (detail.cancelled) {
    return { current: 0, status: "error" };
  }
  if (detail.erpStockPostingStatus === "POSTED") {
    return { current: 2, status: "finish" };
  }
  if (detail.step === 1) {
    return { current: 0, status: "process" };
  }
  return { current: 1, status: "process" };
}

type Props = {
  tckNo: string;
};

export default function T2900TicketDetailPage({ tckNo }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);
  // เครื่องชั่งส่งข้อมูลเพิ่ม (เช่นชั่งออกครบ) หน้านี้เปลี่ยนขั้นเอง ไม่ต้องกดรีเฟรช
  useT2900LiveUpdates();
  const query = useT2900TicketDetailQuery(tckNo);
  const confirmMutation = useConfirmT2900TicketMutation();
  const [manualPrice, setManualPrice] = useState<number | null>(null);

  const detail = query.data?.data;
  const ticket = detail?.ticket;

  const needsManualPrice = detail?.pricing.source === "NONE";
  const confirmDisabled =
    !detail?.canConfirm ||
    (needsManualPrice && !(manualPrice && manualPrice > 0));

  /** Export เอกสารแนบรูปเข้า-ออก (ใบรับสินค้า) เป็น PDF — โหลดโค้ดสร้าง PDF เมื่อกดครั้งแรกเท่านั้น */
  const handleExportPhotoReceipt = async () => {
    if (!detail) {
      return;
    }
    setExporting(true);
    try {
      const { generateT2900PhotoReceiptPdf } =
        await import("@/utils/generateT2900PhotoReceiptPdf");
      await generateT2900PhotoReceiptPdf(detail);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Export เอกสารแนบรูปเข้า-ออกไม่สำเร็จ",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleConfirm = async () => {
    if (!detail) {
      return;
    }
    const response = await confirmMutation.mutateAsync({
      tckNo,
      ...(needsManualPrice && manualPrice ? { pricePerKg: manualPrice } : {}),
    });
    router.push(
      response.data.nextActionHref || `/receiving/${response.data.id}`,
    );
  };

  const rawRows = ticket
    ? Object.entries(ticket)
        .filter(([key]) => !SHOWN_KEYS.has(key))
        .map(([key, value]) => ({
          key,
          value:
            value === null || value === undefined || value === ""
              ? "-"
              : typeof value === "object"
                ? JSON.stringify(value)
                : String(value),
        }))
    : [];

  const stepper = detail ? resolveStepper(detail) : null;

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(LIST_HREF)}
          >
            กลับรายการบัตรชั่ง T2900
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              icon={<FilePdfOutlined />}
              loading={exporting}
              disabled={!detail}
              onClick={() => void handleExportPhotoReceipt()}
            >
              Export เอกสารแนบรูปเข้า-ออก
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              รีเฟรช
            </Button>
          </div>
        </div>

        {query.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {query.error instanceof Error
                  ? query.error.message
                  : "โหลดบัตรชั่ง T2900 ไม่สำเร็จ"}
              </Typography.Text>
            </div>
          </div>
        ) : detail && ticket && stepper ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>บัตรชั่ง T2900 เลขที่ {ticket.TckNo}</h3>
                    <p>
                      ข้อมูลจากเครื่องชั่ง · ตั๋ว ERP
                      จะถูกสร้างเมื่อกดยืนยันเท่านั้น
                    </p>
                  </div>
                  <Tag
                    className={styles.flowTag}
                    color={detail.cancelled ? "error" : undefined}
                  >
                    {RECORD_STATUS_LABEL[String(ticket.recordStatus)] ??
                      String(ticket.recordStatus)}
                  </Tag>
                </div>
              </div>
              <div className={styles.cardBody}>
                <Steps
                  current={stepper.current}
                  status={stepper.status}
                  items={[
                    {
                      title: "คัดแยกและชั่ง",
                      content:
                        detail.step === 1
                          ? "มีแต่ชั่งเข้า — รอชั่งออก"
                          : "ข้ามได้ — น้ำหนักมากับบัตรแล้ว",
                    },
                    { title: "ออกใบจ่ายเงิน" },
                    { title: "เข้าคลัง" },
                  ]}
                />

                <div style={{ marginTop: 16 }}>
                  {detail.cancelled ? (
                    <Alert
                      type="error"
                      showIcon
                      title="เครื่องชั่งยกเลิกบัตรนี้แล้ว ไม่สามารถยืนยันรับซื้อได้"
                    />
                  ) : detail.step === 1 ? (
                    <Alert
                      type="info"
                      showIcon
                      title="ยังไม่ได้ชั่งออก"
                      description="บัตรนี้มีแต่ค่าชั่งเข้า เมื่อชั่งออกครบและเครื่องชั่งส่งข้อมูลมา หน้านี้จะพร้อมให้ยืนยันรับซื้อ (กดรีเฟรช)"
                    />
                  ) : detail.canConfirm ? (
                    <Alert
                      type="success"
                      showIcon
                      title="ชั่งเข้าและออกครบแล้ว พร้อมออกใบจ่ายเงิน"
                      description="กดยืนยันแล้วระบบเปิดตั๋วและยืนยันใบรับซื้อจากน้ำหนักในบัตรให้ ข้ามหน้าคัดแยก แล้วพาไปหน้าออกใบจ่ายเงิน"
                    />
                  ) : null}

                  {detail.erpTicketId ? (
                    <div
                      className={styles.weighActions}
                      style={{ marginTop: 12 }}
                    >
                      <Tag color="processing">
                        {detail.erpActionLabel || "เปิดตั๋วใน ERP แล้ว"}
                      </Tag>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push(
                            detail.erpActionHref ||
                              `/receiving/${detail.erpTicketId}`,
                          )
                        }
                      >
                        ไปดำเนินการต่อ
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>ข้อมูลจากเครื่องชั่ง</h3>
                <p>ผู้ขาย รถ สินค้า เวลา และน้ำหนัก</p>
              </div>
              <div className={styles.cardBody}>
                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, md: 2 }}
                  items={[
                    {
                      key: "tck",
                      label: "เลขบัตรชั่ง",
                      children: ticket.TckNo,
                    },
                    { key: "seq", label: "คิว", children: ticket.SeqNo || "-" },
                    {
                      key: "truck",
                      label: "ทะเบียนรถ",
                      children: ticket.TruckNo,
                    },
                    {
                      key: "seller",
                      label: "ผู้ขาย",
                      children:
                        `${ticket.CustID} ${ticket.CustomerName ?? ""}`.trim(),
                    },
                    {
                      key: "prod",
                      label: "สินค้า",
                      children:
                        `${ticket.ProdID} ${ticket.ProdName ?? ""}`.trim(),
                    },
                    {
                      key: "sts",
                      label: "สถานะบัตร",
                      children: `TckSts ${ticket.TckSts} · แก้ไข ${ticket.TckMode} ครั้ง`,
                    },
                    {
                      key: "in",
                      label: "ชั่งเข้า",
                      children: inOutText(ticket.DateIn, ticket.TimeIn),
                    },
                    {
                      key: "out",
                      label: "ชั่งออก",
                      children: inOutText(ticket.DateOut, ticket.TimeOut),
                    },
                    {
                      key: "gross",
                      label: "น้ำหนักรวม (เข้า)",
                      children: `${formatNumber(ticket.GrossWt)} กก.`,
                    },
                    {
                      key: "tare",
                      label: "น้ำหนักรถ (ออก)",
                      children: `${formatNumber(ticket.TruckWt)} กก.`,
                    },
                    {
                      key: "net",
                      label: "น้ำหนักสุทธิ",
                      children: `${formatNumber(ticket.NetWt)} กก.`,
                    },
                    {
                      key: "prodwt",
                      label: "น้ำหนักสินค้า",
                      children: `${formatNumber(ticket.ProdWt)} กก.`,
                    },
                    {
                      key: "rec",
                      label: "บันทึกล่าสุดจากเครื่องชั่ง",
                      children: formatDateTime(ticket.RecDtTm),
                    },
                    {
                      key: "note",
                      label: "หมายเหตุ",
                      children:
                        [ticket.Note1, ticket.Note2]
                          .map((v) => (typeof v === "string" ? v.trim() : ""))
                          .filter(Boolean)
                          .join(" · ") || "-",
                    },
                  ]}
                />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>ราคา</h3>
                <p>
                  ใช้ราคาที่มากับบัตรก่อน ถ้าไม่มีหาจากตารางราคารับซื้อของ ERP
                  ตามวันที่ชั่งออก
                </p>
              </div>
              <div className={styles.cardBody}>
                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, md: 2 }}
                  items={[
                    {
                      key: "src",
                      label: "แหล่งราคา",
                      children: (
                        <Tag
                          color={
                            detail.pricing.source === "NONE"
                              ? "warning"
                              : "success"
                          }
                        >
                          {PRICE_SOURCE_LABEL[detail.pricing.source]}
                        </Tag>
                      ),
                    },
                    {
                      key: "ppk",
                      label: "ราคา/กก.",
                      children:
                        detail.pricing.pricePerKg === null
                          ? "-"
                          : `${formatBaht(detail.pricing.pricePerKg)} บาท`,
                    },
                    {
                      key: "w",
                      label: "น้ำหนักที่คิดราคา",
                      children: `${formatNumber(detail.pricing.weightKg)} กก.`,
                    },
                    {
                      key: "amt",
                      label: "ยอดประมาณการ",
                      children:
                        detail.pricing.estimatedAmount === null
                          ? "-"
                          : `${formatBaht(detail.pricing.estimatedAmount)} บาท`,
                    },
                    {
                      key: "cls",
                      label: "ประเภทยาง",
                      children: detail.pricing.classification
                        ? `${detail.pricing.classification.code} · ${detail.pricing.classification.name}`
                        : "-",
                    },
                    {
                      key: "rule",
                      label: "กฎราคา / วันที่มีผล",
                      children: detail.pricing.ruleCode
                        ? `${detail.pricing.ruleCode} · ${detail.pricing.effectiveDate ?? "-"}`
                        : (detail.pricing.effectiveDate ?? "-"),
                    },
                    {
                      key: "sentprice",
                      label: "ราคาที่เครื่องชั่งส่งมา",
                      children: `KgPrc ${formatNumber(ticket.KgPrc)} · ProdPrc ${formatNumber(ticket.ProdPrc)} · รวม ${formatNumber(ticket.TotalPrc, 2)} · หักราคา ${formatNumber(ticket.DscPrc, 2)}`,
                    },
                  ]}
                />

                {detail.pricing.source === "NONE" && detail.pricing.message ? (
                  <Alert
                    style={{ marginTop: 12 }}
                    type="warning"
                    showIcon
                    title={detail.pricing.message}
                  />
                ) : null}

                {detail.canConfirm ? (
                  <div
                    className={styles.weighActions}
                    style={{ marginTop: 16, alignItems: "center" }}
                  >
                    {needsManualPrice ? (
                      <Space.Compact style={{ width: 260 }}>
                        <InputNumber
                          min={0}
                          step={0.01}
                          precision={4}
                          placeholder="ราคา/กก. (บาท)"
                          value={manualPrice}
                          onChange={(value) => setManualPrice(value)}
                          style={{ width: "100%" }}
                        />
                        <Space.Addon>บาท/กก.</Space.Addon>
                      </Space.Compact>
                    ) : null}
                    <Popconfirm
                      title="ยืนยันรับซื้อจากบัตรนี้?"
                      description={
                        detail.pricing.estimatedAmount !== null &&
                        !needsManualPrice
                          ? `ยอดประมาณการ ${formatBaht(detail.pricing.estimatedAmount)} บาท — ระบบจะเปิดตั๋วและยืนยันใบรับซื้อ`
                          : "ระบบจะเปิดตั๋วและยืนยันใบรับซื้อด้วยน้ำหนักและราคาที่แสดง"
                      }
                      okText="ยืนยัน"
                      cancelText="ยกเลิก"
                      disabled={confirmDisabled}
                      onConfirm={() => void handleConfirm()}
                    >
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        disabled={confirmDisabled}
                        loading={confirmMutation.isPending}
                      >
                        ยืนยันรับซื้อและไปออกใบจ่ายเงิน
                      </Button>
                    </Popconfirm>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>รูปจากกล้องเครื่องชั่ง</h3>
                <p>เข้า/ออก กล้อง 1-2</p>
              </div>
              <div className={styles.cardBody}>
                {detail.erpTicketId ? (
                  // เปิดตั๋วแล้ว: รูปถูกแนบเป็นไฟล์แนบของตั๋ว (เก็บรูปที่เคยส่งมาทุกรอบ) — ใช้แกลเลอรีเดียวกับหน้าตั๋ว
                  <T2900CameraPhotosGallery
                    ticketId={detail.erpTicketId}
                    tckNo={String(ticket.TckNo)}
                  />
                ) : (
                  <T2900TicketPhotos
                    tckNo={String(ticket.TckNo)}
                    photos={detail.cameraPhotos}
                  />
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardBody}>
                <Collapse
                  ghost
                  items={[
                    {
                      key: "raw",
                      label: `ข้อมูลดิบอื่นจากเครื่องชั่ง (${rawRows.length} ฟิลด์)`,
                      children:
                        rawRows.length === 0 ? (
                          <Typography.Text type="secondary">
                            ไม่มีฟิลด์เพิ่มเติม
                          </Typography.Text>
                        ) : (
                          <Descriptions
                            bordered
                            size="small"
                            column={{ xs: 1, md: 2 }}
                            items={rawRows.map((row) => ({
                              key: row.key,
                              label: row.key,
                              children: row.value,
                            }))}
                          />
                        ),
                    },
                  ]}
                />
              </div>
            </div>
          </>
        ) : null}
      </section>
    </MasterPageGate>
  );
}
