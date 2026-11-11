"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { Select, Button, Spin, Empty, App, Tag } from "antd";
import {
  AppstoreOutlined,
  CompassOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SendOutlined,
  EditOutlined,
  SyncOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import {
  useWarehouse3DLayoutQuery,
  useUpdateWarehouse3DLayoutMutation,
} from "@/hooks/warehouses/useWarehouse3DLayoutQuery";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { downloadItemImage } from "@/lib/api/items";
import { getAccessToken } from "@/lib/auth/token";
import type {
  Warehouse3DLayoutConfig,
  Warehouse3DViewMode,
  LightingPreset,
  Selected3DObject,
  RackConfig,
  ZoneConfig,
  StorageTankConfig,
  CampusRoadConfig,
  ZoneLot,
} from "@/types/warehouse-3d";

import { WarehouseCatalogView } from "./WarehouseCatalogView";
import { SMTBiomassMap3D } from "./SMTBiomassMap3D";
import { QuickPlacementBar } from "./QuickPlacementBar";
import { Warehouse3DCanvas } from "./Warehouse3DCanvas";
import { Warehouse3DLeftPanel } from "./Warehouse3DLeftPanel";
import { Warehouse3DRightPanel } from "./Warehouse3DRightPanel";
import { DroneHUDOverlay } from "./DroneHUDOverlay";
import { Warehouse3DLayoutEditorModal } from "./Warehouse3DLayoutEditorModal";
import { ZoneLotList } from "./ZoneLotList";
import { useT } from "@/lib/i18n/useT";

const LOCATION_COLOR_PALETTE = [
  "#10b981", // Emerald Green
  "#f59e0b", // Amber / Warm Orange
  "#06b6d4", // Cyan / Ocean Blue
  "#8b5cf6", // Purple / Violet
  "#ec4899", // Pink / Rose
  "#3b82f6", // Royal Blue
  "#14b8a6", // Teal
  "#eab308", // Golden Yellow
];

// Clean base empty warehouse building template
const EMPTY_WAREHOUSE_BUILDING: Warehouse3DLayoutConfig = {
  building: {
    width: 40,
    length: 60,
    height: 10,
    wallColor: "#334155",
    floorColor: "#1e293b",
    showTrusses: true,
  },
  racks: [],
  zones: [],
  tanks: [],
  docks: [
    {
      id: "DOCK-01",
      name: "ประตูเทียบท่า 1",
      position: [-8, 0, 30],
      width: 4,
      height: 4.5,
      wall: "front",
    },
    {
      id: "DOCK-02",
      name: "ประตูเทียบท่า 2",
      position: [8, 0, 30],
      width: 4,
      height: 4.5,
      wall: "front",
    },
  ],
};

function sanitizeWarehouseLayout(raw: any): Warehouse3DLayoutConfig {
  const cfg = raw || {};
  return {
    ...cfg,
    building: {
      width: Number(cfg.building?.width) || 40,
      length: Number(cfg.building?.length) || 60,
      height: Number(cfg.building?.height) || 10,
      wallColor: cfg.building?.wallColor || "#f1f5f9",
      floorColor: cfg.building?.floorColor || "#94a3b8",
    },
    racks: (Array.isArray(cfg.racks) ? cfg.racks : []).map((r: any, idx: number) => ({
      id: r?.id || `rack-${idx}`,
      name: r?.name || `ชั้นวาง ${idx + 1}`,
      code: r?.code || `RACK-${String(idx + 1).padStart(2, "0")}`,
      position: [
        Number(r?.position?.[0]) || 0,
        Number(r?.position?.[1]) || 0,
        Number(r?.position?.[2]) || 0,
      ],
      rotation: [
        Number(r?.rotation?.[0]) || 0,
        Number(r?.rotation?.[1]) || 0,
        Number(r?.rotation?.[2]) || 0,
      ],
      bays: Number(r?.bays) || 3,
      levels: Number(r?.levels ?? r?.tiers) || 4,
      bayWidth: Number(r?.bayWidth) || 2.7,
      bayDepth: Number(r?.bayDepth ?? r?.depth) || 1.1,
      levelHeight: Number(r?.levelHeight ?? r?.tierHeight) || 1.8,
      color: r?.color || "#ea580c",
      beamColor: r?.beamColor || "#f59e0b",
      locationId: r?.locationId,
      locationCode: r?.locationCode,
      slots: r?.slots,
    })),
    zones: (Array.isArray(cfg.zones) ? cfg.zones : []).map((z: any, idx: number) => {
      const dims = Array.isArray(z?.dimensions)
        ? z.dimensions
        : Array.isArray(z?.size)
        ? z.size
        : [6, 1, 8];
      return {
        id: z?.id || `zone-${idx}`,
        name: z?.name || `ลานกอง ${idx + 1}`,
        code: z?.code || `ZONE-${String(idx + 1).padStart(2, "0")}`,
        type: z?.type || "floor_bulk",
        position: [
          Number(z?.position?.[0]) || 0,
          Number(z?.position?.[1]) || 0,
          Number(z?.position?.[2]) || 0,
        ],
        dimensions: [
          Number(dims[0]) || 6,
          Number(dims[1]) || 1,
          Number(dims[2]) || 8,
        ],
        color: z?.color || "#eab308",
        locationId: z?.locationId,
        locationCode: z?.locationCode,
      };
    }),
    tanks: (Array.isArray(cfg.tanks) ? cfg.tanks : []).map((t: any, idx: number) => ({
      id: t?.id || `tank-${idx}`,
      name: t?.name || `ถังบรรจุ ${idx + 1}`,
      code: t?.code || `TANK-${String(idx + 1).padStart(2, "0")}`,
      position: [
        Number(t?.position?.[0]) || 0,
        Number(t?.position?.[1]) || 0,
        Number(t?.position?.[2]) || 0,
      ],
      radius: Number(t?.radius) || 3,
      height: Number(t?.height) || 7,
      color: t?.color || "#94a3b8",
      capacityLiters: Number(t?.capacityLiters) || 50000,
      currentLiters: Number(t?.currentLiters) || 25000,
      locationId: t?.locationId,
      locationCode: t?.locationCode,
    })),
    docks: (Array.isArray(cfg.docks) && cfg.docks.length > 0 ? cfg.docks : EMPTY_WAREHOUSE_BUILDING.docks).map((d: any, idx: number) => ({
      id: d?.id || `dock-${idx}`,
      name: d?.name || `ประตู Dock ${idx + 1}`,
      position: [
        Number(d?.position?.[0]) || 0,
        Number(d?.position?.[1]) || 0,
        Number(d?.position?.[2]) || 0,
      ],
      width: Number(d?.width) || 3.2,
      height: Number(d?.height) || 3.8,
    })),
  };
}

export default function Warehouse3DViewerPage() {
  const t = useT();
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query parameter for initial warehouse selection or picker mode
  const initialWarehouseId = searchParams.get("warehouseId");
  const isPickerMode = searchParams.get("picker") === "true";

  // Fetch all warehouses for selection
  const { data: warehousesData, isLoading: isWarehousesLoading } = useWarehousesQuery({
    isActive: true,
  });

  const warehouses = warehousesData?.data ?? [];

  // "real_map" (SMT Biomass 1:1 map from HTML) vs "interior" (Warehouse interior layout)
  const [viewModeType, setViewModeType] = useState<"real_map" | "interior">(
    searchParams.get("view") === "interior" ? "interior" : "real_map"
  );

  // Currently selected warehouse: defaults to empty so user sees Catalog View first!
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    initialWarehouseId || "",
  );

  useEffect(() => {
    if (initialWarehouseId) {
      setSelectedWarehouseId(initialWarehouseId);
    }
  }, [initialWarehouseId]);

  const activeWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId);
  }, [warehouses, selectedWarehouseId]);

  // Fetch 3D layout & locations of active warehouse
  const {
    data: layoutData,
    isLoading: isLayoutLoading,
    refetch: refetchLayout,
  } = useWarehouse3DLayoutQuery(selectedWarehouseId);

  const updateLayoutMutation = useUpdateWarehouse3DLayoutMutation();

  // Fetch real inventory lots for the active warehouse
  const { data: lotsData } = useInventoryLotsQuery(
    { warehouseId: selectedWarehouseId },
    { enabled: Boolean(selectedWarehouseId) },
  );
  const inventoryLots = lotsData?.data ?? [];

  // รูปสินค้าจาก master: itemId -> ชื่อไฟล์รูป
  const { data: itemsData } = useItemsQuery();
  const imageByItemId = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const it of itemsData?.data ?? []) map.set(it.id, it.imageFileName);
    return map;
  }, [itemsData]);

  // Lot จริงจัดกลุ่มตาม Location (เฉพาะที่ยังมียอดคงเหลือ)
  const lotsByLocation = useMemo(() => {
    const map = new Map<string, ZoneLot[]>();
    for (const lot of lotsData?.data ?? []) {
      const quantity = Number(lot.quantityOnHand) || 0;
      if (quantity <= 0 || !lot.locationId) continue;
      const list = map.get(lot.locationId) ?? [];
      list.push({
        lotId: lot.lotId || lot.id,
        lotNo: lot.lotNo,
        itemId: lot.itemId,
        itemCode: lot.itemCode,
        itemName: lot.itemNameTh,
        imageFileName: imageByItemId.get(lot.itemId),
        quantity,
        unit: lot.unitCode || "",
        expiryDate: lot.expiryDate,
        qcStatus: lot.qcStatus,
        receivedDate: lot.receivedDate,
      });
      map.set(lot.locationId, list);
    }
    return map;
  }, [lotsData, imageByItemId]);

  // โหลดรูป master เป็น blob URL ไว้เป็นพื้นผิวใน 3D (key เดียวกับ ItemImage จึงใช้แคชร่วมกัน)
  const imageTargets = useMemo(() => {
    const ids = new Map<string, string>();
    for (const lots of lotsByLocation.values()) {
      for (const l of lots) if (l.imageFileName) ids.set(l.itemId, l.imageFileName);
    }
    return Array.from(ids.entries());
  }, [lotsByLocation]);

  const imageQueries = useQueries({
    queries: imageTargets.map(([itemId, fileName]) => ({
      queryKey: ["item-image", itemId, fileName],
      queryFn: async () => {
        const { blob } = await downloadItemImage(getAccessToken(), itemId);
        return URL.createObjectURL(blob);
      },
      staleTime: Infinity,
    })),
  });
  const imageSrcByItemId = useMemo(() => {
    const map = new Map<string, string>();
    imageTargets.forEach(([itemId], i) => {
      const src = imageQueries[i]?.data;
      if (src) map.set(itemId, src);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageTargets, imageQueries.map((q) => q.data).join("|")]);

  // Active working layout in memory (allows live placing and editing)
  const [workingLayout, setWorkingLayout] = useState<Warehouse3DLayoutConfig>(
    EMPTY_WAREHOUSE_BUILDING,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Sync layout from server when warehouse data loads
  useEffect(() => {
    if (layoutData?.data?.layout3dConfig) {
      setWorkingLayout(sanitizeWarehouseLayout(layoutData.data.layout3dConfig));
      setHasUnsavedChanges(false);
    } else if (selectedWarehouseId) {
      setWorkingLayout(EMPTY_WAREHOUSE_BUILDING);
      setHasUnsavedChanges(false);
    }
  }, [layoutData, selectedWarehouseId]);

  const locations = layoutData?.data?.locations ?? [];

  // Enriched layout: warehouse locations partitioned by color with live lot data
  const enrichedLayout = useMemo(() => {
    if (!workingLayout) return workingLayout;

    // Use workingLayout.zones or auto-generate zones from locations if empty
    let rawZones = workingLayout.zones || [];
    if (rawZones.length === 0 && locations.length > 0) {
      const bWidth = workingLayout.building?.width || 40;
      const bLength = workingLayout.building?.length || 60;
      const count = locations.length;
      const cols = count <= 3 ? count : 2;
      const rows = Math.ceil(count / cols);
      const zoneW = Math.max(8, Math.floor((bWidth - 8) / cols));
      const zoneL = Math.max(10, Math.floor((bLength - 10) / rows));

      rawZones = locations.map((loc, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const posX = -bWidth / 2 + (c + 0.5) * zoneW + 4;
        const posZ = -bLength / 2 + (r + 0.5) * zoneL + 5;
        return {
          id: `zone-${loc.id}`,
          name: loc.locationName || `โซน ${loc.locationCode}`,
          code: loc.locationCode,
          locationId: loc.id,
          locationCode: loc.locationCode,
          type: "floor_bulk" as const,
          position: [posX, 0, posZ] as [number, number, number],
          dimensions: [zoneW - 2, 1, zoneL - 2] as [number, number, number],
          color: LOCATION_COLOR_PALETTE[idx % LOCATION_COLOR_PALETTE.length],
        };
      });
    }

    const zones = rawZones.map((zone, idx) => {
      const assignedColor =
        zone.color && zone.color !== "#eab308"
          ? zone.color
          : LOCATION_COLOR_PALETTE[idx % LOCATION_COLOR_PALETTE.length];

      // Find lots matching this zone's location
      const matchingLots = inventoryLots.filter(
        (lot) =>
          (zone.locationId && lot.locationId === zone.locationId) ||
          (zone.locationCode && lot.locationCode === zone.locationCode) ||
          (zone.code && lot.locationCode === zone.code),
      );

      const zoneLots = (zone.locationId ? (lotsByLocation.get(zone.locationId) ?? []) : []).map((l) => ({
        ...l,
        imageSrc: imageSrcByItemId.get(l.itemId),
      }));

      if (matchingLots.length > 0) {
        return {
          ...zone,
          color: assignedColor,
          lots: zoneLots,
          items: matchingLots.map((l) => ({
            itemCode: l.itemCode,
            itemName: l.itemNameTh,
            lotNumber: l.lotNo,
            quantity: Number(l.quantityOnHand) || 0,
            unit: l.unitCode || "กก.",
          })),
        };
      }

      // Default items for floor zones (Rubber + Rubber Cake as requested)
      return {
        ...zone,
        color: assignedColor,
        lots: zoneLots,
        items:
          zone.items && zone.items.length > 0
            ? zone.items
            : [
                {
                  itemCode: "RAW-RUB-01",
                  itemName: "ยางดิบ / ยางก้อนถ้วย (Raw Natural Rubber)",
                  lotNumber: `LOT-RAW-202610-${String(idx + 1).padStart(2, "0")}`,
                  quantity: 14500,
                  unit: "กก.",
                },
                {
                  itemCode: "CAKE-RUB-02",
                  itemName: "ขี้ยาง / ยางเค้ก (Rubber Cake Slab)",
                  lotNumber: `LOT-CAKE-202610-${String(idx + 1).padStart(2, "0")}`,
                  quantity: 8200,
                  unit: "กก.",
                },
              ],
      };
    });

    return {
      ...workingLayout,
      racks: [], // No racks inside warehouse
      tanks: [], // No tanks inside warehouse
      zones,
    };
  }, [workingLayout, inventoryLots, locations, lotsByLocation, imageSrcByItemId]);

  // Interaction States
  const [viewMode, setViewMode] = useState<Warehouse3DViewMode>("3d");
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);
  const [lighting, setLighting] = useState<LightingPreset>("day");
  const [layers, setLayers] = useState({
    racks: true,
    zones: true,
    tanks: true,
    docks: true,
    annotations: true,
  });
  const [selectedObject, setSelectedObject] = useState<Selected3DObject | null>(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const hoveredZone = hoveredZoneId
    ? (enrichedLayout.zones || []).find((z) => z.id === hoveredZoneId)
    : undefined;
  const [cameraPreset, setCameraPreset] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Sync mode changes with viewMode
  const handleModeChange = (mode: Warehouse3DViewMode) => {
    setViewMode(mode);
    if (mode === "explode") {
      setExplodeFactor(0.5);
    } else if (mode === "3d") {
      setExplodeFactor(0);
    } else if (mode === "editor") {
      setIsEditorOpen(true);
    }
  };

  const handleSelectObject = (obj: Selected3DObject, slotKey?: string) => {
    setSelectedObject(obj);
    setSelectedSlotKey(slotKey ?? null);
  };

  const handleToggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Live Quick Placement Functions:
  const handleQuickAddRack = () => {
    const nextIdx = (workingLayout.racks?.length || 0) + 1;
    // Calculate intelligent offset so new racks don't stack on top of each other
    const col = (nextIdx - 1) % 4;
    const row = Math.floor((nextIdx - 1) / 4);
    const posX = -12 + col * 8;
    const posZ = -14 + row * 10;

    const newRack: RackConfig = {
      id: `rack-${Date.now()}`,
      name: `ชั้นวาง R-${String(nextIdx).padStart(2, "0")}`,
      code: `RACK-${String(nextIdx).padStart(2, "0")}`,
      position: [posX, 0, posZ],
      rotation: [0, 0, 0],
      bays: 3,
      levels: 4,
      bayWidth: 2.7,
      bayDepth: 1.1,
      levelHeight: 1.8,
      color: "#ea580c",
      beamColor: "#f59e0b",
    };

    setWorkingLayout((prev) => ({
      ...prev,
      racks: [...(prev.racks || []), newRack],
    }));
    setHasUnsavedChanges(true);

    // Auto-select the newly added rack
    setSelectedObject({
      type: "rack",
      id: newRack.id,
      code: newRack.code,
      name: newRack.name,
    });

    message.success(t("วางชั้นวาง {code} ลงในพื้นที่แล้ว (อย่าลืมกดบันทึกผัง)", { code: newRack.code }));
  };

  const handleQuickAddZone = () => {
    const nextIdx = (workingLayout.zones?.length || 0) + 1;
    const newZone: ZoneConfig = {
      id: `zone-${Date.now()}`,
      name: `ลานกอง Z-${String(nextIdx).padStart(2, "0")}`,
      code: `ZONE-${String(nextIdx).padStart(2, "0")}`,
      type: "floor_bulk",
      position: [0, 0, 6 + (nextIdx - 1) * 6],
      dimensions: [8, 1, 6],
      color: "#eab308",
    };

    setWorkingLayout((prev) => ({
      ...prev,
      zones: [...(prev.zones || []), newZone],
    }));
    setHasUnsavedChanges(true);

    setSelectedObject({
      type: "zone",
      id: newZone.id,
      code: newZone.code,
      name: newZone.name,
    });

    message.success(t("วางลานกอง {code} ลงในพื้นที่แล้ว", { code: newZone.code }));
  };

  const handleQuickAddTank = () => {
    const nextIdx = (workingLayout.tanks?.length || 0) + 1;
    const newTank: StorageTankConfig = {
      id: `tank-${Date.now()}`,
      name: `ถังบรรจุ T-${String(nextIdx).padStart(2, "0")}`,
      code: `TANK-${String(nextIdx).padStart(2, "0")}`,
      position: [12, 0, -12 + (nextIdx - 1) * 8],
      radius: 2.8,
      height: 7,
      color: "#94a3b8",
      capacityLiters: 50000,
      currentLiters: 25000,
    };

    setWorkingLayout((prev) => ({
      ...prev,
      tanks: [...(prev.tanks || []), newTank],
    }));
    setHasUnsavedChanges(true);

    setSelectedObject({
      type: "tank",
      id: newTank.id,
      code: newTank.code,
      name: newTank.name,
    });

    message.success(t("วางถังบรรจุ {code} ลงในพื้นที่แล้ว", { code: newTank.code }));
  };

  // ลาก/ยืดโซนบนภาพ 3D: ถ้าผังยังไม่มีโซนเก็บไว้ (โซนที่เห็นสร้างจาก Location อัตโนมัติ) ให้เก็บทั้งชุดก่อนแล้วค่อยแก้
  const handleUpdateZoneGeometry = (
    id: string,
    patch: Pick<ZoneConfig, "position" | "dimensions">,
  ) => {
    setWorkingLayout((prev) => {
      const base: ZoneConfig[] =
        (prev.zones || []).length > 0
          ? prev.zones
          : (enrichedLayout.zones || []).map((z) => {
              const rest: Partial<ZoneConfig> = { ...z };
              delete rest.items;
              delete rest.lots;
              return rest as ZoneConfig;
            });
      return {
        ...prev,
        zones: base.map((z) => (z.id === id ? { ...z, ...patch } : z)),
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleClearLayout = () => {
    setWorkingLayout(EMPTY_WAREHOUSE_BUILDING);
    setSelectedObject(null);
    setSelectedSlotKey(null);
    setHasUnsavedChanges(true);
    message.info(t("ล้างเป็นคลังเปล่าแล้ว — สามารถเริ่มวางชั้นวางและลานกองใหม่ได้"));
  };

  const handleSaveWorkingLayout = async () => {
    if (!selectedWarehouseId) return;
    try {
      await updateLayoutMutation.mutateAsync({
        warehouseId: selectedWarehouseId,
        layout3dConfig: workingLayout,
      });
      setHasUnsavedChanges(false);
      refetchLayout();
      message.success(t("บันทึกผังคลัง 3 มิติสำเร็จแล้ว"));
    } catch {
      message.error(t("เกิดข้อผิดพลาดในการบันทึกผัง"));
    }
  };

  const handleLocationPicked = (locationCode: string, locationId?: string) => {
    if (isPickerMode) {
      message.success(t("เลือกตำแหน่ง {code} สำเร็จ", { code: locationCode }));
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "WAREHOUSE_LOCATION_PICKED",
            warehouseId: selectedWarehouseId,
            warehouseCode: activeWarehouse?.warehouseCode,
            locationId,
            locationCode,
          },
          "*",
        );
        window.close();
      }
    }
  };

  const handleSaveSitePositions = async (
    updates: Array<{
      id: string;
      sitePosition: [number, number];
      siteRotation: number;
      siteSize?: [number, number, number];
    }>,
    roads?: CampusRoadConfig[],
  ) => {
    try {
      if (roads && typeof window !== "undefined") {
        try {
          localStorage.setItem("smt_campus_roads", JSON.stringify(roads));
        } catch {}
      }

      await Promise.all(
        updates.map(async (item, idx) => {
          const wh = warehouses.find((w) => w.id === item.id);
          const currentConfig = (wh?.layout3dConfig as Record<string, any>) || {};
          const siteSize = Array.isArray(item.siteSize) && item.siteSize.length >= 3 ? item.siteSize : null;
          const updatedBuilding = {
            ...(currentConfig.building || {}),
            width: siteSize ? Number(siteSize[0]) || 40 : (currentConfig.building?.width || 40),
            height: siteSize ? Number(siteSize[1]) || 8 : (currentConfig.building?.height || 8),
            length: siteSize ? Number(siteSize[2]) || 50 : (currentConfig.building?.length || 50),
          };

          const updatedConfig: Warehouse3DLayoutConfig = {
            building: updatedBuilding,
            racks: currentConfig.racks || [],
            zones: currentConfig.zones || [],
            tanks: currentConfig.tanks || [],
            docks: currentConfig.docks || [],
            sitePosition: item.sitePosition,
            siteRotation: item.siteRotation,
            siteSize: item.siteSize,
            siteRoads: idx === 0 && roads ? roads : currentConfig.siteRoads,
          };
          return updateLayoutMutation.mutateAsync({
            warehouseId: item.id,
            layout3dConfig: updatedConfig,
          });
        }),
      );
      message.success(t("บันทึกพิกัด ขนาดอาคารคลัง และถนนโรงงานสำเร็จเรียบร้อย"));
    } catch {
      message.error(t("เกิดข้อผิดพลาดในการบันทึกผังโรงงาน"));
    }
  };

  // STEP 0: Show Real Factory 1:1 Map by Default (as requested)
  if (viewModeType === "real_map") {
    return (
      <SMTBiomassMap3D
        onOpenInterior={() => {
          setViewModeType("interior");
          if (!selectedWarehouseId && warehouses.length > 0) {
            setSelectedWarehouseId(warehouses[0].id);
          }
        }}
      />
    );
  }

  // STEP 1: If no warehouse is selected, show the Warehouse Catalog Gallery!
  if (!selectedWarehouseId) {
    return (
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-[99999] w-screen h-screen flex flex-col bg-slate-950 overflow-hidden text-white font-sans"
            : "relative w-full h-[calc(100dvh-72px)] flex flex-col bg-slate-950 overflow-hidden text-white font-sans"
        }
      >
        <WarehouseCatalogView
          warehouses={warehouses}
          isLoading={isWarehousesLoading}
          onSelectWarehouse={(id) => {
            setSelectedWarehouseId(id);
            setSelectedObject(null);
            setSelectedSlotKey(null);
          }}
          onSaveSitePositions={handleSaveSitePositions}
          onBackToRealMap={() => setViewModeType("real_map")}
        />
      </div>
    );
  }

  // STEP 2: Selected Warehouse 3D Space View
  const totalEquipment = enrichedLayout.zones?.length || 0;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] w-screen h-screen flex flex-col bg-slate-950 overflow-hidden text-white font-sans"
          : "relative w-full h-[calc(100dvh-72px)] flex flex-col bg-slate-950 overflow-hidden text-white font-sans"
      }
    >
      {/* 1. TOP HEADER & MODE SWITCHER */}
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 select-none">
        {/* Left: Back to Warehouses & Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="text"
            icon={<ArrowLeftOutlined className="text-orange-400" />}
            onClick={() => {
              setSelectedWarehouseId("");
              setSelectedObject(null);
              setSelectedSlotKey(null);
            }}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            title={t("กลับไปหน้ารวมคลังสินค้า")}
          >
            <span className="hidden sm:inline text-xs font-semibold">{t("เปลี่ยนคลัง")}</span>
          </Button>

          <Button
            type="primary"
            icon={<CompassOutlined />}
            onClick={() => setViewModeType("real_map")}
            className="bg-blue-600 hover:bg-blue-500 font-semibold text-xs border-blue-500 shadow-sm"
          >
            {t("🗺️ แผนที่จริงโรงงาน")}
          </Button>

          <div className="h-4 w-[1px] bg-slate-700" />

          <Select
            value={selectedWarehouseId}
            onChange={(val) => {
              setSelectedWarehouseId(val);
              setSelectedObject(null);
              setSelectedSlotKey(null);
            }}
            loading={isWarehousesLoading}
            className="w-44 sm:w-56"
            popupMatchSelectWidth={false}
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.warehouseCode} - ${w.warehouseName}`,
            }))}
          />

          {activeWarehouse && (
            <Tag color="orange" className="font-mono text-xs hidden md:inline-block">
              {activeWarehouse.warehouseType || "WAREHOUSE"}
            </Tag>
          )}

          {hasUnsavedChanges && (
            <span className="text-[11px] text-amber-400 animate-pulse hidden lg:inline-block">
              {t("● มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก")}
            </span>
          )}
        </div>

        {/* Center: 4 Operational Modes Switcher */}
        <nav aria-label="3D Viewer Modes" className="hidden md:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => handleModeChange("3d")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              viewMode === "3d"
                ? "bg-emerald-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <AppstoreOutlined />
            <span>{t("3D ผังคลัง (Locations)")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("drone")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              viewMode === "drone"
                ? "bg-emerald-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <SendOutlined />
            <span>{t("โดรนสำรวจ (Drone)")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("editor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              viewMode === "editor"
                ? "bg-amber-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <EditOutlined />
            <span>{t("ปรับแต่งผัง (Editor)")}</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            type={isFullscreen ? "primary" : "default"}
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
            className={
              isFullscreen
                ? "bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs border-orange-500"
                : "border-slate-700 text-slate-300 hover:text-white bg-slate-800/80 font-medium text-xs"
            }
          >
            <span className="hidden sm:inline">
              {isFullscreen ? t("ย่อจอ (Exit)") : t("ขยายเต็มจอ (Fullscreen)")}
            </span>
          </Button>

          <Button
            type="text"
            icon={<SyncOutlined className="text-slate-400" />}
            onClick={() => refetchLayout()}
            title={t("รีเฟรชผัง")}
          />

          {isPickerMode && (
            <Tag color="cyan" className="font-semibold text-xs">
              {t("โหมดเลือกตำแหน่ง")}
            </Tag>
          )}
        </div>
      </header>

      {/* 2. MAIN 3D VIEWPORT & FLOATING PANELS */}
      <main className="relative flex-1 w-full h-full">
        {isLayoutLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 gap-3">
            <Spin size="large" />
            <span className="text-slate-400 text-sm">{t("กำลังโหลดพื้นที่คลังสินค้า 3 มิติ...")}</span>
          </div>
        ) : (
          <>
            {/* The R3F 3D Canvas with enrichedLayout */}
            <Warehouse3DCanvas
              layout={enrichedLayout}
              viewMode={viewMode}
              explodeFactor={explodeFactor}
              heatmapMode={heatmapMode}
              lighting={lighting}
              layers={layers}
              selectedObject={selectedObject}
              selectedSlotKey={selectedSlotKey}
              onSelectObject={handleSelectObject}
              onExitDrone={() => setViewMode("3d")}
              cameraPresetCommand={cameraPreset}
              onCameraPresetHandled={() => setCameraPreset(null)}
              onHoverZone={setHoveredZoneId}
              onUpdateZone={isPickerMode ? undefined : handleUpdateZoneGeometry}
            />

            {selectedObject?.type === "zone" && !isPickerMode && viewMode !== "drone" && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-[11px] text-slate-200 pointer-events-none">
                {t("ลากก้อนขาวตรงกลางเพื่อย้าย · ลากก้อนส้มที่ขอบเพื่อยืด/หด · อย่าลืมกดบันทึกผัง")}
              </div>
            )}

            {hoveredZone && viewMode !== "drone" && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[22rem] max-w-[90vw] rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl p-3 pointer-events-none">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white truncate">
                    📍 {hoveredZone.locationCode || hoveredZone.code} · {hoveredZone.name}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {(hoveredZone.lots ?? []).length} lot
                  </span>
                </div>
                <ZoneLotList lots={hoveredZone.lots ?? []} limit={4} />
              </div>
            )}

            {/* Drone First-Person Flight HUD Overlay */}
            <DroneHUDOverlay
              active={viewMode === "drone"}
              onExit={() => setViewMode("3d")}
            />

            {/* Floating Left Panel (Controls, Camera Presets, Heatmap) */}
            {viewMode !== "drone" && (
              <div className="absolute top-4 left-4 z-20">
                <Warehouse3DLeftPanel
                  explodeFactor={explodeFactor}
                  onExplodeChange={setExplodeFactor}
                  heatmapMode={heatmapMode}
                  onHeatmapToggle={setHeatmapMode}
                  lighting={lighting}
                  onLightingChange={setLighting}
                  layers={layers}
                  onToggleLayer={handleToggleLayer}
                  onCameraPreset={(preset) => setCameraPreset(preset)}
                />
              </div>
            )}

            {/* Floating Right Panel (Location Info, Stock Details, CSV) */}
            {viewMode !== "drone" && (
              <div className="absolute top-4 right-4 z-20">
                <Warehouse3DRightPanel
                  selectedObject={selectedObject}
                  warehouseId={selectedWarehouseId}
                  warehouseCode={activeWarehouse?.warehouseCode || ""}
                  warehouseName={activeWarehouse?.warehouseName || ""}
                  locations={locations}
                  layout={enrichedLayout}
                  onSelectObject={handleSelectObject}
                  onOpenEditor={() => setIsEditorOpen(true)}
                  onSelectLocationForPicker={handleLocationPicked}
                  isPickerMode={isPickerMode}
                  lotsByLocation={lotsByLocation}
                />
              </div>
            )}

            {/* Floating Bottom Quick Placement Bar (เอามาลงได้ / วางชั้นวาง ลานกอง ถังบรรจุ) */}
            {viewMode !== "drone" && (
              <QuickPlacementBar
                onAddRack={handleQuickAddRack}
                onAddZone={handleQuickAddZone}
                onAddTank={handleQuickAddTank}
                onClearLayout={handleClearLayout}
                onSaveLayout={handleSaveWorkingLayout}
                onOpenEditor={() => setIsEditorOpen(true)}
                isSaving={updateLayoutMutation.isPending}
                hasUnsavedChanges={hasUnsavedChanges}
                totalEquipment={totalEquipment}
              />
            )}
          </>
        )}
      </main>

      {/* 3. 3D LAYOUT EDITOR DRAWER */}
      <Warehouse3DLayoutEditorModal
        open={isEditorOpen}
        warehouseId={selectedWarehouseId}
        focusZoneId={selectedObject?.type === "zone" ? selectedObject.id : null}
        onClose={() => {
          setIsEditorOpen(false);
          setViewMode("3d");
        }}
        layout={workingLayout}
        locations={locations}
        onSave={async (newLayout) => {
          setWorkingLayout(newLayout);
          await updateLayoutMutation.mutateAsync({
            warehouseId: selectedWarehouseId,
            layout3dConfig: newLayout,
          });
          setHasUnsavedChanges(false);
          refetchLayout();
        }}
        isSaving={updateLayoutMutation.isPending}
      />
    </div>
  );
}
