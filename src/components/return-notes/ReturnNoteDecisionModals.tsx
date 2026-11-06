"use client";

import { useState } from "react";
import { Alert, Input, Modal, Select, Spin } from "antd";

import {
  useApproveReturnNoteMutation,
  useRejectReturnNoteMutation,
} from "@/hooks/return-notes/useReturnNoteMutations";
import { useInspectionWarehousesQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import type { InspectionWarehouse, ReturnNote } from "@/types/return-notes";
import { useT } from "@/lib/i18n/useT";

type Target = Pick<ReturnNote, "id" | "returnNoteNo" | "totalReturnQty">;

type ModalProps = {
  note: Target | null;
  onClose: () => void;
  onDone?: () => void;
};

function defaultLocationId(warehouse?: InspectionWarehouse) {
  if (!warehouse) return undefined;
  return (
    warehouse.locations.find((l) => l.locationCode === "DEFAULT")?.id ??
    warehouse.locations[0]?.id
  );
}

function ApproveBody({
  note,
  onClose,
  onDone,
}: {
  note: Target;
  onClose: () => void;
  onDone?: () => void;
}) {
  const t = useT();
  const warehousesQuery = useInspectionWarehousesQuery();
  const approveMutation = useApproveReturnNoteMutation();
  const warehouses = warehousesQuery.data?.data ?? [];

  const [pickedWarehouseId, setPickedWarehouseId] = useState<string>();
  const [pickedLocationId, setPickedLocationId] = useState<string>();

  const warehouseId = pickedWarehouseId ?? warehouses[0]?.id;
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  const locationId =
    pickedLocationId &&
    warehouse?.locations.some((l) => l.id === pickedLocationId)
      ? pickedLocationId
      : defaultLocationId(warehouse);

  const canSubmit = Boolean(warehouseId && locationId);

  return (
    <Modal
      open
      destroyOnHidden
      title={t("อนุมัติใบคืนสินค้า {returnNoteNo}", { returnNoteNo: note.returnNoteNo })}
      okText={t("อนุมัติ รับเข้าคลังตรวจสอบ")}
      cancelText={t("ยกเลิก")}
      okButtonProps={{ disabled: !canSubmit }}
      confirmLoading={approveMutation.isPending}
      onCancel={onClose}
      onOk={async () => {
        if (!warehouseId || !locationId) return;
        try {
          await approveMutation.mutateAsync({
            id: note.id,
            body: { warehouseId, locationId },
          });
          onClose();
          onDone?.();
        } catch {
          /* แจ้งผ่าน message ใน hook แล้ว */
        }
      }}
    >
      {warehousesQuery.isLoading ? (
        <Spin />
      ) : warehouses.length === 0 ? (
        <Alert
          type="error"
          showIcon
          title={t("ยังไม่มีคลังตรวจสอบ (ประเภท INSPECTION) ที่เปิดใช้งาน")}
          description={t("ตั้งค่าคลังประเภทคลังตรวจสอบที่ข้อมูลหลักคลังสินค้าก่อน")}
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0 }}>
            {t("รับของคืนรวม")} <strong>{Number(note.totalReturnQty).toLocaleString("th-TH")}</strong>{" "}
            {t("เข้าคลังตรวจสอบ ระบบจะเพิ่มสต๊อกและบันทึกการเคลื่อนไหว")}{" "}
            {t("\"รับคืนจากลูกค้า\" — อนุมัติแล้วแก้ไม่ได้")}
          </p>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>{t("คลังตรวจสอบ")}</label>
            <Select
              style={{ width: "100%" }}
              value={warehouseId}
              onChange={(value: string) => {
                setPickedWarehouseId(value);
                setPickedLocationId(undefined);
              }}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.warehouseCode} · ${w.warehouseName}`,
              }))}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>{t("ตำแหน่งจัดเก็บ")}</label>
            <Select
              style={{ width: "100%" }}
              value={locationId}
              onChange={(value: string) => setPickedLocationId(value)}
              placeholder={t("คลังนี้ยังไม่มีตำแหน่งจัดเก็บ")}
              options={(warehouse?.locations ?? []).map((l) => ({
                value: l.id,
                label: `${l.locationCode} · ${l.locationName}`,
              }))}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ApproveReturnNoteModal({ note, onClose, onDone }: ModalProps) {
  if (!note) return null;
  return <ApproveBody key={note.id} note={note} onClose={onClose} onDone={onDone} />;
}

function RejectBody({
  note,
  onClose,
  onDone,
}: {
  note: Target;
  onClose: () => void;
  onDone?: () => void;
}) {
  const t = useT();
  const rejectMutation = useRejectReturnNoteMutation();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const missing = !reason.trim();

  return (
    <Modal
      open
      destroyOnHidden
      title={t("ไม่อนุมัติใบคืนสินค้า {returnNoteNo}", { returnNoteNo: note.returnNoteNo })}
      okText={t("ไม่อนุมัติ")}
      okButtonProps={{ danger: true, disabled: missing }}
      cancelText={t("ยกเลิก")}
      confirmLoading={rejectMutation.isPending}
      onCancel={onClose}
      onOk={async () => {
        setTouched(true);
        if (missing) return;
        try {
          await rejectMutation.mutateAsync({
            id: note.id,
            body: { rejectReason: reason.trim() },
          });
          onClose();
          onDone?.();
        } catch {
          /* แจ้งผ่าน message ใน hook แล้ว */
        }
      }}
    >
      <label style={{ display: "block", marginBottom: 4 }}>
        {t("เหตุผลที่ไม่อนุมัติ")} <span style={{ color: "#dc2626" }}>*</span>
      </label>
      <Input.TextArea
        rows={3}
        value={reason}
        status={touched && missing ? "error" : undefined}
        placeholder={t("เช่น ของที่ส่งคืนไม่ตรงกับรายการในใบ")}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      {touched && missing ? (
        <div style={{ color: "#dc2626", marginTop: 4 }}>{t("กรุณาระบุเหตุผล")}</div>
      ) : null}
    </Modal>
  );
}

export function RejectReturnNoteModal({ note, onClose, onDone }: ModalProps) {
  if (!note) return null;
  return <RejectBody key={note.id} note={note} onClose={onClose} onDone={onDone} />;
}
