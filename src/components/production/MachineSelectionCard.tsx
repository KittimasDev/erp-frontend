"use client";

import { Alert, Card, Select, Space, Tag, Typography } from "antd";

import { useEquipmentQuery } from "@/hooks/maintenance/useMaintenance";
import type { ProductionFormula } from "@/types/production-formula";

type Props = {
  formula?: ProductionFormula;
  /** formulaEquipmentId → equipmentId ที่เลือกแทน */
  choices: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
};

/**
 * เครื่องจักรของ MO — ดึงจากสูตรอัตโนมัติ และสลับเป็นเครื่องอื่นได้เฉพาะ "ประเภทเดียวกัน + พร้อมใช้งาน (ACTIVE)"
 * (backend ตรวจซ้ำ รวมถึงแหล่งข้อมูล AUTO ที่ต้องมี Device/Tag ตรงกัน) ·
 * เก็บเป็น Snapshot ที่ใบ — แก้สูตรหรือ Master ภายหลังไม่กระทบใบนี้
 */
export default function MachineSelectionCard({ formula, choices, onChange }: Props) {
  const equipmentIds = formula?.recordingConfig?.equipmentIds ?? [];
  const equipmentQuery = useEquipmentQuery({});
  if (!formula || equipmentIds.length === 0) return null;

  const all = equipmentQuery.data?.data ?? [];
  const byId = new Map(all.map((e) => [e.id, e] as const));
  const capacityText = (id: string) => {
    const e = byId.get(id);
    return e?.capacity != null
      ? `${e.capacity.toLocaleString("th-TH")} ${e.capacityUnitLabel ?? ""}/ชม.`
      : "ยังไม่ตั้ง Capacity";
  };
  const chosenIds = new Set(equipmentIds.map((id) => choices[id] ?? id));

  return (
    <Card size="small" title="เครื่องจักรที่ใช้ในใบสั่งผลิต" style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        ดึงตามสูตร {formula.formulaCode} — เปลี่ยนเป็นเครื่องอื่นที่เป็นประเภทเดียวกันได้
        (เลือกได้เฉพาะเครื่องที่เปิดใช้งาน)
      </Typography.Paragraph>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        {equipmentIds.map((formulaEquipmentId) => {
          const original = byId.get(formulaEquipmentId);
          const chosenId = choices[formulaEquipmentId] ?? formulaEquipmentId;
          const chosen = byId.get(chosenId);
          const sameType = all.filter(
            (e) =>
              e.id !== formulaEquipmentId &&
              original?.equipmentTypeId &&
              e.equipmentTypeId === original.equipmentTypeId &&
              e.status === "ACTIVE" &&
              // ไม่ให้ใบเดียวเลือกเครื่องเดียวกันซ้ำ
              (!chosenIds.has(e.id) || e.id === chosenId),
          );
          const options = [
            ...(original
              ? [
                  {
                    value: original.id,
                    label: `${original.equipmentCode} — ${original.name} (ตามสูตร)${original.status === "ACTIVE" ? "" : " · ไม่พร้อมใช้งาน"}`,
                    disabled: original.status !== "ACTIVE",
                  },
                ]
              : []),
            ...sameType.map((e) => ({
              value: e.id,
              label: `${e.equipmentCode} — ${e.name} · ${capacityText(e.id)}`,
              disabled: false,
            })),
          ];
          return (
            <div key={formulaEquipmentId}>
              <Space size={8} wrap style={{ marginBottom: 4 }}>
                <Typography.Text strong>{original?.equipmentCode ?? "เครื่องในสูตร"}</Typography.Text>
                {original?.equipmentTypeName ? <Tag>{original.equipmentTypeName}</Tag> : null}
                <Tag color="geekblue">กำลังผลิต {capacityText(chosenId)}</Tag>
                {chosenId !== formulaEquipmentId ? <Tag color="orange">สลับจากเครื่องในสูตร</Tag> : null}
              </Space>
              <Select
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="label"
                loading={equipmentQuery.isLoading}
                value={chosenId}
                options={options}
                disabled={!original?.equipmentTypeId}
                onChange={(equipmentId: string) => {
                  const next = { ...choices };
                  if (equipmentId === formulaEquipmentId) delete next[formulaEquipmentId];
                  else next[formulaEquipmentId] = equipmentId;
                  onChange(next);
                }}
              />
              {!original?.equipmentTypeId ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  เครื่องนี้ยังไม่ได้ตั้งประเภทเครื่องจักร จึงสลับเป็นเครื่องอื่นไม่ได้
                </Typography.Text>
              ) : sameType.length === 0 && chosen ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ไม่มีเครื่องอื่นประเภทเดียวกันที่พร้อมใช้งาน
                </Typography.Text>
              ) : null}
            </div>
          );
        })}
      </Space>
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 12 }}
        title="Capacity และฟิลด์บันทึกถูกเก็บเป็น Snapshot ที่ใบนี้ — แก้สูตร/Master ภายหลังไม่กระทบใบที่สร้างแล้ว"
      />
    </Card>
  );
}
