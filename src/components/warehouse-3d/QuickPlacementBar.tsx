"use client";

import React from "react";
import { Button, Popconfirm, Tooltip, Space } from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  ClearOutlined,
  EditOutlined,
  AppstoreOutlined,
  BorderOutlined,
  InboxOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import type {
  RackConfig,
  ZoneConfig,
  StorageTankConfig,
} from "@/types/warehouse-3d";

interface QuickPlacementBarProps {
  onAddRack: () => void;
  onAddZone: () => void;
  onAddTank: () => void;
  onClearLayout: () => void;
  onSaveLayout: () => void;
  onOpenEditor: () => void;
  isSaving: boolean;
  hasUnsavedChanges?: boolean;
  totalEquipment: number;
}

export const QuickPlacementBar: React.FC<QuickPlacementBarProps> = ({
  onAddRack,
  onAddZone,
  onAddTank,
  onClearLayout,
  onSaveLayout,
  onOpenEditor,
  isSaving,
  hasUnsavedChanges = false,
  totalEquipment,
}) => {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl px-4 py-2.5 shadow-2xl text-white select-none">
      {/* Label / Equipment Counter */}
      <div className="hidden md:flex items-center gap-2 pr-3 border-r border-slate-700 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-200">
          พื้นที่จัดเก็บ: <strong className="text-emerald-400 font-mono">{totalEquipment}</strong> โซน
        </span>
      </div>

      {/* Add Items Buttons */}
      <div className="flex items-center gap-1.5">
        <Tooltip title="เพิ่มพื้นที่จัดเก็บใหม่ (Location Zone) ลงในผังคลัง">
          <button
            type="button"
            onClick={onAddZone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer shadow"
          >
            <BorderOutlined />
            <span>+ วางพื้นที่ / Location โซน</span>
          </button>
        </Tooltip>
      </div>

      <div className="h-5 w-[1px] bg-slate-700 mx-1" />

      {/* Actions: Editor, Clear, Save */}
      <div className="flex items-center gap-1.5">
        <Tooltip title="เปิดแผงปรับแต่งพิกัดและขนาดอย่างละเอียด">
          <button
            type="button"
            onClick={onOpenEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition cursor-pointer"
          >
            <EditOutlined />
            <span className="hidden sm:inline">ปรับละเอียด</span>
          </button>
        </Tooltip>

        <Popconfirm
          title="ต้องการล้างผังให้เป็นคลังเปล่า?"
          description="อุปกรณ์และชั้นวางทั้งหมดในผังนี้จะถูกนำออก"
          onConfirm={onClearLayout}
          okText="ล้างผัง"
          cancelText="ยกเลิก"
        >
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-red-950/80 hover:border-red-600/50 text-slate-400 hover:text-red-400 font-medium text-xs border border-slate-700 transition cursor-pointer"
            title="ล้างอุปกรณ์ทั้งหมดให้เป็นคลังเปล่า"
          >
            <ClearOutlined />
            <span className="hidden lg:inline">ล้างเป็นคลังเปล่า</span>
          </button>
        </Popconfirm>

        <button
          type="button"
          onClick={onSaveLayout}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-lg ${
            hasUnsavedChanges
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white animate-pulse"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          <SaveOutlined />
          <span>{isSaving ? "กำลังบันทึก..." : "💾 บันทึกผังคลังนี้"}</span>
        </button>
      </div>
    </div>
  );
};
