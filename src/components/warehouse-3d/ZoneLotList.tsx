"use client";

import { formatBuddhistIntl } from "@/lib/datetime/intl-be";
import React from "react";
import ItemImage from "@/components/masters/items/ItemImage";
import type { ZoneLot } from "@/types/warehouse-3d";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";

interface ZoneLotListProps {
  lots: ZoneLot[];
  /** จำกัดจำนวนแถวที่แสดง (ที่เหลือสรุปเป็น "+N") */
  limit?: number;
  imageSize?: number;
}

const fmtDate = (iso: string | undefined, lang: "th" | "en") => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : formatBuddhistIntl(d, lang, { day: "2-digit", month: "short", year: "2-digit" });
};

/** รายการสินค้า/Lot ใน Location พร้อมรูปสินค้าจาก master — ใช้ทั้งการ์ด hover และแผงรายละเอียด */
export const ZoneLotList: React.FC<ZoneLotListProps> = ({ lots, limit, imageSize = 44 }) => {
  const t = useT();
  const lang = useLanguage();
  const shown = limit ? lots.slice(0, limit) : lots;

  if (lots.length === 0) {
    return <div className="text-[11px] text-slate-500 py-2 text-center">{t("ตำแหน่งนี้ยังไม่มีสินค้า")}</div>;
  }

  return (
    <div className="space-y-1.5">
      {shown.map((lot) => (
        <div
          key={lot.lotId}
          className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800"
        >
          <ItemImage
            itemId={lot.itemId}
            imageFileName={lot.imageFileName}
            size={imageSize}
            alt={lot.itemName}
            className="shrink-0 !border-slate-700 !bg-slate-800"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{lot.itemName}</div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              {lot.itemCode} · Lot {lot.lotNo}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {[
                lot.receivedDate ? t("รับเข้า {date}", { date: fmtDate(lot.receivedDate, lang) }) : "",
                lot.expiryDate ? t("หมดอายุ {date}", { date: fmtDate(lot.expiryDate, lang) }) : "",
                lot.qcStatus ? `QC: ${lot.qcStatus}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-emerald-400">{lot.quantity.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400">{lot.unit}</div>
          </div>
        </div>
      ))}
      {limit && lots.length > limit && (
        <div className="text-[10px] text-slate-400 text-center">{t("และอีก {n} lot (คลิกโซนเพื่อดูทั้งหมด)", { n: lots.length - limit })}</div>
      )}
    </div>
  );
};
