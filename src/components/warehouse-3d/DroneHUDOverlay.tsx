"use client";

import React from "react";
import { useT } from "@/lib/i18n/useT";
import {
  AimOutlined,
  CompassOutlined,
  LogoutOutlined,
  SendOutlined,
} from "@ant-design/icons";

interface DroneHUDOverlayProps {
  active: boolean;
  onExit: () => void;
}

export const DroneHUDOverlay: React.FC<DroneHUDOverlayProps> = ({
  active,
  onExit,
}) => {
  const t = useT();
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 select-none">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 backdrop-blur-md text-emerald-400 font-mono text-xs shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold tracking-wider">DRONE FLIGHT HUD</span>
          <span className="text-slate-500">|</span>
          <span>LIVE CAM [IS-01]</span>
        </div>

        {/* Exit Button (Needs pointer-events-auto) */}
        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs shadow-lg backdrop-blur-md transition cursor-pointer"
        >
          <LogoutOutlined className="text-sm" />
          <span>{t("ออกจากโหมดสำรวจ (ESC)")}</span>
        </button>
      </div>

      {/* Center Flight Reticle / Crosshair */}
      <div className="relative flex items-center justify-center m-auto opacity-75">
        <div className="w-20 h-20 rounded-full border border-dashed border-emerald-400/50 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <div className="absolute w-28 h-[1px] bg-emerald-400/40" />
        <div className="absolute h-28 w-[1px] bg-emerald-400/40" />
      </div>

      {/* Bottom Flight Controls Guide */}
      <div className="flex items-end justify-between">
        <div className="px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/60 backdrop-blur-md text-slate-300 font-mono text-xs space-y-1 shadow-2xl">
          <div className="text-orange-400 font-bold mb-1">{t("🎮 แป้นควบคุมการบิน:")}</div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-600">W / A / S / D</span>
            <span>{t("เดินหน้า / เลี้ยวซ้าย / ถอยหลัง / ขวา")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-600">Space / E</span>
            <span>{t("บินขึ้น")}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-600 ml-2">Shift / Q</span>
            <span>{t("บินลง")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-600">Mouse Drag</span>
            <span>{t("หันมุมกล้อง 360°")}</span>
          </div>
        </div>

        <div className="px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/60 backdrop-blur-md text-emerald-400 font-mono text-xs shadow-2xl text-right">
          <div className="text-slate-400 font-semibold mb-1">SYSTEM STATUS</div>
          <div>BATTERY: 98%</div>
          <div>SIGNAL: 5G EXCELLENT</div>
          <div>COLLISION AVOIDANCE: ON</div>
        </div>
      </div>
    </div>
  );
};
