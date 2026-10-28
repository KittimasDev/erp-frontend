"use client";

import React, { useState } from "react";
import { Button, Checkbox, InputNumber } from "antd";
import { AppstoreAddOutlined } from "@ant-design/icons";
import type { ZoneConfig } from "@/types/warehouse-3d";

interface ZoneSplitPanelProps {
  zone: ZoneConfig;
  onSplit: (rows: number, cols: number, createLocations: boolean) => void;
}

/** แบ่งโซนหนึ่งออกเป็นช่องเท่าๆ กัน (แถว x คอลัมน์) — ช่องแรกใช้ location เดิม สต๊อกไม่ขยับ */
export const ZoneSplitPanel: React.FC<ZoneSplitPanelProps> = ({ zone, onSplit }) => {
  const [rows, setRows] = useState<number>(1);
  const [cols, setCols] = useState<number>(2);
  const [createLocations, setCreateLocations] = useState<boolean>(true);

  const w = zone.dimensions?.[0] ?? 0;
  const l = zone.dimensions?.[2] ?? 0;
  const total = rows * cols;
  const cellW = cols > 0 ? w / cols : 0;
  const cellL = rows > 0 ? l / rows : 0;

  return (
    <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50/60 p-2 space-y-2">
      <div className="text-[11px] font-semibold text-emerald-700">แบ่งพื้นที่นี้เป็นหลายช่อง</div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span>แบ่งตามแนวกว้าง</span>
        <InputNumber size="small" min={1} max={12} value={cols} onChange={(v) => setCols(v ?? 1)} className="w-16" />
        <span>ช่อง x ตามแนวยาว</span>
        <InputNumber size="small" min={1} max={12} value={rows} onChange={(v) => setRows(v ?? 1)} className="w-16" />
        <span>แถว</span>
      </div>
      <div className="text-[11px] text-slate-500">
        ได้ {total} ช่อง ช่องละประมาณ {cellW.toFixed(1)} x {cellL.toFixed(1)} ม. · ช่องแรกใช้ Location เดิม ({zone.locationCode || zone.code}) สต๊อกที่อยู่ตอนนี้จึงไม่เปลี่ยน
      </div>
      <Checkbox checked={createLocations} onChange={(e) => setCreateLocations(e.target.checked)}>
        <span className="text-xs">สร้าง Location ในระบบให้ช่องใหม่ (รหัส {zone.code}-02, -03 …) ตอนกดบันทึก</span>
      </Checkbox>
      <div>
        <Button
          size="small"
          type="primary"
          icon={<AppstoreAddOutlined />}
          disabled={total < 2}
          onClick={() => onSplit(rows, cols, createLocations)}
        >
          แบ่งเป็น {total} ช่อง
        </Button>
      </div>
    </div>
  );
};
