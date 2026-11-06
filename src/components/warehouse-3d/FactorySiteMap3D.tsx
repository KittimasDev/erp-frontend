"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Billboard, Text, Grid } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Button, Tag, Space, App, Tooltip, Input, Select, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  CompassOutlined,
  SaveOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  EnvironmentOutlined,
  EditOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  RotateRightOutlined,
  RotateLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SwapOutlined,
  ApartmentOutlined,
  CheckOutlined,
  ToolOutlined,
  ColumnWidthOutlined,
  DownOutlined,
  UpOutlined,
  AimOutlined,
} from "@ant-design/icons";
import type { Warehouse } from "@/types/warehouses";
import type { CampusRoadConfig, RoadType } from "@/types/warehouse-3d";
import { useT } from "@/lib/i18n/useT";

// Default coordinate presets for standard warehouses on plant campus
const DEFAULT_SITE_POSITIONS: Record<
  string,
  { pos: [number, number]; rot: number; size: [number, number, number]; color: string }
> = {
  FG_WH: { pos: [38, -18], rot: 0, size: [30, 8, 38], color: "#ea580c" },
  RAW_WH: { pos: [-38, -18], rot: 0, size: [30, 7.5, 38], color: "#f59e0b" },
  OIL_WH: { pos: [-38, 28], rot: 0, size: [24, 6.5, 26], color: "#0284c7" },
  CHEM_WH: { pos: [38, 28], rot: 0, size: [24, 6.5, 26], color: "#06b6d4" },
  SPARE_WH: { pos: [0, -42], rot: 0, size: [28, 6.5, 22], color: "#64748b" },
};

// Default standard plant campus roads
export const DEFAULT_CAMPUS_ROADS: CampusRoadConfig[] = [
  {
    id: "road-ns-main",
    name: "ถนนสายหลักแนวเหนือ-ใต้ (Main Avenue N-S)",
    position: [0, 0],
    width: 14,
    length: 140,
    rotation: 0,
    roadType: "main_avenue",
    color: "#334155",
    hasMarkings: true,
  },
  {
    id: "road-ew-main",
    name: "ถนนสายหลักแนวขวาง (East-West Crossway)",
    position: [0, 0],
    width: 14,
    length: 160,
    rotation: 90,
    roadType: "main_avenue",
    color: "#334155",
    hasMarkings: true,
  },
  {
    id: "road-fg-access",
    name: "ทางเชื่อมคลังสำเร็จรูป (FG Loading Lane)",
    position: [38, 6],
    width: 10,
    length: 22,
    rotation: 0,
    roadType: "access_lane",
    color: "#334155",
    hasMarkings: true,
  },
  {
    id: "road-raw-access",
    name: "ทางเชื่อมคลังวัตถุดิบ (Raw Material Lane)",
    position: [-38, 6],
    width: 10,
    length: 22,
    rotation: 0,
    roadType: "access_lane",
    color: "#334155",
    hasMarkings: true,
  },
];

interface FactorySiteMap3DProps {
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
  isSaving?: boolean;
}

