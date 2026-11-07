"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type {
  Warehouse3DLayoutConfig,
  Warehouse3DViewMode,
  LightingPreset,
  Selected3DObject,
  RackConfig,
  ZoneConfig,
  StorageTankConfig,
} from "@/types/warehouse-3d";

import { WarehouseBuilding3D } from "./WarehouseBuilding3D";
import { FloorZone3D } from "./FloorZone3D";
import { WarehouseAnnotations } from "./WarehouseAnnotations";
import { DroneController } from "./DroneController";
import { ZoneEditHandles } from "./ZoneEditHandles";
import { tNow } from "@/lib/i18n/useT";

interface Warehouse3DCanvasProps {
  layout: Warehouse3DLayoutConfig;
  viewMode: Warehouse3DViewMode;
  explodeFactor: number;
  heatmapMode: boolean;
  lighting: LightingPreset;
  layers: {
    racks: boolean;
    zones: boolean;
    tanks: boolean;
    docks: boolean;
    annotations: boolean;
  };
  selectedObject: Selected3DObject | null;
  selectedSlotKey: string | null;
  onSelectObject: (obj: Selected3DObject, slotKey?: string) => void;
  onExitDrone: () => void;
  cameraPresetCommand: string | null;
  onCameraPresetHandled: () => void;
  /** ถ้าส่งมา โซนที่เลือกจะมีจุดจับให้ลากย้าย/ยืดบนภาพ 3D */
  onHoverZone?: (zoneId: string | null) => void;
  onUpdateZone?: (id: string, patch: Pick<ZoneConfig, "position" | "dimensions">) => void;
}

function SceneLighting({ lighting }: { lighting: LightingPreset }) {
  if (lighting === "night") {
    return (
      <>
        <ambientLight intensity={0.2} color="#1e293b" />
        {/* High-Bay Overhead Array */}
        <spotLight
          position={[-10, 15, 0]}
          angle={0.6}
          penumbra={0.7}
          intensity={400}
          color="#f8fafc"
          castShadow
        />
        <spotLight
          position={[10, 15, 0]}
          angle={0.6}
          penumbra={0.7}
          intensity={400}
          color="#f8fafc"
          castShadow
        />
        <spotLight
          position={[0, 15, -15]}
          angle={0.6}
          penumbra={0.7}
          intensity={400}
          color="#f8fafc"
        />
        <spotLight
          position={[0, 15, 15]}
          angle={0.6}
          penumbra={0.7}
          intensity={400}
          color="#f8fafc"
        />
      </>
    );
  }

  if (lighting === "sunset") {
    return (
      <>
        <ambientLight intensity={0.4} color="#38bdf8" />
        <directionalLight
          position={[-35, 12, 25]}
          intensity={2.2}
          color="#f97316"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[20, 8, -20]} intensity={0.8} color="#fdba74" />
      </>
    );
  }

  // Default: Bright Architectural Day Lighting
  return (
    <>
      <ambientLight intensity={1.2} color="#ffffff" />
      <hemisphereLight
        color="#ffffff"
        groundColor="#cbd5e1"
        intensity={1.1}
      />
      <directionalLight
        position={[35, 55, 25]}
        intensity={2.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-30, 25, -30]}
        intensity={1.0}
        color="#e2e8f0"
      />
    </>
  );
}

