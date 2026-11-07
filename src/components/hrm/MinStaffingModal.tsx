"use client";

import { useState } from "react";
import { Alert, Button, InputNumber, Modal, Select, Spin } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { useMinStaffingQuery, useSetMinStaffingMutation } from "@/hooks/leave/useMinStaffing";
import { usePositionsQuery } from "@/hooks/positions/usePositionsQuery";
import { useShiftsQuery } from "@/hooks/shifts/useShiftQueries";
import type { MinStaffingRow } from "@/types/leave";

type Draft = { key: number; position?: string; shiftId?: string; minHeadcount?: number };

type Props = {
  open: boolean;
  onClose: () => void;
};

let nextKey = 1;

/** ฟอร์มแก้ไข — mount หลังโหลดค่าที่บันทึกไว้เสร็จ จึงตั้งค่าเริ่มต้นตอนสร้าง state ได้เลย (ไม่ต้องใช้ effect) */
function MinStaffingForm({
  initial,
  onClose,
}: {
  initial: MinStaffingRow[];
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLanguage();
  const save = useSetMinStaffingMutation();
  const positionsQuery = usePositionsQuery({ isActive: true });
  const shiftsQuery = useShiftsQuery(false, true);
  const positions = positionsQuery.data?.data ?? [];
  const shifts = shiftsQuery.data?.data ?? [];
  const [rows, setRows] = useState<Draft[]>(() =>
    initial.map((item) => ({
      key: nextKey++,
      position: item.position,
      shiftId: item.shiftId,
      minHeadcount: item.minHeadcount,
    })),
  );

  const update = (key: number, patch: Partial<Draft>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const complete = rows.filter((r) => r.position && r.shiftId && r.minHeadcount);
  const seen = new Set<string>();
  let hasDuplicate = false;
  for (const r of complete) {
    const k = `${r.position}|${r.shiftId}`;
    if (seen.has(k)) hasDuplicate = true;
    seen.add(k);
  }

  const handleSave = () => {
    if (hasDuplicate) return;
    save.mutate(
      complete.map((r) => ({
        position: r.position!,
        shiftId: r.shiftId!,
        minHeadcount: r.minHeadcount!,
      })),
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title={t("ใช้เตือนตอนอนุมัติลา")}
        description={t(
          "ก่อนอนุมัติ ระบบนับคนที่เหลือในกะเดียวกัน (ตำแหน่งเดียวกัน ไม่รวมคนที่ลาอยู่) ถ้าต่ำกว่าขั้นต่ำจะเตือนให้ผู้อนุมัติรับทราบก่อน — อนุมัติได้ ไม่ถูกบล็อก · ตำแหน่ง × กะ ที่ไม่ได้ตั้งไว้จะไม่ถูกตรวจ · แถวที่ไม่กรอกครบจะไม่ถูกบันทึก",
        )}
      />
      {hasDuplicate ? (
        <Alert type="error" showIcon style={{ marginBottom: 12 }} title={t("มีตำแหน่ง × กะ ซ้ำกัน")} />
      ) : null}
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 110px 32px", gap: 8 }}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={lang === "en" ? "Position" : "ตำแหน่ง"}
              loading={positionsQuery.isLoading}
              value={row.position}
              onChange={(value) => update(row.key, { position: value })}
              options={positions.map((p) => ({ value: p.nameTh, label: p.nameTh }))}
            />
            <Select
              placeholder={t("กะ")}
              loading={shiftsQuery.isLoading}
              value={row.shiftId}
              onChange={(value) => update(row.key, { shiftId: value })}
              options={shifts.map((s) => ({ value: s.id, label: `${s.name} · ${s.startTime}-${s.endTime}` }))}
            />
            <InputNumber
              min={1}
              max={500}
              placeholder={t("ขั้นต่ำ (คน)")}
              style={{ width: "100%" }}
              value={row.minHeadcount}
              onChange={(value) => update(row.key, { minHeadcount: value ?? undefined })}
            />
            <Button
              aria-label={t("ลบแถว")}
              icon={<DeleteOutlined />}
              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            />
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={() => setRows((prev) => [...prev, { key: nextKey++ }])}>
          {t("เพิ่มแถว")}
        </Button>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Button onClick={onClose}>{t("ยกเลิก")}</Button>
        <Button type="primary" disabled={hasDuplicate} loading={save.isPending} onClick={handleSave}>
          {t("บันทึก")}
        </Button>
      </div>
    </>
  );
}

/** ตั้งกำลังคนขั้นต่ำต่อ ตำแหน่ง × กะ — ใช้เตือนตอนอนุมัติลา (ไม่ตั้ง = ไม่ตรวจ) */
export default function MinStaffingModal({ open, onClose }: Props) {
  const t = useT();
  const query = useMinStaffingQuery(open);

  return (
    <Modal
      open={open}
      title={t("ตั้งกำลังคนขั้นต่ำ ตำแหน่ง × กะ")}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      centered
      width={680}
    >
      {query.data ? (
        <MinStaffingForm initial={query.data.data} onClose={onClose} />
      ) : (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      )}
    </Modal>
  );
}
