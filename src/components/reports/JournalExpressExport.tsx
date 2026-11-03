"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Checkbox, Drawer, Modal, Popover, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import type {
  DocumentExportHistory,
  ExportBatchKind,
  ExportHistoryBatch,
  ExportHistoryList,
  ExpressExportPreview,
} from "@/types/journal-export";

const formatDateTime = (value?: string) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—");

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
  previewKey,
  loadPreview,
  onConfirm,
  onClose,
  extraNote,
}: ExpressExportDialogProps) {
  const [confirmReexport, setConfirmReexport] = useState(false);
  const [sending, setSending] = useState(false);

  // ตรวจใหม่ทุกครั้งที่เปิด (ไม่ใช้ cache) เพื่อให้จำนวน "เคยส่งแล้ว" ตรงกับตอนกดส่งจริง
  const previewQuery = useQuery({
    queryKey: ["journal-express-preview", title, previewKey],
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
      : "ตรวจรายการก่อนส่งออกไม่สำเร็จ"
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
      okText={preview ? `ส่งออก ${willExport.toLocaleString("th-TH")} ${unit}` : "ส่งออก"}
      cancelText="ยกเลิก"
      onOk={() => void handleOk()}
      onCancel={sending ? undefined : close}
      okButtonProps={{ disabled: !preview || blockedByNoSelection, loading: sending }}
      cancelButtonProps={{ disabled: sending }}
      maskClosable={!sending}
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
              ทั้งหมด <strong>{preview.totalDocs.toLocaleString("th-TH")}</strong> {unit} · ยังไม่เคยส่ง{" "}
              <strong>{preview.newCount.toLocaleString("th-TH")}</strong> · เคยส่งแล้ว{" "}
              <strong>{preview.alreadyExportedCount.toLocaleString("th-TH")}</strong>
            </Typography.Text>
            {hasExported ? (
              <Alert
                type="warning"
                showIcon
                title={`มี ${preview.alreadyExportedCount.toLocaleString("th-TH")} ${unit}ที่เคยส่งออกไป Express แล้ว`}
                description={
                  <div>
                    การส่งซ้ำ<strong>ไม่เปลี่ยนสถานะ</strong>และไม่สร้างรายการบัญชีใหม่ใน ERP — เป็นการสร้างไฟล์ CSV ใหม่เท่านั้น
                    <div style={{ marginTop: 8 }}>
                      <Checkbox checked={confirmReexport} onChange={(e) => setConfirmReexport(e.target.checked)}>
                        ยืนยันส่งออกซ้ำรวม {unit}ที่เคยส่งแล้ว
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
                title={`${preview.legacyNoSnapshotCount.toLocaleString("th-TH")} ${unit}ส่งไปก่อนมีระบบเก็บข้อมูลเดิม`}
                description="ไม่มีข้อมูลบัญชีที่ส่งครั้งก่อนเก็บไว้ — ระบบจะใช้ผังบัญชีปัจจุบันแล้วเก็บเป็นข้อมูลอ้างอิงตั้งแต่ครั้งนี้ ตรวจว่ายังตรงกับที่นำเข้า Express ไปก่อนหน้า"
              />
            ) : null}
            {extraNote && confirmReexport ? <Alert type="info" showIcon title={extraNote} /> : null}
            {blockedByNoSelection ? (
              <Alert
                type="info"
                showIcon
                title={`ไม่มี${unit}ที่ยังไม่เคยส่ง — ติ๊กยืนยันส่งซ้ำหากต้องการสร้างไฟล์อีกครั้ง`}
              />
            ) : null}
            <Alert type="warning" showIcon title={EXPRESS_DUPLICATE_WARNING} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ระบบสร้างไฟล์ CSV ให้ดาวน์โหลดเท่านั้น ไม่ได้ส่งข้อมูลเข้าโปรแกรม Express อัตโนมัติ
            </Typography.Text>
          </>
        ) : null}
      </Space>
    </Modal>
  );
}

function BatchTags({ batch }: { batch: ExportHistoryBatch }) {
  if (batch.status === "FAILED") return <Tag color="red">ไม่สำเร็จ</Tag>;
  const kind = KIND_LABEL[batch.exportKind] ?? KIND_LABEL.NEW;
  return <Tag color={kind.color}>{kind.text}</Tag>;
}

const batchColumns: ColumnsType<ExportHistoryBatch> = [
  { title: "วันที่/เวลา", dataIndex: "exportedAt", width: 140, render: (v: string) => formatDateTime(v) },
  { title: "ผู้ดำเนินการ", dataIndex: "exportedByName", width: 140, render: (v?: string) => v ?? "—" },
  {
    title: "จำนวน",
    key: "count",
    width: 110,
    align: "right",
    render: (_, row) =>
      row.status === "FAILED" ? "—" : `${row.docCount.toLocaleString("th-TH")} (ใหม่ ${row.newCount} · ซ้ำ ${row.reexportCount})`,
  },
  {
    title: "สถานะ",
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
      : "ดึงประวัติการส่งออกไม่สำเร็จ"
    : null;

  return (
    <Drawer open={open} onClose={onClose} title={title} size={720} destroyOnHidden>
      {error ? <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} /> : null}
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        columns={batchColumns}
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
      : "ดึงประวัติไม่สำเร็จ"
    : null;

  if (!exported) return <Tag>ยังไม่ส่ง</Tag>;

  const count = Math.max(1, exportCount);
  return (
    <Popover
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      title={`ส่งออกแล้ว ${count} ครั้ง`}
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
                  + {history.untrackedCount} ครั้งก่อนมีระบบบันทึกประวัติ (ไม่มีวันเวลา/ผู้ส่ง)
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
        title={lastExportedAt ? `ล่าสุด ${formatDateTime(lastExportedAt)}` : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        ส่งแล้ว ×{count}
      </Tag>
    </Popover>
  );
}
