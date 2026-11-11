"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Checkbox, Drawer, Modal, Popover, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useLanguage } from "@/lib/i18n/language";
import type { Language } from "@/lib/i18n/translate";
import { useT, type TFunction } from "@/lib/i18n/useT";
import type {
  DocumentExportHistory,
  ExportBatchKind,
  ExportHistoryBatch,
  ExportHistoryList,
  ExpressExportPreview,
} from "@/types/journal-export";

const formatDateTime = (value?: string) => (value ? dayjs(value).format("DD/MM/BBBB HH:mm") : "—");

/** "ส่งแล้ว" / "ยังไม่ส่ง" ของสถานะส่งออก Express (ไทยตามเดิม · อังกฤษ Exported / Not exported) */
export function expressSentLabel(sent: boolean, lang: Language): string {
  if (lang === "en") return sent ? "Exported" : "Not exported";
  return sent ? "ส่งแล้ว" : "ยังไม่ส่ง";
}

const KIND_LABEL: Record<ExportBatchKind, { text: string; color: string }> = {
  NEW: { text: "ส่งครั้งแรก", color: "green" },
  REEXPORT: { text: "ส่งซ้ำ", color: "orange" },
  MIXED: { text: "ใหม่ + ซ้ำ", color: "blue" },
};

/** คำเตือนคงที่ — การส่งออกซ้ำสร้างไฟล์ใหม่เท่านั้น ไม่ได้ส่งเข้า Express อัตโนมัติ */
const EXPRESS_DUPLICATE_WARNING =
  "การนำไฟล์เดิมเข้า Express ซ้ำอาจทำให้เกิดรายการบัญชีซ้ำใน Express — ตรวจสอบก่อนนำเข้า";

type ExpressExportDialogProps = {
  open: boolean;
  title: string;
  /** อธิบายขอบเขตที่จะส่ง เช่น "ช่วงวันที่เอกสาร 01/11/2026 - 30/11/2026" หรือ "เอกสารที่เลือก 3 รายการ" */
  scopeLabel: string;
  unit: "เอกสาร" | "รายการ";
  /** รูปแบบไฟล์ที่จะสร้าง (ค่าเริ่มต้น csv) — ใช้กับข้อความและคีย์ตรวจก่อนส่ง */
  format?: "csv" | "xlsx";
  /** คีย์ของขอบเขตที่ส่ง (เช่น JSON ของตัวกรอง/id ที่เลือก) — เปลี่ยนแล้วตรวจใหม่ */
  previewKey: string;
  loadPreview: () => Promise<ExpressExportPreview>;
  /** reexport = ผู้ใช้ยืนยันส่งซ้ำรวมรายการที่เคยส่งแล้ว */
  onConfirm: (reexport: boolean) => Promise<void>;
  onClose: () => void;
  /** ข้อความเพิ่มเติมเฉพาะสมุดนั้น เช่น ฝั่งจ่ายยังคำนวณบัญชีสดทุกครั้ง */
  extraNote?: string;
};

