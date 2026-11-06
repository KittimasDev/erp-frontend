"use client";

import React from "react";
import {
  CameraOutlined,
  EyeOutlined,
  FireOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  AppstoreOutlined,
  CompassOutlined,
  FullscreenOutlined,
  SlidersOutlined,
} from "@ant-design/icons";
import type { LightingPreset } from "@/types/warehouse-3d";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";

interface Warehouse3DLeftPanelProps {
  explodeFactor: number;
  onExplodeChange: (val: number) => void;
  heatmapMode: boolean;
  onHeatmapToggle: (val: boolean) => void;
  lighting: LightingPreset;
  onLightingChange: (preset: LightingPreset) => void;
  layers: {
    racks: boolean;
    zones: boolean;
    tanks: boolean;
    docks: boolean;
    annotations: boolean;
  };
  onToggleLayer: (layerKey: keyof Warehouse3DLeftPanelProps["layers"]) => void;
  onCameraPreset: (preset: "overview" | "top" | "dock" | "aisle" | "side") => void;
}

export const Warehouse3DLeftPanel: React.FC<Warehouse3DLeftPanelProps> = ({
  explodeFactor,
  onExplodeChange,
  heatmapMode,
  onHeatmapToggle,
  lighting,
  onLightingChange,
  layers,
  onToggleLayer,
  onCameraPreset,
}) => {
  const t = useT();
  const lang = useLanguage();
  return (
    <aside
      aria-label="3D Controls Panel"
      className="w-72 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 text-slate-200 select-none max-h-[calc(100vh-140px)] overflow-y-auto z-10"
    >
      {/* 1. Camera View Presets */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
          <CameraOutlined />
          <span>{t("มุมมองกล้อง (Camera Views)")}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onCameraPreset("overview")}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-orange-600/80 hover:text-white border border-slate-700/50 transition cursor-pointer"
          >
            <span>{t("🌐 3D ภาพรวม")}</span>
          </button>
          <button
            type="button"
            onClick={() => onCameraPreset("top")}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-orange-600/80 hover:text-white border border-slate-700/50 transition cursor-pointer"
          >
            <span>{t("📐 Top ผังบน")}</span>
          </button>
          <button
            type="button"
            onClick={() => onCameraPreset("dock")}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-orange-600/80 hover:text-white border border-slate-700/50 transition cursor-pointer"
          >
            <span>{t("🚪 ท่ารับสินค้า")}</span>
          </button>
          <button
            type="button"
            onClick={() => onCameraPreset("aisle")}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-orange-600/80 hover:text-white border border-slate-700/50 transition cursor-pointer"
          >
            <span>{t("🚶 ทางเดิน Aisle")}</span>
          </button>
          <button
            type="button"
            onClick={() => onCameraPreset("side")}
            className="col-span-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-orange-600/80 hover:text-white border border-slate-700/50 transition cursor-pointer"
          >
            <span>{t("✂️ ภาพตัดด้านข้าง (Cross Section)")}</span>
          </button>
        </div>
      </div>



      <hr className="border-slate-700/50" />

      {/* 3. Heatmap Occupancy Mode */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-orange-400 mb-2">
          <div className="flex items-center gap-1.5 uppercase tracking-wider">
            <FireOutlined />
            <span>{t("แผนที่ความจุ (Heatmap)")}</span>
          </div>
          <button
            type="button"
            onClick={() => onHeatmapToggle(!heatmapMode)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
              heatmapMode
                ? "bg-orange-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {heatmapMode ? t("เปิดอยู่") : lang === "en" ? "Off" : "ปิด"}
          </button>
        </div>
        {/* Heatmap Legend */}
        <div className="space-y-1 text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>{t("ว่าง (Empty)")}</span>
            </span>
            <span className="text-slate-400">0%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{t("ปกติ (Normal)")}</span>
            </span>
            <span className="text-emerald-400">&lt; 50%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{t("หนาแน่น (Busy)")}</span>
            </span>
            <span className="text-amber-400">50 - 80%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>{t("เต็ม / วิกฤต (Full)")}</span>
            </span>
            <span className="text-rose-400">&gt; 80%</span>
          </div>
        </div>
      </div>

      <hr className="border-slate-700/50" />

      {/* 4. Layer Filters */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
          <SlidersOutlined />
          <span>{t("ชั้นข้อมูล (Layers)")}</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <button
            type="button"
            onClick={() => onToggleLayer("zones")}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">🟩</span>
              <span>{t("พื้นที่จัดเก็บ Location (Zones)")}</span>
            </span>
            {layers.zones ? (
              <CheckSquareOutlined className="text-emerald-400" />
            ) : (
              <BorderOutlined className="text-slate-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onToggleLayer("docks")}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">🚪</span>
              <span>{t("ประตูท่าเทียบ (Docks)")}</span>
            </span>
            {layers.docks ? (
              <CheckSquareOutlined className="text-emerald-400" />
            ) : (
              <BorderOutlined className="text-slate-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onToggleLayer("annotations")}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <EyeOutlined className="text-indigo-400" />
              <span>{t("ป้ายกำกับลอย (3D Badges)")}</span>
            </span>
            {layers.annotations ? (
              <CheckSquareOutlined className="text-indigo-400" />
            ) : (
              <BorderOutlined className="text-slate-500" />
            )}
          </button>
        </div>
      </div>

      <hr className="border-slate-700/50" />

      {/* 5. Lighting / Atmosphere Toggle */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
          <span>{t("💡 บรรยากาศแสง (Lighting)")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-xs">
          <button
            type="button"
            onClick={() => onLightingChange("day")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border transition cursor-pointer ${
              lighting === "day"
                ? "bg-orange-500/30 border-orange-400 text-orange-300 font-bold"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
            }`}
          >
            <span>☀️</span>
            <span className="text-[10px]">{t("กลางวัน")}</span>
          </button>
          <button
            type="button"
            onClick={() => onLightingChange("night")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border transition cursor-pointer ${
              lighting === "night"
                ? "bg-orange-500/30 border-orange-400 text-orange-300 font-bold"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
            }`}
          >
            <span>🌙</span>
            <span className="text-[10px]">High-Bay</span>
          </button>
          <button
            type="button"
            onClick={() => onLightingChange("sunset")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border transition cursor-pointer ${
              lighting === "sunset"
                ? "bg-orange-500/30 border-orange-400 text-orange-300 font-bold"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
            }`}
          >
            <span>🌅</span>
            <span className="text-[10px]">Golden</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
