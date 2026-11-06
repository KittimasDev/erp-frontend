"use client";

import React, { useState, useMemo } from "react";
import {
  EnvironmentOutlined,
  InboxOutlined,
  CopyOutlined,
  CheckOutlined,
  DownloadOutlined,
  AppstoreOutlined,
  SettingOutlined,
  EyeOutlined,
  PlusOutlined,
  TagsOutlined,
  SearchOutlined,
  AimOutlined,
} from "@ant-design/icons";
import { App, Tag, Button, Input, Tooltip } from "antd";
import type { Selected3DObject, Warehouse3DLayoutConfig, ZoneConfig, ZoneLot } from "@/types/warehouse-3d";
import ItemImage from "@/components/masters/items/ItemImage";
import { ZoneLotList } from "./ZoneLotList";
import { useStockBalancesQuery } from "@/hooks/inventory/useInventoryQueries";
import { useT } from "@/lib/i18n/useT";

export interface WarehouseLocationItem {
  id: string;
  locationCode: string;
  locationName: string;
  description?: string;
  isActive?: boolean;
  parentLocationId?: string | null;
}

interface Warehouse3DRightPanelProps {
  selectedObject: Selected3DObject | null;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  locations?: WarehouseLocationItem[];
  layout?: Warehouse3DLayoutConfig;
  onSelectObject?: (obj: Selected3DObject) => void;
  onOpenEditor?: () => void;
  onSelectLocationForPicker?: (locationCode: string, locationId?: string) => void;
  isPickerMode?: boolean;
  /** Lot จริงจัดกลุ่มตาม locationId */
  lotsByLocation?: Map<string, ZoneLot[]>;
}