/** Modal ยืนยันก่อนส่งออก Express — เตือนเมื่อมีรายการที่เคยส่งแล้ว และต้องติ๊กยืนยันก่อนส่งซ้ำ */
export function ExpressExportDialog({
  open,
  title,
  scopeLabel,
  unit,
  format = "csv",
  previewKey,
  loadPreview,
  onConfirm,
  onClose,
  extraNote,
}: ExpressExportDialogProps) {
  const t = useT();
  const lang = useLanguage();
  /** หน่วยนับ — ไทยใช้ตามที่ส่งมา อังกฤษแปลเป็น documents / entries */
  const unitText = lang === "en" ? (unit === "เอกสาร" ? "documents" : "entries") : unit;
  const [confirmReexport, setConfirmReexport] = useState(false);
  const [sending, setSending] = useState(false);

  // ตรวจใหม่ทุกครั้งที่เปิด (ไม่ใช้ cache) เพื่อให้จำนวน "เคยส่งแล้ว" ตรงกับตอนกดส่งจริง
  const previewQuery = useQuery({
    queryKey: ["journal-express-preview", title, format, previewKey],
    queryFn: loadPreview,
    enabled: open,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const preview: ExpressExportPreview | null = previewQuery.data ?? null;
  const error = previewQuery.error
    ? previewQuery.error instanceof Error
      ? previewQuery.error.message
      : t("ตรวจรายการก่อนส่งออกไม่สำเร็จ")
    : null;

  const close = () => {
    setConfirmReexport(false);
    onClose();
  };

  const hasExported = (preview?.alreadyExportedCount ?? 0) > 0;
  // รวมที่เคยส่ง = ต้องติ๊กยืนยัน · ไม่ติ๊ก = ส่งเฉพาะที่ยังไม่เคยส่ง
  const willExport = preview ? (confirmReexport ? preview.totalDocs : preview.newCount) : 0;
  const blockedByNoSelection = Boolean(preview) && willExport === 0;

  const handleOk = async () => {
    setSending(true);
    try {
      await onConfirm(confirmReexport);
      close();
    } catch {
      // ผู้เรียกแสดงข้อความผิดพลาดเอง — คง modal ไว้ให้ผู้ใช้ลองใหม่/ปิด
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={preview ? t("ส่งออก {n} {unit}", { n: willExport.toLocaleString("th-TH"), unit: unitText }) : t("ส่งออก")}
      cancelText={t("ยกเลิก")}
      onOk={() => void handleOk()}
      onCancel={sending ? undefined : close}
      okButtonProps={{ disabled: !preview || blockedByNoSelection, loading: sending }}
      cancelButtonProps={{ disabled: sending }}
      mask={{ closable: !sending }}
      destroyOnHidden
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Text>{scopeLabel}</Typography.Text>
        {!preview && !error ? (
          <div style={{ textAlign: "center", padding: 16 }}>
            <Spin />
          </div>
        ) : null}
        {error ? <Alert type="error" showIcon title={error} /> : null}
        {preview ? (
          <>
            <Typography.Text>
              {t("ทั้งหมด")} <strong>{preview.totalDocs.toLocaleString("th-TH")}</strong> {unitText} · {t("ยังไม่เคยส่ง")}{" "}
              <strong>{preview.newCount.toLocaleString("th-TH")}</strong> · {t("เคยส่งแล้ว")}{" "}
              <strong>{preview.alreadyExportedCount.toLocaleString("th-TH")}</strong>
            </Typography.Text>
            {hasExported ? (
              <Alert
                type="warning"
                showIcon
                title={t("มี {n} {unit}ที่เคยส่งออกไป Express แล้ว", { n: preview.alreadyExportedCount.toLocaleString("th-TH"), unit: unitText })}
                description={
                  <div>
                    {t("การส่งซ้ำ")}<strong>{t("ไม่เปลี่ยนสถานะ")}</strong>{format === "xlsx" ? t("และไม่สร้างรายการบัญชีใหม่ใน ERP — เป็นการสร้างไฟล์ Excel ใหม่เท่านั้น") : t("และไม่สร้างรายการบัญชีใหม่ใน ERP — เป็นการสร้างไฟล์ CSV ใหม่เท่านั้น")}
                    <div style={{ marginTop: 8 }}>
                      <Checkbox checked={confirmReexport} onChange={(e) => setConfirmReexport(e.target.checked)}>
                        {t("ยืนยันส่งออกซ้ำรวม {unit}ที่เคยส่งแล้ว", { unit: unitText })}
                      </Checkbox>
                    </div>
                  </div>
                }
              />
            ) : null}
            {confirmReexport && preview.legacyNoSnapshotCount > 0 ? (
              <Alert
                type="warning"
                showIcon
                title={t("{n} {unit}ส่งไปก่อนมีระบบเก็บข้อมูลเดิม", { n: preview.legacyNoSnapshotCount.toLocaleString("th-TH"), unit: unitText })}
                description={t("ไม่มีข้อมูลบัญชีที่ส่งครั้งก่อนเก็บไว้ — ระบบจะใช้ผังบัญชีปัจจุบันแล้วเก็บเป็นข้อมูลอ้างอิงตั้งแต่ครั้งนี้ ตรวจว่ายังตรงกับที่นำเข้า Express ไปก่อนหน้า")}
              />
            ) : null}
            {extraNote && confirmReexport ? <Alert type="info" showIcon title={extraNote} /> : null}
            {blockedByNoSelection ? (
              <Alert
                type="info"
                showIcon
                title={t("ไม่มี{unit}ที่ยังไม่เคยส่ง — ติ๊กยืนยันส่งซ้ำหากต้องการสร้างไฟล์อีกครั้ง", { unit: unitText })}
              />
            ) : null}
            <Alert type="warning" showIcon title={t(EXPRESS_DUPLICATE_WARNING)} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {format === "xlsx" ? t("ระบบสร้างไฟล์ Excel ให้ดาวน์โหลดเท่านั้น ไม่ได้ส่งข้อมูลเข้าโปรแกรม Express อัตโนมัติ") : t("ระบบสร้างไฟล์ CSV ให้ดาวน์โหลดเท่านั้น ไม่ได้ส่งข้อมูลเข้าโปรแกรม Express อัตโนมัติ")}
            </Typography.Text>
          </>
        ) : null}
      </Space>
    </Modal>
  );
}

function BatchTags({ batch }: { batch: ExportHistoryBatch }) {
  const t = useT();
  if (batch.status === "FAILED") return <Tag color="red">{t("ไม่สำเร็จ")}</Tag>;
  const kind = KIND_LABEL[batch.exportKind] ?? KIND_LABEL.NEW;
  return <Tag color={kind.color}>{t(kind.text)}</Tag>;
}

const buildBatchColumns = (t: TFunction): ColumnsType<ExportHistoryBatch> => [
  { title: t("วันที่/เวลา"), dataIndex: "exportedAt", width: 140, render: (v: string) => formatDateTime(v) },
  { title: t("ผู้ดำเนินการ"), dataIndex: "exportedByName", width: 140, render: (v?: string) => v ?? "—" },
  {
    title: t("จำนวน"),
    key: "count",
    width: 110,
    align: "right",
    render: (_, row) =>
      row.status === "FAILED" ? "—" : t("{total} (ใหม่ {newCount} · ซ้ำ {reexportCount})", {
            total: row.docCount.toLocaleString("th-TH"),
            newCount: row.newCount,
            reexportCount: row.reexportCount,
          }),
  },
  {
    title: t("สถานะ"),
    key: "status",
    width: 110,
    render: (_, row) => (
      <Space size={4} orientation="vertical">
        <BatchTags batch={row} />
        {row.errorMessage ? (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            {row.errorMessage}
          </Typography.Text>
        ) : null}
      </Space>
    ),
  },
];

/** Drawer ประวัติการส่งออกทุกรอบ — อ่านอย่างเดียว */
export function ExportHistoryDrawer({
  open,
  title,
  onClose,
  loadHistory,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  loadHistory: (page: number) => Promise<ExportHistoryList>;
}) {
  const t = useT();
  const [page, setPage] = useState(1);
  const historyQuery = useQuery({
    queryKey: ["journal-export-history", title, page],
    queryFn: () => loadHistory(page),
    enabled: open,
    gcTime: 0,
    retry: false,
  });
  const data = historyQuery.data ?? null;
  const loading = historyQuery.isFetching;
  const error = historyQuery.error
    ? historyQuery.error instanceof Error
      ? historyQuery.error.message
      : t("ดึงประวัติการส่งออกไม่สำเร็จ")
    : null;

  return (
    <Drawer open={open} onClose={onClose} title={title} size={720} destroyOnHidden>
      {error ? <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} /> : null}
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        columns={buildBatchColumns(t)}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: data?.limit ?? 20,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </Drawer>
  );
}

/** Tag "ส่งแล้ว ×N" — คลิกดูว่าส่งเมื่อไหร่/ใคร/กี่ครั้ง (โหลดเมื่อเปิด) */
export function ExportCountTag({
  exported,
  exportCount,
  lastExportedAt,
  docId,
  loadDocHistory,
}: {
  exported: boolean;
  exportCount: number;
  lastExportedAt?: string;
  docId: string;
  loadDocHistory: (id: string) => Promise<DocumentExportHistory>;
}) {
  const t = useT();
  const lang = useLanguage();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const historyQuery = useQuery({
    queryKey: ["journal-export-doc-history", docId],
    queryFn: () => loadDocHistory(docId),
    enabled: popoverOpen && exported,
    gcTime: 0,
    retry: false,
  });
  const history: DocumentExportHistory | null = historyQuery.data ?? null;
  const error = historyQuery.error
    ? historyQuery.error instanceof Error
      ? historyQuery.error.message
      : t("ดึงประวัติไม่สำเร็จ")
    : null;

  if (!exported) return <Tag>{expressSentLabel(false, lang)}</Tag>;

  const count = Math.max(1, exportCount);
  return (
    <Popover
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      title={t("ส่งออกแล้ว {count} ครั้ง", { count })}
      content={
        <div style={{ maxWidth: 320 }} onClick={(event) => event.stopPropagation()}>
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
          {!history && !error ? <Spin size="small" /> : null}
          {history ? (
            <Space orientation="vertical" size={4}>
              {history.entries.map((entry) => (
                <div key={`${entry.id}-${entry.exportedAt}`}>
                  {formatDateTime(entry.exportedAt)} · {entry.exportedByName ?? "—"} · <BatchTags batch={entry} />
                </div>
              ))}
              {history.untrackedCount > 0 ? (
                <Typography.Text type="secondary">
                  {t("+ {n} ครั้งก่อนมีระบบบันทึกประวัติ (ไม่มีวันเวลา/ผู้ส่ง)", { n: history.untrackedCount })}
                </Typography.Text>
              ) : null}
            </Space>
          ) : null}
        </div>
      }
    >
      <Tag
        color="green"
        style={{ cursor: "pointer" }}
        title={lastExportedAt ? t("ล่าสุด {date}", { date: formatDateTime(lastExportedAt) }) : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {expressSentLabel(true, lang)} ×{count}
      </Tag>
    </Popover>
  );
}