function CameraController({
  preset,
  onHandled,
  orbitRef,
}: {
  preset: string | null;
  onHandled: () => void;
  orbitRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  useEffect(() => {
    if (!preset || !orbitRef.current) return;
    const controls = orbitRef.current;

    switch (preset) {
      case "overview":
        controls.object.position.set(28, 22, 32);
        controls.target.set(0, 2, 0);
        break;
      case "top":
        controls.object.position.set(0, 48, 0.1);
        controls.target.set(0, 0, 0);
        break;
      case "dock":
        controls.object.position.set(0, 5, 26);
        controls.target.set(0, 2, 0);
        break;
      case "aisle":
        controls.object.position.set(-6, 2.8, 12);
        controls.target.set(-6, 2.8, -10);
        break;
      case "side":
        controls.object.position.set(40, 8, 0);
        controls.target.set(0, 4, 0);
        break;
    }
    controls.update();
    onHandled();
  }, [preset, onHandled, orbitRef]);

  return null;
}

export const Warehouse3DCanvas: React.FC<Warehouse3DCanvasProps> = ({
  layout,
  viewMode,
  explodeFactor,
  heatmapMode,
  lighting,
  layers,
  selectedObject,
  selectedSlotKey,
  onSelectObject,
  onExitDrone,
  cameraPresetCommand,
  onCameraPresetHandled,
  onHoverZone,
  onUpdateZone,
}) => {
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const [isDraggingZone, setIsDraggingZone] = useState(false);
  const editableZone =
    onUpdateZone && layers.zones && selectedObject?.type === "zone"
      ? (layout.zones || []).find((z) => z.id === selectedObject.id)
      : undefined;

  const isDroneMode = viewMode === "drone";

  return (
    <div className="w-full h-[calc(100dvh-128px)] relative overflow-hidden bg-slate-950">
      <Canvas
        shadows
        camera={{ position: [28, 22, 32], fov: 48 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        className="w-full h-full"
      >
        <color
          attach="background"
          args={[
            lighting === "night"
              ? "#090d16"
              : lighting === "sunset"
              ? "#1e1329"
              : "#e2e8f0",
          ]}
        />
        <fog
          attach="fog"
          args={[
            lighting === "night"
              ? "#090d16"
              : lighting === "sunset"
              ? "#1e1329"
              : "#e2e8f0",
            50,
            180,
          ]}
        />

        <SceneLighting lighting={lighting} />

        <CameraController
          preset={cameraPresetCommand}
          onHandled={onCameraPresetHandled}
          orbitRef={orbitRef}
        />

        {/* OrbitControls (Disabled when in Drone mode) */}
        <OrbitControls
          ref={orbitRef}
          enabled={!isDroneMode && !isDraggingZone}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={3}
          maxDistance={90}
        />

        {/* First Person Drone Mode Controller */}
        <DroneController active={isDroneMode} onExit={onExitDrone} />

        {/* Building Structure & Docks */}
        <WarehouseBuilding3D
          building={layout.building}
          docks={layers.docks ? layout.docks || [] : []}
        />

        {/* Floor Zones (พื้นที่จัดเก็บตาม Warehouse Location แบ่งตามสี) */}
        {layers.zones &&
          (layout.zones || []).map((zone) => (
            <FloorZone3D
              key={zone.id}
              zone={zone}
              selectedId={selectedObject?.id ?? null}
              onSelect={onSelectObject}
              onHover={onHoverZone}
            />
          ))}

        {editableZone && !isDroneMode && onUpdateZone && (
          <ZoneEditHandles
            zone={editableZone}
            building={layout.building}
            onChange={(patch) => onUpdateZone(editableZone.id, patch)}
            onDragStateChange={setIsDraggingZone}
          />
        )}

        {/* 3D Floating Annotations / Badges */}
        <WarehouseAnnotations
          racks={[]}
          zones={layers.zones ? layout.zones || [] : []}
          docks={layers.docks ? layout.docks || [] : []}
          visible={layers.annotations && !isDroneMode}
          selectedId={selectedObject?.id ?? null}
          onSelectRack={() => {}}
          onSelectZone={(z) => {
            const fallbackItems = [
              {
                itemCode: "RAW-RUB-01",
                itemName: tNow("ยางดิบ / ยางก้อนถ้วย (Raw Natural Rubber)"),
                lotNumber: "LOT-RAW-202610-01",
                quantity: 14500,
                unit: tNow("กก."),
              },
              {
                itemCode: "CAKE-RUB-02",
                itemName: tNow("ขี้ยาง / ยางเค้ก (Rubber Cake Slab)"),
                lotNumber: "LOT-CAKE-202610-02",
                quantity: 8200,
                unit: tNow("กก."),
              },
            ];
            const items = z.items && z.items.length > 0 ? z.items : fallbackItems;
            const currentStock = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
            onSelectObject({
              type: "zone",
              id: z.id,
              code: z.locationCode || z.code,
              name: z.name,
              locationId: z.locationId,
              locationCode: z.locationCode,
              capacity: 35000,
              currentStock,
              utilizationPercent: Math.min(100, Math.round((currentStock / 35000) * 100)),
              items,
              lots: z.lots,
            });
          }}
        />
      </Canvas>
    </div>
  );
};
