import type { ReactNode } from "react";
import type { HookAPI } from "antd/es/modal/useModal";

import { ApiError } from "@/lib/api/client";
import type { StorageConflict } from "@/types/chemicals";

/** 409 INCOMPATIBLE_STORAGE จาก backend (รับของ/โอนย้าย) → รายการสารที่เก็บรวมกันไม่ได้ · ไม่ใช่ = null */
export function parseIncompatibleStorage(error: unknown): StorageConflict[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as { code?: string; conflicts?: StorageConflict[] } | undefined;
  if (body?.code !== "INCOMPATIBLE_STORAGE" || !Array.isArray(body.conflicts)) return null;
  return body.conflicts;
}

export function IncompatibleStorageList({ conflicts }: { conflicts: StorageConflict[] }): ReactNode {
  return (
    <div>
      <p style={{ marginTop: 0 }}>
        สารเคมีต่อไปนี้ตามตารางห้ามเก็บรวม (ตั้งที่ <strong>สารเคมี → ห้ามเก็บรวม</strong>) ไม่ควรอยู่ในตำแหน่งจัดเก็บเดียวกัน:
      </p>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        {conflicts.map((c) => (
          <li key={`${c.locationId}-${c.incomingItemId}-${c.existingItemId}`}>
            ตำแหน่ง <strong>{c.locationCode ?? c.locationId}</strong>: {c.incomingItemName} ({c.incomingHazard}) ↔{" "}
            {c.existingItemName} ({c.existingHazard}){" "}
            {c.source === "SAME_DOCUMENT" ? "— อยู่ในเอกสารเดียวกัน" : "— มีของอยู่ในตำแหน่งนี้แล้ว"}
          </li>
        ))}
      </ul>
      <p style={{ marginBottom: 0, marginTop: 8 }}>
        ถ้ายืนยันดำเนินการต่อ ระบบจะบันทึกว่าผู้ใช้รับทราบแล้วไว้กับเอกสาร
      </p>
    </div>
  );
}

/** ถามให้ผู้ใช้รับทราบแล้วเรียก onAcknowledge (ซึ่งยิงซ้ำพร้อม acknowledgeIncompatibleStorage) */
export function confirmIncompatibleStorage(
  modal: HookAPI,
  conflicts: StorageConflict[],
  onAcknowledge: () => void,
) {
  modal.confirm({
    title: "พบสารเคมีที่เก็บตำแหน่งเดียวกันไม่ได้",
    width: 640,
    content: <IncompatibleStorageList conflicts={conflicts} />,
    okText: "รับทราบ และดำเนินการต่อ",
    okButtonProps: { danger: true },
    cancelText: "กลับไปแก้ตำแหน่ง",
    onOk: onAcknowledge,
  });
}