export const Warehouse3DRightPanel: React.FC<Warehouse3DRightPanelProps> = ({
  selectedObject,
  warehouseId,
  warehouseCode,
  warehouseName,
  locations = [],
  layout,
  onSelectObject,
  onOpenEditor,
  onSelectLocationForPicker,
  isPickerMode = false,
  lotsByLocation,
}) => {
  const t = useT();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<"detail" | "locations" | "stock" | "summary">("locations");
  const [copied, setCopied] = useState(false);

  // เลือกโซนบนภาพ 3D แล้วสลับไปแท็บรายละเอียดให้เอง
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(null);
  if ((selectedObject?.id ?? null) !== prevSelectedId) {
    setPrevSelectedId(selectedObject?.id ?? null);
    if (selectedObject) setActiveTab("detail");
  }
  const [locationSearch, setLocationSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<"ALL" | "MAPPED" | "UNMAPPED">("ALL");

  // Live stock balance query for the whole warehouse or location
  const { data: stockBalancesData, isLoading: isStockLoading } = useStockBalancesQuery({
    warehouseId,
  });

  const stockRows = stockBalancesData?.data ?? [];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    message.success(t("คัดลอกรหัส {code} สำเร็จแล้ว", { code }));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (!stockRows || stockRows.length === 0) {
      message.warning(t("ไม่มีข้อมูลสต๊อกสำหรับส่งออก"));
      return;
    }
    const headers = "รหัสสินค้า,ชื่อสินค้า,ตำแหน่งจัดเก็บ,จำนวนคงเหลือ,หน่วย\n";
    const rows = stockRows
      .map(
        (r) =>
          `"${r.itemCode}","${r.itemNameTh || ''}","${r.locationCode || ''}",${r.quantityOnHand},"${r.unitCode || ''}"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `warehouse_${warehouseCode}_stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(t("ส่งออก CSV สต๊อกสำเร็จแล้ว"));
  };

  // Find 3D entity bound to a location (only zones)
  const getLocationBinding = (loc: WarehouseLocationItem) => {
    const zone = layout?.zones?.find(
      (z) => z.locationId === loc.id || z.code === loc.locationCode || (z as any).locationCode === loc.locationCode,
    );
    if (zone) return { type: "zone" as const, entity: zone };
    return null;
  };

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchSearch =
        !locationSearch ||
        loc.locationCode.toLowerCase().includes(locationSearch.toLowerCase()) ||
        loc.locationName.toLowerCase().includes(locationSearch.toLowerCase()) ||
        (loc.description && loc.description.toLowerCase().includes(locationSearch.toLowerCase()));

      if (!matchSearch) return false;

      const binding = getLocationBinding(loc);
      if (locationFilter === "MAPPED") return Boolean(binding);
      if (locationFilter === "UNMAPPED") return !binding;

      return true;
    });
  }, [locations, locationSearch, locationFilter, layout]);

  // Find matching location details for selectedObject
  const selectedLocationMeta = useMemo(() => {
    if (!selectedObject) return null;
    return locations.find(
      (l) => l.id === selectedObject.locationId || l.locationCode === (selectedObject.locationCode || selectedObject.code),
    );
  }, [selectedObject, locations]);

  // Handle clicking a location from list to highlight in 3D
  const handleFocusLocationIn3D = (loc: WarehouseLocationItem) => {
    const binding = getLocationBinding(loc);
    if (!binding || !onSelectObject) {
      if (onOpenEditor) {
        onOpenEditor();
      }
      return;
    }

    const z = binding.entity as ZoneConfig;
    const zoneItems = z.items && z.items.length > 0 ? z.items : [
      {
        itemCode: "RAW-RUB-01",
        itemName: "ยางดิบ / ยางก้อนถ้วย (Raw Natural Rubber)",
        lotNumber: "LOT-RAW-202610-01",
        quantity: 14500,
        unit: "กก.",
      },
      {
        itemCode: "CAKE-RUB-02",
        itemName: "ขี้ยาง / ยางเค้ก (Rubber Cake Slab)",
        lotNumber: "LOT-CAKE-202610-02",
        quantity: 8200,
        unit: "กก.",
      },
    ];
    const currentStock = zoneItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    onSelectObject({
      type: "zone",
      lots: lotsByLocation?.get(loc.id) ?? [],
      id: z.id,
      code: loc.locationCode || z.code,
      name: z.name,
      locationId: loc.id,
      locationCode: loc.locationCode,
      capacity: 40000,
      currentStock,
      utilizationPercent: Math.min(100, Math.round((currentStock / 40000) * 100)),
      items: zoneItems,
    });
    setActiveTab("detail");
  };

  return (
    <aside
      aria-label="3D Warehouse Details Panel"
      className="w-96 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-slate-200 select-none max-h-[calc(100vh-140px)] overflow-y-auto z-10"
    >
      {/* Panel Tab Switcher */}
      <div className="flex rounded-xl bg-slate-950/70 p-1 border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("detail")}
          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
            activeTab === "detail"
              ? "bg-orange-600 text-white shadow font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t("ตำแหน่งที่เลือก")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("locations")}
          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
            activeTab === "locations"
              ? "bg-orange-600 text-white shadow font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t("ผังตำแหน่ง ({n})", { n: locations.length })}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
            activeTab === "stock"
              ? "bg-orange-600 text-white shadow font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t("สินค้า")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
            activeTab === "summary"
              ? "bg-orange-600 text-white shadow font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t("สต๊อกรวม")}
        </button>
      </div>

      {/* TAB 1: Selected Object Detail */}
      {activeTab === "detail" && (
        <div className="space-y-3">
          {selectedObject ? (
            <>
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/40">
                  {selectedObject.type === "rack_slot"
                    ? t("📦 ช่องแร็ค (Rack Slot)")
                    : selectedObject.type === "rack"
                    ? t("📦 แถวชั้นวางพาเลท (Rack)")
                    : selectedObject.type === "zone"
                    ? t("🏗️ ลานกองระดับพื้น (Floor Zone)")
                    : selectedObject.type === "tank"
                    ? t("🛢️ ถังบรรจุของเหลว (Liquid Tank)")
                    : t("📍 ตำแหน่งจัดเก็บ")}
                </span>
                <span className="text-xs text-slate-400">
                  {t("คลัง:")} <strong className="text-slate-200">{warehouseCode}</strong>
                </span>
              </div>

              {/* Title & Code */}
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <EnvironmentOutlined className="text-orange-400" />
                  <span>{selectedObject.name}</span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs border border-slate-700 font-bold">
                    {selectedObject.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedObject.code)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    title={t("คัดลอกรหัส")}
                  >
                    {copied ? <CheckOutlined className="text-emerald-400" /> : <CopyOutlined />}
                  </button>
                </div>
              </div>

              {/* Linked Warehouse Location Information */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {t("ผูกกับ Location ในระบบ (Warehouse Location)")}
                </div>
                {selectedLocationMeta ? (
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <span>✓ {selectedLocationMeta.locationCode}</span>
                      <span className="text-white font-normal">- {selectedLocationMeta.locationName}</span>
                    </div>
                    {selectedLocationMeta.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedLocationMeta.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-[11px]">{t("⚠️ ยังไม่ได้เชื่อม Location ในระบบ")}</span>
                    {onOpenEditor && (
                      <button
                        type="button"
                        onClick={onOpenEditor}
                        className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                      >
                        {t("ผูกตอนนี้")}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bay & Level Breakdown (if rack slot) */}
              {selectedObject.type === "rack_slot" && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">{t("ช่วงเสา (Bay)")}</span>
                    <span className="text-white font-bold text-sm">{t("ช่องที่ {n}", { n: selectedObject.bay ?? "" })}</span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">{t("ระดับชั้น (Tier)")}</span>
                    <span className="text-white font-bold text-sm">{t("ชั้นที่ {n}", { n: selectedObject.level ?? "" })}</span>
                  </div>
                </div>
              )}

              {/* Capacity & Utilization Gauge */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{t("อัตราการใช้งานพื้นที่ (Utilization)")}</span>
                  <span className="font-bold text-orange-400">
                    {selectedObject.utilizationPercent ?? 0}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (selectedObject.utilizationPercent ?? 0) > 80
                        ? "bg-rose-500"
                        : (selectedObject.utilizationPercent ?? 0) > 50
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${selectedObject.utilizationPercent ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t("คงเหลือ:")} {selectedObject.currentStock ?? 0}</span>
                  <span>{t("ความจุ:")} {selectedObject.capacity ?? 0}</span>
                </div>
              </div>

              {/* Lot จริงในตำแหน่งนี้ พร้อมรูปสินค้า */}
              {selectedObject.type === "zone" && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <InboxOutlined className="text-orange-400" />
                    <span>{t("สินค้า/Lot ในตำแหน่งนี้ ({n})", { n: selectedObject.lots?.length ?? 0 })}</span>
                  </div>
                  <ZoneLotList lots={selectedObject.lots ?? []} />
                </div>
              )}

              {/* Stored Items & Lots Breakdown */}
              {selectedObject.type !== "zone" && selectedObject.items && selectedObject.items.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <InboxOutlined className="text-orange-400" />
                      <span>{t("สินค้าที่จัดเก็บในตำแหน่งนี้ ({n})", { n: selectedObject.items.length })}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {t("รวม")} {selectedObject.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0).toLocaleString()} {selectedObject.items[0]?.unit || t("กก.")}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedObject.items.map((it, idx) => (
                      <div
                        key={`${it.itemCode}-${idx}`}
                        className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 hover:border-slate-700 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-white text-xs block">
                              {it.itemName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {it.itemCode}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold text-xs">
                              {Number(it.quantity).toLocaleString()}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1">{it.unit}</span>
                          </div>
                        </div>

                        {it.lotNumber && (
                          <div className="mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-slate-800/60 text-[11px]">
                            <span className="text-slate-400 text-[10px]">Lot No:</span>
                            <Tag color="geekblue" className="font-mono text-[10px] m-0 px-1 py-0 leading-tight">
                              {it.lotNumber}
                            </Tag>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions: Edit 3D Space or Select Location */}
              <div className="flex gap-2">
                {onOpenEditor && (
                  <button
                    type="button"
                    onClick={onOpenEditor}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <SettingOutlined className="text-amber-400" />
                    <span>{t("ปรับแต่งพื้นที่ 3D")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectLocationForPicker) {
                      onSelectLocationForPicker(
                        selectedObject.locationCode || selectedObject.code,
                        selectedObject.locationId,
                      );
                    } else {
                      handleCopyCode(selectedObject.locationCode || selectedObject.code);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckOutlined />
                  <span>{isPickerMode ? t("ยืนยันเลือก") : t("คัดลอกรหัส")}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 px-4 space-y-2 text-slate-400">
              <EnvironmentOutlined className="text-2xl text-slate-600 mx-auto animate-bounce" />
              <div className="text-xs font-semibold text-slate-300">{t("ยังไม่ได้เลือกตำแหน่ง")}</div>
              <p className="text-[11px] leading-relaxed">
                {t("คลิกที่ชั้นวางแพลเล็ต ลานกอง หรือถังบรรจุในโมเดล 3D หรือเลือกจากแท็บ “ผังตำแหน่ง” ด้านบน")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOCATIONS DIRECTORY & 3D SPATIAL PARTITIONS */}
      {activeTab === "locations" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1">
              <TagsOutlined className="text-orange-400" />
              <span>{t("ตำแหน่งทั้งหมดในคลัง ({n})", { n: locations.length })}</span>
            </span>
            {onOpenEditor && (
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined className="text-amber-400" />}
                onClick={onOpenEditor}
                className="text-[11px] text-slate-300 hover:text-white p-0 h-auto"
              >
                {t("จัดการผัง 3D")}
              </Button>
            )}
          </div>

          {/* Search Box */}
          <Input
            size="small"
            placeholder={t("ค้นหารหัส หรือชื่อตำแหน่ง...")}
            prefix={<SearchOutlined className="text-slate-500" />}
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            allowClear
            className="bg-slate-950 border-slate-700 text-white text-xs h-7"
          />

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
            <button
              type="button"
              onClick={() => setLocationFilter("ALL")}
              className={`px-2 py-0.5 rounded-full transition cursor-pointer whitespace-nowrap ${
                locationFilter === "ALL"
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t("ทั้งหมด ({n})", { n: locations.length })}
            </button>
            <button
              type="button"
              onClick={() => setLocationFilter("MAPPED")}
              className={`px-2 py-0.5 rounded-full transition cursor-pointer whitespace-nowrap ${
                locationFilter === "MAPPED"
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t("มีผัง 3D ({n})", { n: layout?.zones?.length || 0 })}
            </button>
            <button
              type="button"
              onClick={() => setLocationFilter("UNMAPPED")}
              className={`px-2 py-0.5 rounded-full transition cursor-pointer whitespace-nowrap ${
                locationFilter === "UNMAPPED"
                  ? "bg-amber-600 text-white font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t("ยังไม่ผูก")}
            </button>
          </div>

          {/* Location Cards List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => {
                const binding = getLocationBinding(loc);
                const itemsInLoc = stockRows.filter((r) => r.locationCode === loc.locationCode);
                const totalQty = itemsInLoc.reduce((acc, curr) => acc + Number(curr.quantityOnHand || 0), 0);

                return (
                  <div
                    key={loc.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono font-bold text-amber-300 text-xs">
                        {loc.locationCode}
                      </span>
                      {binding ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span>{t("✓ ผูกพื้นที่ 3D แล้ว")}</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                          {t("⚪ ยังไม่วางผัง 3D")}
                        </span>
                      )}
                    </div>

                    <div className="font-medium text-white truncate">
                      {loc.locationName}
                    </div>

                    {loc.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {loc.description}
                      </p>
                    )}

                    {/* Spatial Allocation Badge */}
                    <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
                      {binding ? (
                        <div className="text-[11px] text-slate-300 truncate">
                          <span className="text-emerald-400 flex items-center gap-1.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: (binding.entity as ZoneConfig).color || "#10b981" }}
                            />
                            <span>{(binding.entity as ZoneConfig).name}</span>
                            <span className="text-slate-500 text-[10px]">
                              ({(binding.entity as ZoneConfig).dimensions[0]}x{(binding.entity as ZoneConfig).dimensions[2]}{t("ม.")})
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {t("กดจัดสรรพื้นที่เพื่อวางโมเดล")}
                        </span>
                      )}

                      {/* Action Button */}
                      {binding ? (
                        <button
                          type="button"
                          onClick={() => handleFocusLocationIn3D(loc)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                          title={t("ซูม/เลือกจุดนี้ใน 3D")}
                        >
                          <AimOutlined />
                          <span>{t("ดูใน 3D")}</span>
                        </button>
                      ) : (
                        onOpenEditor && (
                          <button
                            type="button"
                            onClick={onOpenEditor}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-semibold transition cursor-pointer"
                          >
                            {t("+ วางในผัง")}
                          </button>
                        )
                      )}
                    </div>

                    {/* รูปสินค้าที่อยู่ในตำแหน่งนี้ */}
                    {(lotsByLocation?.get(loc.id) ?? []).length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        {Array.from(
                          new Map((lotsByLocation?.get(loc.id) ?? []).map((l) => [l.itemId, l])).values(),
                        )
                          .slice(0, 5)
                          .map((l) => (
                            <ItemImage
                              key={l.itemId}
                              itemId={l.itemId}
                              imageFileName={l.imageFileName}
                              size={30}
                              alt={l.itemName}
                              className="!border-slate-700 !bg-slate-800"
                            />
                          ))}
                        <span className="text-[10px] text-slate-400 ml-1">
                          {(lotsByLocation?.get(loc.id) ?? []).length} lot
                        </span>
                      </div>
                    )}

                    {/* Stock note if available */}
                    {totalQty > 0 && (
                      <div className="text-[10px] text-emerald-400 font-mono flex items-center justify-between bg-slate-900/60 px-1.5 py-0.5 rounded">
                        <span>{t("คงเหลือ:")} {totalQty.toLocaleString()}</span>
                        <span className="text-slate-400">{t("{n} รายการ", { n: itemsInLoc.length })}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                {t("ไม่พบตำแหน่งที่ตรงกับเงื่อนไขค้นหา")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Stock items in this slot */}
      {activeTab === "stock" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              {selectedObject ? t("รายการใน {code}", { code: selectedObject.code }) : t("สินค้าในตำแหน่ง")}
            </span>
            <span className="text-[10px] text-slate-500">Live Lots</span>
          </div>

          {selectedObject?.items && selectedObject.items.length > 0 ? (
            <div className="space-y-2">
              {selectedObject.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.itemCode}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                      {item.quantity.toLocaleString()} {item.unit}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">
                    {item.itemName}
                  </div>
                  {item.lotNumber && (
                    <div className="text-[10px] text-amber-300 font-mono">
                      Lot: {item.lotNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              <InboxOutlined className="text-3xl text-slate-700 mx-auto mb-1" />
              <span>{t("ไม่มีสินค้าคงเหลือในตำแหน่งนี้")}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Warehouse Stock Summary with CSV Export */}
      {activeTab === "summary" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">{t("ภาพรวมสต๊อก {name}", { name: warehouseName })}</span>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-orange-400 text-[11px] font-medium border border-slate-700 transition cursor-pointer"
            >
              <DownloadOutlined />
              <span>{t("ส่งออก CSV")}</span>
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {isStockLoading ? (
              <div className="text-center py-6 text-xs text-slate-500">{t("กำลังโหลดสต๊อก...")}</div>
            ) : stockRows.length > 0 ? (
              stockRows.slice(0, 15).map((row, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-white truncate">{row.itemNameTh}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {row.itemCode} {row.locationCode ? `• ${row.locationCode}` : ''}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap font-mono text-amber-400">
                    {Number(row.quantityOnHand).toLocaleString()} <span className="text-[10px] text-slate-400">{row.unitCode}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">{t("ไม่มีข้อมูลสต๊อกในคลังนี้")}</div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