// -------------------------------------------------------------
// 1. Authentic Industrial 3D Warehouse Building Component
// -------------------------------------------------------------
function SiteWarehouseBuilding({
  warehouse,
  position,
  rotation,
  size,
  isSelected,
  isEditMode,
  onClick,
}: {
  warehouse: Warehouse;
  position: [number, number]; // [X, Z]
  rotation: number; // degrees
  size: [number, number, number]; // [width, height, length]
  isSelected: boolean;
  isEditMode: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const [isHovered, setIsHovered] = useState(false);

  const preset =
    DEFAULT_SITE_POSITIONS[warehouse.warehouseCode] || {
      pos: [0, 0],
      rot: 0,
      size: [30, 8, 38],
      color: "#ea580c",
    };

  const [w, h, l] = Array.isArray(size) && size.length >= 3 ? size : [30, 8, 38];
  const [px, pz] = Array.isArray(position) && position.length >= 2 ? position : [0, 0];
  const halfW = w / 2;
  const halfL = l / 2;

  // Dynamically calculate dock positions based on building width
  const dockPositions = useMemo(() => {
    if (w < 22) return [0];
    if (w < 40) return [-w * 0.22, w * 0.22];
    return [-w * 0.28, 0, w * 0.28];
  }, [w]);

  // Dynamically calculate vent positions based on building length
  const ventPositions = useMemo(() => {
    if (l < 25) return [0];
    return [-l * 0.28, 0, l * 0.28];
  }, [l]);

  return (
    <group
      position={[px, 0, pz]}
      rotation={[0, ((rotation || 0) * Math.PI) / 180, 0]}
    >
      {/* 1. Concrete Foundation Apron with Yellow Safety Curb */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[w + 4, 0.2, l + 8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>

      {/* 2. Main Building Body */}
      <mesh
        position={[0, h / 2 + 0.2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={() => setIsHovered(false)}
      >
        <boxGeometry args={[w, h, l]} />
        <meshStandardMaterial
          color={isSelected ? "#fed7aa" : isHovered ? "#e0f2fe" : "#f1f5f9"}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>

      {/* 3. Base Concrete Splash Wall */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[w + 0.15, 1.0, l + 0.15]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* 4. Upper Colored Architectural Trim Band */}
      <mesh position={[0, h - 0.4, 0]} castShadow>
        <boxGeometry args={[w + 0.2, 0.8, l + 0.2]} />
        <meshStandardMaterial color={preset.color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* 5. Gabled Metal Sheet Roof */}
      <mesh
        position={[-halfW / 2, h + 1.1, 0]}
        rotation={[0, 0, Math.atan2(1.8, halfW)]}
        castShadow
      >
        <boxGeometry args={[halfW * 1.08, 0.25, l + 1.2]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh
        position={[halfW / 2, h + 1.1, 0]}
        rotation={[0, 0, -Math.atan2(1.8, halfW)]}
        castShadow
      >
        <boxGeometry args={[halfW * 1.08, 0.25, l + 1.2]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Translucent Skylight Strip running along roof ridge */}
      <mesh position={[0, h + 2.05, 0]} castShadow>
        <boxGeometry args={[Math.min(3, w * 0.1), 0.08, l + 0.8]} />
        <meshStandardMaterial
          color="#bae6fd"
          emissive="#e0f2fe"
          emissiveIntensity={0.8}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Roof Exhaust Ventilation Turbines */}
      {ventPositions.map((vz, vIdx) => (
        <group key={`vent-${vIdx}`} position={[0, h + 2.3, vz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 6. Front Loading Docks */}
      <group position={[0, 0, halfL]}>
        <mesh position={[0, 4.6, 2.5]} castShadow>
          <boxGeometry args={[Math.min(w * 0.85, dockPositions.length * 9), 0.25, 5]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} />
        </mesh>
        {dockPositions.map((dx, dIdx) => (
          <group key={`dock-front-${dIdx}`} position={[dx, 1.8, 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[3.8, 3.4, 0.15]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            <mesh position={[0, 1.9, 0.1]}>
              <boxGeometry args={[4.4, 0.35, 0.15]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
            <mesh position={[-2.3, -0.9, 0.2]} castShadow>
              <boxGeometry args={[0.3, 1.0, 0.3]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[2.3, -0.9, 0.2]} castShadow>
              <boxGeometry args={[0.3, 1.0, 0.3]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[-2.6, -0.9, 0.8]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 1.2, 16]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
            <mesh position={[2.6, -0.9, 0.8]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 1.2, 16]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          </group>
        ))}
      </group>

      {/* 7. Attached Glass Dispatch Office Annex */}
      <group position={[halfW - 3.2, 1.8, halfL + 1.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5.6, 3.4, 3.5]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 1.8]}>
          <boxGeometry args={[4.8, 1.6, 0.05]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.8} />
        </mesh>
      </group>

      {/* 8. Selection Highlight Aura */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
          <ringGeometry args={[Math.max(w, l) * 0.65, Math.max(w, l) * 0.72, 32]} />
          <meshBasicMaterial color="#ea580c" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 9. Floating Crisp 3D Billboard Badge */}
      <Billboard
        position={[0, h + 4.2, 0]}
        follow
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <planeGeometry args={[Math.max(4.2, warehouse.warehouseCode.length * 0.48 + 1.6), 1.3]} />
          <meshBasicMaterial
            color={isSelected ? "#ea580c" : isHovered ? "#0284c7" : "#0f172a"}
            transparent
            opacity={0.92}
          />
        </mesh>
        <Text
          position={[0, 0.22, 0.02]}
          fontSize={0.42}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {warehouse.warehouseCode}
        </Text>
        <Text
          position={[0, -0.1, 0.02]}
          fontSize={0.24}
          color="#cbd5e1"
          anchorX="center"
          anchorY="middle"
        >
          {warehouse.warehouseName}
        </Text>
        <Text
          position={[0, -0.38, 0.02]}
          fontSize={0.2}
          color={isSelected ? "#fed7aa" : "#38bdf8"}
          anchorX="center"
          anchorY="middle"
        >
          {t("{w}ม. x {l}ม. (สูง {h}ม.) • {rot}°", { w, l, h, rot: rotation })}
        </Text>
      </Billboard>
    </group>
  );
}

// -------------------------------------------------------------
// 2. Interactive Industrial Campus Road Component
// -------------------------------------------------------------
function SiteRoadMesh({
  road,
  isSelected,
  isEditMode,
  onClick,
}: {
  road: CampusRoadConfig;
  isSelected: boolean;
  isEditMode: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const [isHovered, setIsHovered] = useState(false);
  const roadPos = Array.isArray(road.position) ? road.position : [0, 0];
  const posX = roadPos[0] ?? 0;
  const posZ = roadPos[1] ?? 0;
  const halfW = (road.width || 12) / 2;
  const halfL = (road.length || 50) / 2;
  const dashCount = Math.max(1, Math.floor((road.length || 50) / 8));

  return (
    <group
      position={[posX, 0.02, posZ]}
      rotation={[0, ((road.rotation || 0) * Math.PI) / 180, 0]}
    >
      {/* 1. Main Asphalt Surface */}
      <mesh
        receiveShadow
        onClick={(e) => {
          if (isEditMode) {
            e.stopPropagation();
            onClick();
          }
        }}
        onPointerOver={(e) => {
          if (isEditMode) {
            e.stopPropagation();
            setIsHovered(true);
          }
        }}
        onPointerOut={() => setIsHovered(false)}
      >
        <boxGeometry args={[road.width, 0.03, road.length]} />
        <meshStandardMaterial
          color={
            isSelected
              ? "#1e293b"
              : isHovered
              ? "#475569"
              : road.color || "#334155"
          }
          roughness={0.65}
          metalness={0.1}
        />
      </mesh>

      {/* 2. Selection Border Highlight Outline */}
      {isSelected && (
        <group position={[0, 0.05, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[road.width + 0.6, road.length + 0.6]} />
            <meshBasicMaterial color="#38bdf8" wireframe />
          </mesh>
        </group>
      )}

      {/* 3. Road Centerline Markings (Clean White Dashes, No Edge Curb Slicing) */}
      {road.hasMarkings !== false && (
        <>
          {/* White Dashed Centerline */}
          {Array.from({ length: dashCount }).map((_, dIdx) => {
            const zPos = -halfL + 4 + dIdx * 8;
            if (Math.abs(zPos) > halfL - 2) return null;
            return (
              <mesh key={`dash-${road.id}-${dIdx}`} position={[0, 0.035, zPos]}>
                <boxGeometry args={[0.28, 0.01, 3.6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            );
          })}
        </>
      )}

      {/* 4. Road Label Badge when Selected or Hovered */}
      {(isSelected || (isHovered && isEditMode)) && (
        <Billboard position={[0, 3.2, 0]}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <planeGeometry args={[Math.max(4.2, road.name.length * 0.38 + 1.2), 1.0]} />
            <meshBasicMaterial
              color={isSelected ? "#0284c7" : "#0f172a"}
              transparent
              opacity={0.92}
            />
          </mesh>
          <Text position={[0, 0.14, 0.02]} fontSize={0.38} color="#ffffff" anchorX="center" anchorY="middle">
            {road.name}
          </Text>
          <Text position={[0, -0.22, 0.02]} fontSize={0.24} color="#bae6fd" anchorX="center" anchorY="middle">
            {t("{w}ม. x {l}ม. • หมุน {rot}° • [{x}, {z}]", { w: road.width, l: road.length, rot: road.rotation, x: posX, z: posZ })}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// -------------------------------------------------------------
// 3. MAIN FACTORY SITE MAP 3D COMPONENT
// -------------------------------------------------------------
export const FactorySiteMap3D: React.FC<FactorySiteMap3DProps> = ({
  warehouses,
  onSelectWarehouse,
  onSaveSitePositions,
  isSaving = false,
}) => {
  const t = useT();
  const { message } = App.useApp();
  const orbitRef = useRef<OrbitControlsImpl | null>(null);

  const [mode, setMode] = useState<"explore" | "reposition">("explore");
  const [editTarget, setEditTarget] = useState<"warehouses" | "roads">("warehouses");

  // UI Visibility States
  const [isCleanView, setIsCleanView] = useState(false); // Hide all overlays for unobstructed 3D view
  const [isEditorMinimized, setIsEditorMinimized] = useState(false); // Minimize editor box to a sleek pill
  const [isCardMinimized, setIsCardMinimized] = useState(false); // Minimize bottom-right warehouse card

  // Selection states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    warehouses[0]?.id || "",
  );
  const [selectedRoadId, setSelectedRoadId] = useState<string>("road-ns-main");
  const [stepSize, setStepSize] = useState<number>(5); // 1m, 5m, 10m increments

  const [hasChanges, setHasChanges] = useState(false);

  // Layouts state map: id -> { pos: [X, Z], rot: deg, size: [W, H, L] }
  const [siteLayouts, setSiteLayouts] = useState<
    Record<string, { pos: [number, number]; rot: number; size: [number, number, number] }>
  >({});

  // Road network state
  const [roads, setRoads] = useState<CampusRoadConfig[]>(DEFAULT_CAMPUS_ROADS);

  // Initialize warehouse positions, sizes, and road network from layout3dConfig or fallback
  useEffect(() => {
    const map: Record<
      string,
      { pos: [number, number]; rot: number; size: [number, number, number] }
    > = {};
    let foundRoads: CampusRoadConfig[] | null = null;

    warehouses.forEach((wh, index) => {
      const cfg = wh.layout3dConfig as Record<string, any> | undefined;
      const fallback = DEFAULT_SITE_POSITIONS[wh.warehouseCode];

      // Position
      let pos: [number, number];
      if (cfg?.sitePosition && Array.isArray(cfg.sitePosition) && cfg.sitePosition.length >= 2) {
        pos = [Number(cfg.sitePosition[0]) || 0, Number(cfg.sitePosition[1]) || 0];
      } else if (fallback) {
        pos = fallback.pos;
      } else {
        const angle = (index / Math.max(1, warehouses.length)) * Math.PI * 2;
        pos = [Math.round(Math.cos(angle) * 45), Math.round(Math.sin(angle) * 40)];
      }

      // Rotation
      const rot =
        typeof cfg?.siteRotation === "number"
          ? cfg.siteRotation
          : fallback?.rot || 0;

      // Size [width, height, length]
      let size: [number, number, number];
      if (cfg?.siteSize && Array.isArray(cfg.siteSize) && cfg.siteSize.length >= 3) {
        size = [
          Number(cfg.siteSize[0]) || 30,
          Number(cfg.siteSize[1]) || 8,
          Number(cfg.siteSize[2]) || 38,
        ];
      } else if (cfg?.building?.width && cfg?.building?.length) {
        size = [
          Number(cfg.building.width) || 30,
          Number(cfg.building.height) || 8,
          Number(cfg.building.length) || 38,
        ];
      } else if (fallback) {
        size = fallback.size;
      } else {
        size = [30, 8, 38];
      }

      map[wh.id] = { pos, rot, size };

      if (!foundRoads && cfg?.siteRoads && Array.isArray(cfg.siteRoads) && cfg.siteRoads.length > 0) {
        foundRoads = cfg.siteRoads;
      }
    });

    setSiteLayouts(map);

    if (warehouses.length > 0) {
      setSelectedWarehouseId((prev) => {
        if (prev && warehouses.some((w) => w.id === prev)) return prev;
        return warehouses[0].id;
      });
    }

    if (foundRoads) {
      setRoads(foundRoads);
    } else if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("smt_campus_roads");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoads(parsed);
          }
        }
      } catch {}
    }

    setHasChanges(false);
  }, [warehouses]);

  const activeWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId);
  }, [warehouses, selectedWarehouseId]);

  const activeLayout = siteLayouts[selectedWarehouseId] || {
    pos: [0, 0],
    rot: 0,
    size: [30, 8, 38],
  };

  const activeRoad = useMemo(() => {
    if (!roads || roads.length === 0) return null;
    return roads.find((r) => r.id === selectedRoadId) || roads[0];
  }, [roads, selectedRoadId]);

  // ---------------------------------------------------------
  // Warehouse Manipulation Handlers (Move, Rotate, Resize)
  // ---------------------------------------------------------
  const handleMoveWarehouse = (dx: number, dz: number) => {
    if (!selectedWarehouseId) return;
    setSiteLayouts((prev) => {
      const current = prev[selectedWarehouseId] || { pos: [0, 0], rot: 0, size: [30, 8, 38] };
      const nextPos: [number, number] = [
        Math.max(-140, Math.min(140, current.pos[0] + dx)),
        Math.max(-120, Math.min(120, current.pos[1] + dz)),
      ];
      return {
        ...prev,
        [selectedWarehouseId]: { ...current, pos: nextPos },
      };
    });
    setHasChanges(true);
  };

  const handleRotateWarehouse = (deltaDeg: number = 90) => {
    if (!selectedWarehouseId) return;
    setSiteLayouts((prev) => {
      const current = prev[selectedWarehouseId] || { pos: [0, 0], rot: 0, size: [30, 8, 38] };
      const nextRot = (current.rot + deltaDeg + 360) % 360;
      return {
        ...prev,
        [selectedWarehouseId]: { ...current, rot: nextRot },
      };
    });
    setHasChanges(true);
  };

  const handleSetWarehouseRotation = (rot: number) => {
    if (!selectedWarehouseId) return;
    setSiteLayouts((prev) => {
      const current = prev[selectedWarehouseId] || { pos: [0, 0], rot: 0, size: [30, 8, 38] };
      return {
        ...prev,
        [selectedWarehouseId]: { ...current, rot: (rot + 360) % 360 },
      };
    });
    setHasChanges(true);
  };

  const handleResizeWarehouse = (dWidth: number, dLength: number, dHeight: number = 0) => {
    if (!selectedWarehouseId) return;
    setSiteLayouts((prev) => {
      const current = prev[selectedWarehouseId] || { pos: [0, 0], rot: 0, size: [30, 8, 38] };
      const nextW = Math.max(14, Math.min(90, current.size[0] + dWidth));
      const nextH = Math.max(5, Math.min(20, current.size[1] + dHeight));
      const nextL = Math.max(16, Math.min(130, current.size[2] + dLength));
      return {
        ...prev,
        [selectedWarehouseId]: {
          ...current,
          size: [nextW, nextH, nextL],
        },
      };
    });
    setHasChanges(true);
  };

  const handleApplyWarehousePreset = (presetSize: [number, number, number]) => {
    if (!selectedWarehouseId) return;
    setSiteLayouts((prev) => {
      const current = prev[selectedWarehouseId] || { pos: [0, 0], rot: 0, size: [30, 8, 38] };
      return {
        ...prev,
        [selectedWarehouseId]: {
          ...current,
          size: presetSize,
        },
      };
    });
    setHasChanges(true);
    message.success(t("ปรับขนาดคลังเป็น {w}x{l}ม. (สูง {h}ม.) แล้ว", { w: presetSize[0], l: presetSize[2], h: presetSize[1] }));
  };

  // ---------------------------------------------------------
  // Road Manipulation Handlers
  // ---------------------------------------------------------
  const handleMoveRoad = (dx: number, dz: number) => {
    if (!activeRoad) return;
    setRoads((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoad.id) return r;
        return {
          ...r,
          position: [
            Math.max(-150, Math.min(150, r.position[0] + dx)),
            Math.max(-130, Math.min(130, r.position[1] + dz)),
          ],
        };
      }),
    );
    setHasChanges(true);
  };

  const handleRotateRoad = (deltaDeg: number = 90) => {
    if (!activeRoad) return;
    setRoads((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoad.id) return r;
        return {
          ...r,
          rotation: (r.rotation + deltaDeg + 360) % 360,
        };
      }),
    );
    setHasChanges(true);
  };

  const handleResizeRoad = (dWidth: number, dLength: number) => {
    if (!activeRoad) return;
    setRoads((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoad.id) return r;
        return {
          ...r,
          width: Math.max(4, Math.min(50, r.width + dWidth)),
          length: Math.max(8, Math.min(220, r.length + dLength)),
        };
      }),
    );
    setHasChanges(true);
  };

  const handleToggleRoadMarkings = () => {
    if (!activeRoad) return;
    setRoads((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoad.id) return r;
        return {
          ...r,
          hasMarkings: r.hasMarkings === false ? true : false,
        };
      }),
    );
    setHasChanges(true);
  };

  const handleRenameRoad = (name: string) => {
    if (!activeRoad) return;
    setRoads((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoad.id) return r;
        return { ...r, name };
      }),
    );
    setHasChanges(true);
  };

  const handleAddRoad = (type: "ns" | "ew" | "lane" | "apron") => {
    const nextIdx = roads.length + 1;
    let newRoad: CampusRoadConfig;

    if (type === "ns") {
      newRoad = {
        id: `road-ns-${Date.now()}`,
        name: `ถนนสายเหนือ-ใต้ R-${nextIdx}`,
        position: [0, 0],
        width: 12,
        length: 90,
        rotation: 0,
        roadType: "secondary",
        color: "#334155",
        hasMarkings: true,
      };
    } else if (type === "ew") {
      newRoad = {
        id: `road-ew-${Date.now()}`,
        name: `ถนนสายขวาง R-${nextIdx}`,
        position: [0, 0],
        width: 12,
        length: 90,
        rotation: 90,
        roadType: "secondary",
        color: "#334155",
        hasMarkings: true,
      };
    } else if (type === "lane") {
      newRoad = {
        id: `road-lane-${Date.now()}`,
        name: `ทางเชื่อมซอย R-${nextIdx}`,
        position: [15, 0],
        width: 8,
        length: 30,
        rotation: 0,
        roadType: "access_lane",
        color: "#334155",
        hasMarkings: true,
      };
    } else {
      newRoad = {
        id: `road-apron-${Date.now()}`,
        name: `ลานจอด/ลานกลับรถ R-${nextIdx}`,
        position: [0, -20],
        width: 25,
        length: 25,
        rotation: 0,
        roadType: "parking_apron",
        color: "#475569",
        hasMarkings: false,
      };
    }

    setRoads((prev) => [...prev, newRoad]);
    setSelectedRoadId(newRoad.id);
    setEditTarget("roads");
    setIsEditorMinimized(false);
    setHasChanges(true);
    message.success(t("เพิ่ม {name} เรียบร้อยแล้ว", { name: newRoad.name }));
  };

  const handleDuplicateRoad = () => {
    if (!activeRoad) return;
    const roadPos = Array.isArray(activeRoad.position) ? activeRoad.position : [0, 0];
    const duplicated: CampusRoadConfig = {
      ...activeRoad,
      id: `road-dup-${Date.now()}`,
      name: `${activeRoad.name} (คัดลอก)`,
      position: [(roadPos[0] ?? 0) + 10, (roadPos[1] ?? 0) + 10],
    };
    setRoads((prev) => [...prev, duplicated]);
    setSelectedRoadId(duplicated.id);
    setHasChanges(true);
    message.success(t("คัดลอก {name} สำเร็จ", { name: duplicated.name }));
  };

  const handleDeleteRoad = () => {
    if (!activeRoad) return;
    if (roads.length <= 1) {
      message.warning(t("ต้องมีถนนบนผังโรงงานอย่างน้อย 1 เส้น"));
      return;
    }
    const targetId = activeRoad.id;
    setRoads((prev) => prev.filter((r) => r.id !== targetId));
    const remaining = roads.filter((r) => r.id !== targetId);
    setSelectedRoadId(remaining[0]?.id || "");
    setHasChanges(true);
    message.info(t("ลบถนนที่เลือกออกจากผังแล้ว"));
  };

  // ---------------------------------------------------------
  // Save & Reset Handlers
  // ---------------------------------------------------------
  const handleSave = async () => {
    const updates = Object.entries(siteLayouts).map(([id, data]) => ({
      id,
      sitePosition: data.pos,
      siteRotation: data.rot,
      siteSize: data.size,
    }));
    await onSaveSitePositions(updates, roads);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smt_campus_roads", JSON.stringify(roads));
      } catch {}
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    const map: Record<
      string,
      { pos: [number, number]; rot: number; size: [number, number, number] }
    > = {};
    warehouses.forEach((wh, index) => {
      const fallback = DEFAULT_SITE_POSITIONS[wh.warehouseCode];
      if (fallback) {
        map[wh.id] = { pos: fallback.pos, rot: fallback.rot, size: fallback.size };
      } else {
        const angle = (index / Math.max(1, warehouses.length)) * Math.PI * 2;
        map[wh.id] = {
          pos: [Math.round(Math.cos(angle) * 45), Math.round(Math.sin(angle) * 40)],
          rot: 0,
          size: [30, 8, 38],
        };
      }
    });
    setSiteLayouts(map);
    setRoads(DEFAULT_CAMPUS_ROADS);
    setSelectedRoadId("road-ns-main");
    setHasChanges(true);
    message.info(t("รีเซ็ตพิกัดคลังและถนนเป็นค่าเริ่มต้นแล้ว — อย่าลืมกดบันทึก"));
  };

  // Camera presets: Wide viewing angles with crisp visibility
  const setCameraPreset = (preset: "overview" | "iso" | "top" | "entrance") => {
    if (!orbitRef.current) return;
    const ctrl = orbitRef.current;
    if (preset === "overview") {
      ctrl.object.position.set(0, 160, 190);
      ctrl.target.set(0, 0, 0);
    } else if (preset === "iso") {
      ctrl.object.position.set(95, 80, 105);
      ctrl.target.set(0, 0, 0);
    } else if (preset === "top") {
      ctrl.object.position.set(0, 210, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (preset === "entrance") {
      ctrl.object.position.set(0, 24, 110);
      ctrl.target.set(0, 5, 20);
    }
    ctrl.update();
  };

  const addRoadMenu: MenuProps["items"] = [
    {
      key: "ns",
      label: t("🛣️ ถนนสายเหนือ-ใต้ (กว้าง 12ม. ยาว 90ม.)"),
      onClick: () => handleAddRoad("ns"),
    },
    {
      key: "ew",
      label: t("🛣️ ถนนสายขวางตะวันออก-ตก (กว้าง 12ม. ยาว 90ม.)"),
      onClick: () => handleAddRoad("ew"),
    },
    {
      key: "lane",
      label: t("🚚 ทางเชื่อมเข้าคลัง/ซอย (กว้าง 8ม. ยาว 30ม.)"),
      onClick: () => handleAddRoad("lane"),
    },
    {
      key: "apron",
      label: t("🅿️ ลานจอด/ลานกลับรถเทรลเลอร์ (25ม. x 25ม.)"),
      onClick: () => handleAddRoad("apron"),
    },
  ];

  return (
    <div className="relative w-full h-[calc(100dvh-128px)] overflow-hidden select-none bg-slate-900">
      {/* 1. TOP HEADER & MAP CONTROLS */}
      {!isCleanView && (
        <header className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-3 bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 rounded-2xl px-5 py-2.5 shadow-2xl text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <EnvironmentOutlined className="text-orange-500 text-lg" />
              <span className="font-extrabold text-sm tracking-wide text-white">
                {t("ผังที่ตั้งโรงงาน 3D (Plant Campus Site Map)")}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setMode("explore")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  mode === "explore"
                    ? "bg-orange-600 text-white shadow font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <EyeOutlined />
                <span>{t("โหมดสำรวจ")}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("reposition")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  mode === "reposition"
                    ? "bg-amber-600 text-white shadow font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <EditOutlined />
                <span>{t("โหมดปรับผัง (ย้าย/ปรับขนาด/หมุน)")}</span>
              </button>
            </div>

            {/* Sub-Target Selector when in Reposition Mode */}
            {mode === "reposition" && (
              <div className="flex rounded-xl bg-slate-950/90 p-1 border border-amber-500/40 text-xs shadow-inner">
                <button
                  type="button"
                  onClick={() => setEditTarget("warehouses")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    editTarget === "warehouses"
                      ? "bg-amber-500 text-slate-950 font-bold shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ApartmentOutlined />
                  <span>{t("🏢 คลังสินค้า")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditTarget("roads")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    editTarget === "roads"
                      ? "bg-sky-500 text-slate-950 font-bold shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ToolOutlined />
                  <span>{t("🛣️ ถนน ({n})", { n: roads.length })}</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera Views & Save Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCameraPreset("overview")}
                className="px-2.5 py-1 rounded-lg bg-orange-600/30 text-orange-300 hover:bg-orange-600 hover:text-white font-medium transition cursor-pointer flex items-center gap-1"
                title={t("ซูมให้เห็นโรงงานทั้งหมดในมุมกว้าง")}
              >
                <AimOutlined />
                <span>{t("ภาพรวมทั้งหมด")}</span>
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset("iso")}
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer hidden md:inline-block"
              >
                {t("มุมเฉียง (3D)")}
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset("top")}
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                {t("มุมบน (2D)")}
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset("entrance")}
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer hidden lg:inline-block"
              >
                {t("ป้อมทางเข้า")}
              </button>
            </div>

            {/* Clean View Button (Hide panels for 100% full view) */}
            <Tooltip title={t("ซ่อนกล่องควบคุมทั้งหมดเพื่อดูผังชัดๆ")}>
              <Button
                size="small"
                icon={<EyeInvisibleOutlined />}
                onClick={() => setIsCleanView(true)}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white text-xs h-7"
              >
                {t("ดูเต็มตา")}
              </Button>
            </Tooltip>

            {mode === "reposition" && (
              <>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white text-xs h-7"
                >
                  {t("รีเซ็ต")}
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  loading={isSaving}
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`text-xs h-7 ${
                    hasChanges
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-500 border-slate-700"
                  }`}
                >
                  {t("บันทึกผังโรงงาน")}
                </Button>
              </>
            )}
          </div>
        </header>
      )}

      {/* Floating Restore Button when in Clean View */}
      {isCleanView && (
        <button
          type="button"
          onClick={() => setIsCleanView(false)}
          className="absolute top-4 right-6 z-30 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xl border border-slate-700 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 transition cursor-pointer"
        >
          <EyeOutlined className="text-orange-400" />
          <span>{t("แสดงเครื่องมือและเมนู")}</span>
        </button>
      )}

      {/* 2. WAREHOUSE CONTROLLER (Move, Rotate, Resize) - COLLAPSIBLE */}
      {!isCleanView && mode === "reposition" && editTarget === "warehouses" && activeWarehouse && (
        <div
          className={`absolute bottom-6 left-6 z-20 bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl text-white transition-all duration-200 select-none ${
            isEditorMinimized ? "w-auto max-w-sm" : "w-80 max-h-[76vh] overflow-y-auto space-y-3"
          }`}
        >
          {/* Header with Minimize / Expand Button */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 truncate">
              <ApartmentOutlined />
              <span>{activeWarehouse.warehouseCode}</span>
            </span>

            <div className="flex items-center gap-1">
              <Tag color="orange" className="font-mono text-[10px] m-0">
                {activeLayout.size[0]}×{activeLayout.size[2]}{t("ม.")}
              </Tag>
              <button
                type="button"
                onClick={() => setIsEditorMinimized(!isEditorMinimized)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title={isEditorMinimized ? t("ขยายกล่องเครื่องมือ") : t("ย่อกล่องเพื่อไม่ให้บังหน้าจอ")}
              >
                {isEditorMinimized ? <UpOutlined /> : <DownOutlined />}
              </button>
            </div>
          </div>

          {/* When Minimized: Compact One-Line Controls */}
          {isEditorMinimized ? (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[11px] text-slate-400">
                {t("หมุน:")} <b className="text-amber-400">{activeLayout.rot}°</b>
              </span>
              <button
                type="button"
                onClick={() => handleRotateWarehouse(90)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white text-[11px] transition cursor-pointer"
                title={t("หมุน 90 องศา")}
              >
                ⟳ 90°
              </button>
              <button
                type="button"
                onClick={() => setIsEditorMinimized(false)}
                className="text-[11px] text-amber-400 underline cursor-pointer hover:text-amber-300 ml-1"
              >
                {t("ขยายเครื่องมือ")}
              </button>
            </div>
          ) : (
            <>
              {/* Warehouse Dropdown Switcher */}
              <Select
                size="small"
                value={activeWarehouse.id}
                onChange={(val) => setSelectedWarehouseId(val)}
                className="w-full text-xs"
                options={warehouses.map((w) => {
                  const s = siteLayouts[w.id]?.size || [30, 8, 38];
                  return {
                    value: w.id,
                    label: `${w.warehouseCode} - ${w.warehouseName} (${s[0]}x${s[2]}${t("ม.")})`,
                  };
                })}
              />

              {/* D-Pad Positioning Controls */}
              <div className="flex flex-col items-center gap-1 py-1 bg-slate-950/60 rounded-xl border border-slate-800 p-2">
                <div className="text-[10px] text-slate-400 mb-0.5">
                  {t("พิกัด:")} [{activeLayout.pos[0]}, {activeLayout.pos[1]}]
                </div>
                <button
                  type="button"
                  onClick={() => handleMoveWarehouse(0, -stepSize)}
                  className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                  title={t("เลื่อนขึ้นเหนือ (North)")}
                >
                  <ArrowUpOutlined />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveWarehouse(-stepSize, 0)}
                    className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                    title={t("เลื่อนซ้าย (West)")}
                  >
                    <ArrowLeftOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateWarehouse(90)}
                    className="w-11 h-7 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-300 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-amber-500/50"
                    title={t("หมุน 90 องศา")}
                  >
                    <RotateRightOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveWarehouse(stepSize, 0)}
                    className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                    title={t("เลื่อนขวา (East)")}
                  >
                    <ArrowRightOutlined />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleMoveWarehouse(0, stepSize)}
                  className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                  title={t("เลื่อนลงใต้ (South)")}
                >
                  <ArrowDownOutlined />
                </button>

                {/* Step size selector */}
                <div className="flex items-center justify-between w-full text-[10px] pt-1 mt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">{t("ระยะก้าว:")}</span>
                  <div className="flex gap-1">
                    {[1, 5, 10].map((s) => (
                      <button
                        key={`step-${s}`}
                        type="button"
                        onClick={() => setStepSize(s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                          stepSize === s
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {s}{t("ม.")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rotation Angle Controls (90°, 15°, or Direct Angles) */}
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <RotateRightOutlined />
                    <span>{t("หมุนองศา")}</span>
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{activeLayout.rot}°</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRotateWarehouse(-15)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white text-[10px] font-mono transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateLeftOutlined />
                    <span>-15°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateWarehouse(15)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white text-[10px] font-mono transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateRightOutlined />
                    <span>+15°</span>
                  </button>
                </div>
                <div className="flex gap-1 pt-0.5">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={`deg-${deg}`}
                      type="button"
                      onClick={() => handleSetWarehouseRotation(deg)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                        activeLayout.rot === deg
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "bg-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Warehouse Dimensions / Sizing Controls */}
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <ColumnWidthOutlined />
                  <span>{t("ปรับขนาดอาคารคลัง")}</span>
                </div>

                {/* Width (X) */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">{t("กว้าง (W):")}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleResizeWarehouse(-2, 0)}
                      className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      -2
                    </button>
                    <span className="font-mono text-amber-400 w-12 text-center font-bold text-xs">
                      {activeLayout.size[0]} {t("ม.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResizeWarehouse(2, 0)}
                      className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      +2
                    </button>
                  </div>
                </div>

                {/* Length (Z) */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">{t("ยาว (L):")}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleResizeWarehouse(0, -5)}
                      className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      -5
                    </button>
                    <span className="font-mono text-amber-400 w-12 text-center font-bold text-xs">
                      {activeLayout.size[2]} {t("ม.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResizeWarehouse(0, 5)}
                      className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* Height (Y) */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">{t("สูง (H):")}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleResizeWarehouse(0, 0, -1)}
                      className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      -1
                    </button>
                    <span className="font-mono text-amber-400 w-12 text-center font-bold text-xs">
                      {activeLayout.size[1]} {t("ม.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResizeWarehouse(0, 0, 1)}
                      className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Quick Size Presets */}
                <div className="pt-1 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-400 mb-1">{t("เทมเพลตด่วน:")}</div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyWarehousePreset([22, 6.5, 26])}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white text-[10px] cursor-pointer transition text-center"
                    >
                      {t("เล็ก (22x26)")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyWarehousePreset([30, 8, 40])}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white text-[10px] cursor-pointer transition text-center"
                    >
                      {t("กลาง (30x40)")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyWarehousePreset([45, 10, 60])}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white text-[10px] cursor-pointer transition text-center"
                    >
                      {t("ใหญ่ (45x60)")}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. ROAD TOOLBAR & CONTROLLER (Visible when in Reposition Mode -> Roads) - COLLAPSIBLE */}
      {!isCleanView && mode === "reposition" && editTarget === "roads" && activeRoad && (
        <div
          className={`absolute bottom-6 left-6 z-20 bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-xl border border-sky-500/50 rounded-2xl p-3.5 shadow-2xl text-white transition-all duration-200 select-none ${
            isEditorMinimized ? "w-auto max-w-sm" : "w-80 max-h-[76vh] overflow-y-auto space-y-3"
          }`}
        >
          {/* Header with Minimize Button */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 truncate">
              <ToolOutlined />
              <span>{activeRoad.name}</span>
            </span>

            <div className="flex items-center gap-1">
              <Dropdown menu={{ items: addRoadMenu }} trigger={["click"]}>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  className="bg-sky-600 hover:bg-sky-500 text-[11px] h-6 px-2"
                >
                  {t("เพิ่ม")}
                </Button>
              </Dropdown>
              <button
                type="button"
                onClick={() => setIsEditorMinimized(!isEditorMinimized)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title={isEditorMinimized ? t("ขยายกล่องเครื่องมือ") : t("ย่อกล่องเพื่อไม่ให้บังหน้าจอ")}
              >
                {isEditorMinimized ? <UpOutlined /> : <DownOutlined />}
              </button>
            </div>
          </div>

          {isEditorMinimized ? (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[11px] text-slate-400">
                {t("ขนาด:")} <b className="text-sky-400">{activeRoad.width}×{activeRoad.length}{t("ม.")}</b>
              </span>
              <button
                type="button"
                onClick={() => handleRotateRoad(90)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white text-[11px] transition cursor-pointer"
                title={t("หมุน 90 องศา")}
              >
                ⟳ 90°
              </button>
              <button
                type="button"
                onClick={() => setIsEditorMinimized(false)}
                className="text-[11px] text-sky-400 underline cursor-pointer hover:text-sky-300 ml-1"
              >
                {t("ขยายเครื่องมือ")}
              </button>
            </div>
          ) : (
            <>
              {/* Road Selection Dropdown */}
              <Select
                size="small"
                value={activeRoad.id}
                onChange={(val) => setSelectedRoadId(val)}
                className="w-full text-xs"
                options={roads.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.width}${t("ม.")} x ${r.length}${t("ม.")})`,
                }))}
              />

              {/* Road Name Field */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">{t("ชื่อ:")}</span>
                <Input
                  size="small"
                  value={activeRoad.name}
                  onChange={(e) => handleRenameRoad(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-7"
                />
              </div>

              {/* D-Pad Positioning Controls */}
              <div className="flex flex-col items-center gap-1 py-1 bg-slate-950/60 rounded-xl border border-slate-800 p-2">
                <div className="text-[10px] text-slate-400 mb-0.5">
                  {t("พิกัด:")} [{activeRoad.position?.[0] ?? 0}, {activeRoad.position?.[1] ?? 0}] • {t("หมุน")} {activeRoad.rotation ?? 0}°
                </div>
                <button
                  type="button"
                  onClick={() => handleMoveRoad(0, -stepSize)}
                  className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                  title={t("เลื่อนขึ้นเหนือ (North)")}
                >
                  <ArrowUpOutlined />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveRoad(-stepSize, 0)}
                    className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                    title={t("เลื่อนซ้าย (West)")}
                  >
                    <ArrowLeftOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateRoad(90)}
                    className="w-11 h-7 rounded-lg bg-sky-600/30 hover:bg-sky-500 text-sky-300 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-sky-500/50"
                    title={t("หมุน 90 องศา")}
                  >
                    <RotateRightOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveRoad(stepSize, 0)}
                    className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                    title={t("เลื่อนขวา (East)")}
                  >
                    <ArrowRightOutlined />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleMoveRoad(0, stepSize)}
                  className="w-11 h-7 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer shadow border border-slate-700"
                  title={t("เลื่อนลงใต้ (South)")}
                >
                  <ArrowDownOutlined />
                </button>
              </div>

              {/* Width & Length Adjustments */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{t("ความกว้าง")}</span>
                    <span className="font-mono text-sky-400 font-bold">{activeRoad.width}{t("ม.")}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleResizeRoad(-2, 0)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      -2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResizeRoad(2, 0)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      +2
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{t("ความยาว")}</span>
                    <span className="font-mono text-sky-400 font-bold">{activeRoad.length}{t("ม.")}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleResizeRoad(0, -10)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResizeRoad(0, 10)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center cursor-pointer text-[10px]"
                    >
                      +10
                    </button>
                  </div>
                </div>
              </div>

              {/* Road Actions (Markings, Duplicate, Delete) */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 gap-2">
                <Button
                  size="small"
                  onClick={handleToggleRoadMarkings}
                  className={`text-[11px] h-7 ${
                    activeRoad.hasMarkings !== false
                      ? "bg-sky-600/30 text-sky-300 border-sky-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {activeRoad.hasMarkings !== false ? t("✓ มีเส้น") : t("ไม่มีเส้น")}
                </Button>

                <div className="flex gap-1.5">
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleDuplicateRoad}
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white text-[11px] h-7"
                    title={t("คัดลอกถนนเส้นนี้")}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteRoad}
                    className="text-[11px] h-7"
                    title={t("ลบถนนเส้นนี้")}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. SELECTED WAREHOUSE CARD (Only shown in explore mode OR can be minimized) */}
      {!isCleanView && mode === "explore" && activeWarehouse && (
        <div
          className={`absolute bottom-6 right-6 z-20 bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-4 shadow-2xl text-white select-none transition-all duration-200 ${
            isCardMinimized ? "w-auto max-w-xs" : "max-w-sm w-full space-y-3"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 font-mono text-xs font-bold border border-orange-500/30">
              {activeWarehouse.warehouseCode}
            </span>
            <div className="flex items-center gap-1.5">
              <Tag color="slate" className="font-mono text-xs text-slate-300 m-0">
                {activeWarehouse.warehouseType || "GENERAL"}
              </Tag>
              <button
                type="button"
                onClick={() => setIsCardMinimized(!isCardMinimized)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title={isCardMinimized ? t("ขยายการ์ด") : t("ย่อการ์ด")}
              >
                {isCardMinimized ? <UpOutlined /> : <DownOutlined />}
              </button>
            </div>
          </div>

          {!isCardMinimized && (
            <>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {activeWarehouse.warehouseName}
                </h3>
                {activeWarehouse.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {activeWarehouse.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400">{t("ขนาดและพิกัด")}</span>
                <span className="font-mono text-orange-400">
                  {t("{w}×{l}ม. (สูง {h}ม.) • {rot}°", { w: activeLayout.size[0], l: activeLayout.size[2], h: activeLayout.size[1], rot: activeLayout.rot })}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelectWarehouse(activeWarehouse.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t("🚀 เข้าสู่พื้นที่คลัง 3D (Enter 3D Space)")}</span>
                <ArrowRightOutlined />
              </button>
            </>
          )}

          {isCardMinimized && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectWarehouse(activeWarehouse.id)}
                className="w-full py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t("เข้าสู่คลัง 3D")}</span>
                <ArrowRightOutlined />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. MAIN CRISP 3D CAMPUS CANVAS */}
      <Canvas
        shadows
        camera={{ position: [95, 80, 105], fov: 42, near: 0.5, far: 3000 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        className="w-full h-full"
      >
        {/* Bright Architectural Daylight Background (No washed out fog when zoomed out!) */}
        <color attach="background" args={["#e2e8f0"]} />
        {/* Fog pushed way back to 500m - 2000m so it NEVER bleaches out the factory when zooming */}
        <fog attach="fog" args={["#e2e8f0", 500, 2000]} />

        {/* Crisp Ambient, Hemisphere & Sun Lighting */}
        <ambientLight intensity={1.25} color="#ffffff" />
        <hemisphereLight color="#ffffff" groundColor="#cbd5e1" intensity={1.15} />
        <directionalLight
          position={[60, 95, 50]}
          intensity={2.8}
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-60, 45, -60]} intensity={1.1} color="#e2e8f0" />

        {/* Orbit Controls with wide zoom boundaries */}
        <OrbitControls
          ref={orbitRef}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={5}
          maxDistance={750}
        />

        {/* Expansive Campus Site Ground (Clean Light Asphalt with Green Lawns) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
          <planeGeometry args={[500, 450]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>

        {/* Green Landscaping Strips along Campus Perimeters */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -140]} receiveShadow>
          <planeGeometry args={[460, 40]} />
          <meshStandardMaterial color="#22c55e" roughness={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-180, -0.04, 0]} receiveShadow>
          <planeGeometry args={[40, 360]} />
          <meshStandardMaterial color="#22c55e" roughness={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[180, -0.04, 0]} receiveShadow>
          <planeGeometry args={[40, 360]} />
          <meshStandardMaterial color="#22c55e" roughness={0.9} />
        </mesh>

        {/* Site Ground Grid Lines - Extended */}
        <Grid
          position={[0, 0.01, 0]}
          args={[360, 320]}
          cellSize={5}
          cellThickness={0.8}
          cellColor="#94a3b8"
          sectionSize={25}
          sectionThickness={1.6}
          sectionColor="#cbd5e1"
          fadeDistance={380}
        />

        {/* Interactive Dynamic Road Network */}
        <group name="plant-roads">
          {roads.map((road) => (
            <SiteRoadMesh
              key={road.id}
              road={road}
              isSelected={mode === "reposition" && editTarget === "roads" && selectedRoadId === road.id}
              isEditMode={mode === "reposition" && editTarget === "roads"}
              onClick={() => {
                setSelectedRoadId(road.id);
                setEditTarget("roads");
              }}
            />
          ))}
        </group>

        {/* Entrance Gatehouse & Weighbridge Zone at South [0, 0, 65] */}
        <group position={[0, 0, 65]}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[8, 0.15, 16]} />
            <meshStandardMaterial color="#475569" metalness={0.7} />
          </mesh>
          <mesh position={[7.5, 2.2, 0]} castShadow>
            <boxGeometry args={[5, 4.4, 7]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[7.5, 4.5, 0]}>
            <boxGeometry args={[5.6, 0.2, 7.6]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[10, 0.18, 0.18]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <Billboard position={[0, 5.0, 0]}>
            <Text fontSize={0.65} color="#0f172a" anchorX="center" anchorY="middle">
              MAIN GATE & WEIGHBRIDGE SCALE
            </Text>
          </Billboard>
        </group>

        {/* Warehouse Buildings Placed on the Site Map */}
        {warehouses.map((wh) => {
          const layout = siteLayouts[wh.id] || {
            pos: [0, 0],
            rot: 0,
            size: [30, 8, 38],
          };
          return (
            <SiteWarehouseBuilding
              key={wh.id}
              warehouse={wh}
              position={layout.pos}
              rotation={layout.rot}
              size={layout.size}
              isSelected={selectedWarehouseId === wh.id}
              isEditMode={mode === "reposition" && editTarget === "warehouses"}
              onClick={() => {
                setSelectedWarehouseId(wh.id);
                if (mode === "reposition") {
                  setEditTarget("warehouses");
                }
              }}
            />
          );
        })}
      </Canvas>
    </div>
  );
};
