"use client";

import React, { useState, useMemo } from "react";
import { Input, Tag, Button, Empty } from "antd";
import {
  SearchOutlined,
  HomeOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  PlusCircleOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { Warehouse } from "@/types/warehouses";
import type { CampusRoadConfig } from "@/types/warehouse-3d";
import { FactorySiteMap3D } from "./FactorySiteMap3D";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useT } from "@/lib/i18n/useT";

interface WarehouseCatalogViewProps {
  warehouses: Warehouse[];
  onSelectWarehouse: (warehouseId: string) => void;
  onSaveSitePositions: (
    updates: Array<{
      id: string;
      sitePosition: [number, number];
      siteRotation: number;
      siteSize?: [number, number, number];
    }>,
    roads?: CampusRoadConfig[],
  ) => Promise<void>;
  isLoading?: boolean;
  onBackToRealMap?: () => void;
}

export const WarehouseCatalogView: React.FC<WarehouseCatalogViewProps> = ({
  warehouses,
  onSelectWarehouse,
  onSaveSitePositions,
  isLoading = false,
  onBackToRealMap,
}) => {
  const t = useT();
  // View Type: 3D Campus Site Map (default!) vs Card List
  const [viewType, setViewType] = useState<"sitemap" | "cards">("sitemap");

  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  const groups = useMemo(() => {
    const set = new Set<string>();
    warehouses.forEach((w) => {
      if (w.warehouseType) set.add(w.warehouseType);
    });
    return ["ALL", ...Array.from(set)];
  }, [warehouses]);

  // ตำแหน่งจัดเก็บ (location) ของทุกคลัง จัดกลุ่มตามคลัง เพื่อโชว์บนการ์ด
  const { data: allLocationsData } = useWarehouseLocationsQuery({ isActive: true });
  const locationsByWarehouse = useMemo(() => {
    const map = new Map<string, Array<{ id: string; locationCode: string; locationName: string }>>();
    for (const loc of allLocationsData?.data ?? []) {
      const list = map.get(loc.warehouseId) ?? [];
      list.push(loc);
      map.set(loc.warehouseId, list);
    }
    return map;
  }, [allLocationsData]);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      const matchSearch =
        !search ||
        w.warehouseCode.toLowerCase().includes(search.toLowerCase()) ||
        w.warehouseName.toLowerCase().includes(search.toLowerCase()) ||
        (w.description && w.description.toLowerCase().includes(search.toLowerCase()));

      const matchGroup =
        selectedGroup === "ALL" || w.warehouseType === selectedGroup;

      return matchSearch && matchGroup;
    });
  }, [warehouses, search, selectedGroup]);

  return (
    <div className="w-full h-[calc(100dvh-72px)] bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden">
      {/* 1. TOP VIEW SWITCHER HEADER */}
      <header className="h-14 shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2">
          <EnvironmentOutlined className="text-orange-500 text-lg" />
          <span className="font-extrabold text-sm tracking-wide text-white">
            SMT Plant & Warehouse 3D
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {t("เลือกคลังสินค้า หรือดูผังที่ตั้งโรงงาน")}
          </span>
        </div>

        {/* View Switcher: 3D Map vs Card List */}
        <div className="flex items-center gap-2">
          {onBackToRealMap && (
            <button
              type="button"
              onClick={onBackToRealMap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer bg-blue-600 hover:bg-blue-500 text-white shadow text-xs"
            >
              <CompassOutlined />
              <span>{t("🗺️ แผนที่จริงโรงงาน (SMT Biomass)")}</span>
            </button>
          )}
          <div className="flex items-center rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => setViewType("sitemap")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              viewType === "sitemap"
                ? "bg-orange-600 text-white shadow font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CompassOutlined />
            <span>{t("🗺️ ผังที่ตั้งโรงงาน 3D (Site Map)")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewType("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              viewType === "cards"
                ? "bg-orange-600 text-white shadow font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UnorderedListOutlined />
            <span>{t("📋 รายการการ์ดคลัง (Card List)")}</span>
          </button>
        </div>
        </div>
      </header>

      {/* 2. BODY CONTENT: EITHER 3D SITE MAP OR CARDS LIST */}
      {viewType === "sitemap" ? (
        <main className="relative w-full h-[calc(100dvh-128px)] overflow-hidden">
          <FactorySiteMap3D
            warehouses={warehouses}
            onSelectWarehouse={onSelectWarehouse}
            onSaveSitePositions={onSaveSitePositions}
          />
        </main>
      ) : (
        <main className="flex-1 w-full overflow-y-auto p-6 sm:p-10 flex flex-col items-center">
          {/* Search & Category Filters */}
          <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-xl">
            <div className="w-full sm:w-80">
              <Input
                placeholder={t("ค้นหารหัส หรือชื่อคลังสินค้า...")}
                prefix={<SearchOutlined className="text-slate-400" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                className="bg-slate-950 border-slate-700 text-white rounded-xl placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-end">
              {groups.map((group) => {
                const isSelected = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                      isSelected
                        ? "bg-orange-600 text-white border-orange-500 shadow-md"
                        : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-700/60"
                    }`}
                  >
                    {group === "ALL" ? t("ทั้งหมด") : group}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warehouses Grid Cards */}
          <div className="w-full max-w-6xl">
            {filteredWarehouses.length === 0 ? (
              <div className="py-16 text-center">
                <Empty
                  description={
                    <span className="text-slate-400">
                      {t("ไม่พบคลังสินค้าที่ตรงกับคำค้นหา")}
                    </span>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWarehouses.map((wh) => {
                  const layout3d = wh.layout3dConfig as
                    | Record<string, any>
                    | undefined;
                  const hasRacks = (layout3d?.racks?.length || 0) > 0;
                  const hasZones = (layout3d?.zones?.length || 0) > 0;
                  const hasTanks = (layout3d?.tanks?.length || 0) > 0;
                  const hasCustom3D = hasRacks || hasZones || hasTanks;
                  const whLocations = locationsByWarehouse.get(wh.id) ?? [];

                  return (
                    <div
                      key={wh.id}
                      onClick={() => onSelectWarehouse(wh.id)}
                      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-orange-500/60 rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 flex flex-col justify-between cursor-pointer overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500/0 group-hover:via-orange-500/80 to-transparent transition-all duration-500" />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 font-mono text-xs font-bold border border-orange-500/30">
                            {wh.warehouseCode}
                          </span>
                          <Tag
                            color="slate"
                            className="font-mono text-[11px] border-slate-700 text-slate-300"
                          >
                            {wh.warehouseType || "GENERAL"}
                          </Tag>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                            {wh.warehouseName}
                          </h3>
                          {wh.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {wh.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="my-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{t("ตำแหน่งจัดเก็บ (Location)")}</span>
                          <span className="font-bold text-emerald-400">
                            {t("{n} ตำแหน่ง", { n: whLocations.length })}
                          </span>
                        </div>
                        {whLocations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {whLocations.slice(0, 8).map((loc) => (
                              <span
                                key={loc.id}
                                title={loc.locationName}
                                className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px]"
                              >
                                {loc.locationCode}
                              </span>
                            ))}
                            {whLocations.length > 8 && (
                              <span className="px-1.5 py-0.5 text-[10px] text-slate-400">
                                {t("+{n} อีก", { n: whLocations.length - 8 })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500">
                            {t("ยังไม่มีตำแหน่งในคลังนี้ เข้าไปเพิ่มได้ในหน้าถัดไป")}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">
                          {hasCustom3D ? t("มีผัง 3 มิติแล้ว") : t("ยังไม่ได้จัดผัง 3 มิติ")}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 group-hover:bg-gradient-to-r group-hover:from-orange-600 group-hover:to-amber-600 text-slate-200 group-hover:text-white font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <span>{t("เข้าสู่พื้นที่คลัง 3D")}</span>
                        <ArrowRightOutlined className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
};
