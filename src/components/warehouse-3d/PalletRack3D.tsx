"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import type { RackConfig, Selected3DObject } from "@/types/warehouse-3d";
import { useT } from "@/lib/i18n/useT";

interface PalletRack3DProps {
  rack: RackConfig;
  explodeFactor: number; // 0 to 1
  heatmapMode: boolean;
  selectedId: string | null;
  selectedSlotKey: string | null; // e.g. "RACK-01_bay0_lvl1"
  onSelect: (obj: Selected3DObject, slotKey?: string) => void;
}

export const PalletRack3D: React.FC<PalletRack3DProps> = ({
  rack,
  explodeFactor,
  heatmapMode,
  selectedId,
  selectedSlotKey,
  onSelect,
}) => {
  const t = useT();
  const {
    id,
    name,
    code,
    bays = 3,
    levels = 4,
    bayWidth = 2.7,
    bayDepth = 1.1,
    levelHeight = 1.8,
    color = "#ea580c", // Industrial orange upright
    beamColor = "#f59e0b", // Traffic yellow beam
    locationId,
    locationCode,
  } = rack;

  const rawPos = Array.isArray(rack?.position) && rack.position.length >= 3 ? rack.position : [0, 0, 0];
  const safePosition: [number, number, number] = [
    Number(rawPos[0]) || 0,
    Number(rawPos[1]) || 0,
    Number(rawPos[2]) || 0,
  ];

  const rawRot = Array.isArray(rack?.rotation) && rack.rotation.length >= 3 ? rack.rotation : [0, 0, 0];
  const safeRotation: [number, number, number] = [
    Number(rawRot[0]) || 0,
    Number(rawRot[1]) || 0,
    Number(rawRot[2]) || 0,
  ];

  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);

  const totalWidth = bays * bayWidth;
  const totalHeight = levels * levelHeight;

  // Frame upright X coordinates: bays + 1 upright frames
  const frameXPositions = useMemo(() => {
    const list: number[] = [];
    const startX = -totalWidth / 2;
    for (let i = 0; i <= bays; i++) {
      list.push(startX + i * bayWidth);
    }
    return list;
  }, [bays, bayWidth, totalWidth]);

  // Seeded mock occupancy map for realistic visualization
  const slotOccupancyMap = useMemo(() => {
    const map = new Map<string, { occupied: boolean; percent: number; boxes: number }>();
    for (let b = 0; b < bays; b++) {
      for (let l = 0; l < levels; l++) {
        const key = `${id}_bay${b}_lvl${l}`;
        // Deterministic pseudo-random seed from id + bay + level
        const hash = (id.charCodeAt(0) * 17 + b * 31 + l * 13) % 100;
        let percent = 0;
        let occupied = false;
        let boxes = 0;
        if (hash > 20) {
          occupied = true;
          if (hash > 80) {
            percent = 95;
            boxes = 4;
          } else if (hash > 50) {
            percent = 65;
            boxes = 3;
          } else {
            percent = 35;
            boxes = 2;
          }
        }
        map.set(key, { occupied, percent, boxes });
      }
    }
    return map;
  }, [id, bays, levels]);

  const handleSlotClick = (
    e: ThreeEvent<MouseEvent>,
    bay: number,
    level: number,
    slotKey: string,
  ) => {
    e.stopPropagation();
    const occ = slotOccupancyMap.get(slotKey);
    const assignedLocationCode = locationCode
      ? `${locationCode}-${String(bay + 1).padStart(2, "0")}${String(level + 1).padStart(2, "0")}`
      : `${code}-${String(bay + 1).padStart(2, "0")}${String(level + 1).padStart(2, "0")}`;

    onSelect(
      {
        type: "rack_slot",
        id: `${id}-B${bay}-L${level}`,
        code: assignedLocationCode,
        name: t("{name} (ช่อง {bay}, ชั้น {level})", { name, bay: bay + 1, level: level + 1 }),
        locationId,
        locationCode: assignedLocationCode,
        bay: bay + 1,
        level: level + 1,
        capacity: 2,
        currentStock: occ?.occupied ? occ.boxes : 0,
        utilizationPercent: occ?.percent ?? 0,
        items: occ?.occupied
          ? [
              {
                itemCode: "MAT-NR-01",
                itemName: "Natural Rubber Sheet / ยางแผ่นรมควัน (RSS-3)",
                lotNumber: `LOT-202610-B${bay + 1}L${level + 1}`,
                quantity: occ.percent * 12.5,
                unit: "กก.",
              },
            ]
          : [],
      },
      slotKey,
    );
  };

  return (
    <group
      position={safePosition}
      rotation={[
        (safeRotation[0] * Math.PI) / 180,
        (safeRotation[1] * Math.PI) / 180,
        (safeRotation[2] * Math.PI) / 180,
      ]}
    >
      {/* 1. Vertical Upright Ladder Frames */}
      {frameXPositions.map((fx, fIdx) => (
        <group key={`frame-${fIdx}`} position={[fx, 0, 0]}>
          {/* Front post */}
          <mesh position={[0, totalHeight / 2, bayDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.08, totalHeight, 0.08]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Back post */}
          <mesh position={[0, totalHeight / 2, -bayDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.08, totalHeight, 0.08]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Base footplates */}
          <mesh position={[0, 0.04, bayDepth / 2]}>
            <boxGeometry args={[0.18, 0.08, 0.18]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0, 0.04, -bayDepth / 2]}>
            <boxGeometry args={[0.18, 0.08, 0.18]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Frame horizontal & diagonal braces */}
          {Array.from({ length: levels + 1 }).map((_, lIdx) => (
            <mesh
              key={`fbrace-${lIdx}`}
              position={[0, lIdx * levelHeight, 0]}
              castShadow
            >
              <boxGeometry args={[0.04, 0.04, bayDepth - 0.08]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 2. Horizontal Load Beams & Tiers with Exploded View Offset */}
      {Array.from({ length: levels }).map((_, level) => {
        // Vertical explode animation offset
        const yOffset = level * levelHeight + (level + 1) * explodeFactor * 1.6;
        const beamY = yOffset + 0.1;

        return (
          <group key={`tier-${level}`} position={[0, 0, 0]}>
            {/* Front & Back Load Beams across each bay */}
            {Array.from({ length: bays }).map((_, bay) => {
              const bayCenterX = -totalWidth / 2 + bay * bayWidth + bayWidth / 2;
              const slotKey = `${id}_bay${bay}_lvl${level}`;
              const isSlotSelected = selectedSlotKey === slotKey || selectedId === id;
              const isHovered = hoveredSlotKey === slotKey;
              const occ = slotOccupancyMap.get(slotKey);
              const assignedLocationCode = locationCode
                ? `${locationCode}-${String(bay + 1).padStart(2, "0")}${String(level + 1).padStart(2, "0")}`
                : `${code}-${String(bay + 1).padStart(2, "0")}${String(level + 1).padStart(2, "0")}`;

              // Heatmap color logic
              let slotColor = beamColor;
              if (heatmapMode) {
                if (!occ?.occupied || occ.percent === 0) {
                  slotColor = "#94a3b8"; // Empty
                } else if (occ.percent < 50) {
                  slotColor = "#10b981"; // Low/Normal (Green)
                } else if (occ.percent < 80) {
                  slotColor = "#f59e0b"; // Medium (Amber)
                } else {
                  slotColor = "#ef4444"; // High/Full (Red)
                }
              }

              return (
                <group key={slotKey} position={[bayCenterX, beamY, 0]}>
                  {/* Front Load Beam */}
                  <mesh
                    position={[0, 0, bayDepth / 2]}
                    castShadow
                    receiveShadow
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredSlotKey(slotKey);
                    }}
                    onPointerOut={() => setHoveredSlotKey(null)}
                    onClick={(e) => handleSlotClick(e, bay, level, slotKey)}
                  >
                    <boxGeometry args={[bayWidth - 0.08, 0.1, 0.06]} />
                    <meshStandardMaterial
                      color={isSlotSelected ? "#f97316" : slotColor}
                      emissive={isSlotSelected ? "#ea580c" : isHovered ? "#38bdf8" : "#000000"}
                      emissiveIntensity={isSlotSelected ? 0.7 : isHovered ? 0.4 : 0}
                      roughness={0.3}
                    />
                  </mesh>

                  {/* Back Load Beam */}
                  <mesh
                    position={[0, 0, -bayDepth / 2]}
                    castShadow
                    receiveShadow
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredSlotKey(slotKey);
                    }}
                    onPointerOut={() => setHoveredSlotKey(null)}
                    onClick={(e) => handleSlotClick(e, bay, level, slotKey)}
                  >
                    <boxGeometry args={[bayWidth - 0.08, 0.1, 0.06]} />
                    <meshStandardMaterial
                      color={isSlotSelected ? "#f97316" : slotColor}
                      emissive={isSlotSelected ? "#ea580c" : isHovered ? "#38bdf8" : "#000000"}
                      emissiveIntensity={isSlotSelected ? 0.7 : isHovered ? 0.4 : 0}
                      roughness={0.3}
                    />
                  </mesh>

                  {/* Wire mesh deck support shelf */}
                  <mesh position={[0, 0.04, 0]}>
                    <boxGeometry args={[bayWidth - 0.1, 0.02, bayDepth - 0.08]} />
                    <meshStandardMaterial
                      color="#64748b"
                      metalness={0.8}
                      roughness={0.4}
                      wireframe={false}
                    />
                  </mesh>

                  {/* Pallet 1 (Left in bay) */}
                  {occ?.occupied && (
                    <group position={[-bayWidth * 0.25, 0.12, 0]}>
                      {/* Wooden Pallet base */}
                      <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.0, 0.12, 0.9]} />
                        <meshStandardMaterial color="#b45309" roughness={0.8} />
                      </mesh>
                      {/* Cargo boxes / goods */}
                      <mesh
                        position={[0, 0.42, 0]}
                        castShadow
                        receiveShadow
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          setHoveredSlotKey(slotKey);
                        }}
                        onPointerOut={() => setHoveredSlotKey(null)}
                        onClick={(e) => handleSlotClick(e, bay, level, slotKey)}
                      >
                        <boxGeometry args={[0.9, 0.65, 0.85]} />
                        <meshStandardMaterial
                          color={heatmapMode ? slotColor : "#d97706"}
                          roughness={0.6}
                        />
                      </mesh>
                    </group>
                  )}

                  {/* Pallet 2 (Right in bay) */}
                  {occ?.occupied && occ.boxes >= 3 && (
                    <group position={[bayWidth * 0.25, 0.12, 0]}>
                      {/* Wooden Pallet base */}
                      <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.0, 0.12, 0.9]} />
                        <meshStandardMaterial color="#b45309" roughness={0.8} />
                      </mesh>
                      {/* Cargo boxes / goods */}
                      <mesh
                        position={[0, 0.48, 0]}
                        castShadow
                        receiveShadow
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          setHoveredSlotKey(slotKey);
                        }}
                        onPointerOut={() => setHoveredSlotKey(null)}
                        onClick={(e) => handleSlotClick(e, bay, level, slotKey)}
                      >
                        <boxGeometry args={[0.92, 0.75, 0.88]} />
                        <meshStandardMaterial
                          color={heatmapMode ? slotColor : "#0284c7"}
                          roughness={0.5}
                        />
                      </mesh>
                    </group>
                  )}

                  {/* Invisible Hitbox / Selection Volume for easy clicking */}
                  <mesh
                    position={[0, levelHeight / 2 - 0.2, 0]}
                    visible={isHovered || isSlotSelected}
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredSlotKey(slotKey);
                    }}
                    onPointerOut={() => setHoveredSlotKey(null)}
                    onClick={(e) => handleSlotClick(e, bay, level, slotKey)}
                  >
                    <boxGeometry
                      args={[bayWidth - 0.1, levelHeight - 0.3, bayDepth]}
                    />
                    <meshBasicMaterial
                      color={isSlotSelected ? "#f97316" : "#38bdf8"}
                      transparent
                      opacity={isSlotSelected ? 0.35 : 0.18}
                      wireframe={false}
                    />
                  </mesh>

                  {/* 3D HOVER TOOLTIP ON SHELF (Shows goods, quantity, and lot for this tier/slot) */}
                  {isHovered && (
                    <Billboard
                      position={[0, Math.min(levelHeight * 0.8, 1.4) + 0.35, bayDepth / 2 + 0.4]}
                      follow
                    >
                      {/* Card background */}
                      <mesh onClick={(e) => handleSlotClick(e, bay, level, slotKey)}>
                        <planeGeometry args={[3.8, occ?.occupied ? 1.9 : 1.35]} />
                        <meshBasicMaterial color="#020617" transparent opacity={0.95} />
                      </mesh>
                      <lineSegments>
                        <edgesGeometry args={[new THREE.PlaneGeometry(3.8, occ?.occupied ? 1.9 : 1.35)]} />
                        <lineBasicMaterial color={isSlotSelected ? "#f97316" : "#38bdf8"} />
                      </lineSegments>

                      {/* Location Header */}
                      <Text
                        position={[0, occ?.occupied ? 0.68 : 0.4, 0.02]}
                        fontSize={0.2}
                        color="#ffffff"
                        anchorX="center"
                        anchorY="middle"
                      >
                        {`🏷️ ${assignedLocationCode}`}
                      </Text>
                      <Text
                        position={[0, occ?.occupied ? 0.44 : 0.17, 0.02]}
                        fontSize={0.14}
                        color="#94a3b8"
                        anchorX="center"
                        anchorY="middle"
                      >
                        {t("{name} • ช่อง {bay} ชั้น {level}", { name, bay: bay + 1, level: level + 1 })}
                      </Text>

                      {/* Divider */}
                      <mesh position={[0, occ?.occupied ? 0.28 : 0.03, 0.01]}>
                        <planeGeometry args={[3.4, 0.012]} />
                        <meshBasicMaterial color="#334155" />
                      </mesh>

                      {occ?.occupied ? (
                        <>
                          <Text
                            position={[-1.65, 0.1, 0.02]}
                            fontSize={0.14}
                            color="#fde047"
                            anchorX="left"
                            anchorY="middle"
                          >
                            {t("📦 Natural Rubber Sheet / ยางแผ่นรมควัน")}
                          </Text>
                          <Text
                            position={[-1.65, -0.12, 0.02]}
                            fontSize={0.13}
                            color="#e2e8f0"
                            anchorX="left"
                            anchorY="middle"
                          >
                            {t("⚖️ จำนวน: {qty} กก. ({boxes} พาเลท)", { qty: (occ.percent * 12.5).toLocaleString(), boxes: occ.boxes })}
                          </Text>
                          <Text
                            position={[-1.65, -0.34, 0.02]}
                            fontSize={0.13}
                            color="#38bdf8"
                            anchorX="left"
                            anchorY="middle"
                          >
                            {`🔖 Lot: LOT-202610-B${bay + 1}L${level + 1}`}
                          </Text>
                          <Text
                            position={[0, -0.66, 0.02]}
                            fontSize={0.13}
                            color="#ea580c"
                            anchorX="center"
                            anchorY="middle"
                          >
                            {t("📊 ใช้งาน: {pct}%  •  คลิกเพื่อจัดการ", { pct: occ.percent })}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            position={[0, -0.18, 0.02]}
                            fontSize={0.15}
                            color="#10b981"
                            anchorX="center"
                            anchorY="middle"
                          >
                            {t("⚪ ช่องว่าง (พร้อมจัดเก็บพาเลท)")}
                          </Text>
                          <Text
                            position={[0, -0.42, 0.02]}
                            fontSize={0.12}
                            color="#64748b"
                            anchorX="center"
                            anchorY="middle"
                          >
                            {t("ความจุ 2 พาเลท (~2,500 กก.) • คลิกเพื่อเลือกวาง")}
                          </Text>
                        </>
                      )}
                    </Billboard>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};
