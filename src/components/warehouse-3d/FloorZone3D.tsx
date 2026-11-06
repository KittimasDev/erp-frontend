"use client";

import React, { useState, useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import type { ZoneConfig, Selected3DObject } from "@/types/warehouse-3d";
import { useT } from "@/lib/i18n/useT";
import { LotCargo3D } from "./LotCargo3D";

interface FloorZone3DProps {
  zone: ZoneConfig;
  selectedId: string | null;
  onSelect: (obj: Selected3DObject) => void;
  /** แจ้งว่าเมาส์อยู่บนโซนไหน (null = ออกจากโซน) — ถ้าส่งมา การ์ดรายการสินค้าจะแสดงเป็น HTML นอกภาพ 3D */
  onHover?: (zoneId: string | null) => void;
}

export const FloorZone3D: React.FC<FloorZone3DProps> = ({
  zone,
  selectedId,
  onSelect,
  onHover,
}) => {
  const t = useT();
  const { id, name, code, type, color = "#10b981", locationId, locationCode } = zone;
  const rawDims = Array.isArray(zone?.dimensions)
    ? zone.dimensions
    : Array.isArray((zone as any)?.size)
    ? (zone as any).size
    : [12, 1, 16];
  const width = Number(rawDims[0]) || 12;
  const height = Number(rawDims[1]) || 1;
  const length = Number(rawDims[2]) || 16;

  const rawPos = Array.isArray(zone?.position) && zone.position.length >= 3 ? zone.position : [0, 0, 0];
  const safePosition: [number, number, number] = [
    Number(rawPos[0]) || 0,
    Number(rawPos[1]) || 0,
    Number(rawPos[2]) || 0,
  ];

  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedId === id;

  // สินค้าจริงใน Location นี้ (Lot ที่มียอด) — ไม่มีข้อมูลสมมติ
  const zoneLots = zone.lots;
  const zoneItems = useMemo(
    () =>
      (zoneLots ?? []).map((l) => ({
        itemCode: l.itemCode,
        itemName: l.itemName,
        lotNumber: l.lotNo,
        quantity: l.quantity,
        unit: l.unit,
      })),
    [zoneLots],
  );

  const totalQuantity = useMemo(() => {
    return zoneItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  }, [zoneItems]);

  const utilization = Math.min(100, Math.round((totalQuantity / 40000) * 100));

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect({
      type: "zone",
      id,
      code: locationCode || code,
      name,
      locationId,
      locationCode: locationCode || code,
      capacity: 40000,
      currentStock: totalQuantity,
      utilizationPercent: utilization,
      items: zoneItems,
      lots: zone.lots,
    });
  };

  // วางลังสินค้าจริงเป็นตาราง (สูงสุด 6 lot ต่อโซน) ไม่ให้ชนข้อความบนพื้น
  const shownLots = (zoneLots ?? []).slice(0, 6);
  const maxLotQty = Math.max(1, ...shownLots.map((l) => l.quantity));
  const cargoCols = Math.min(Math.max(shownLots.length, 1), 3);
  const cargoRows = Math.ceil(shownLots.length / cargoCols) || 1;
  const cellW = width / cargoCols;
  const cellL = (length * 0.7) / cargoRows;
  const cargoSize = Math.max(0.6, Math.min(2, cellW * 0.6, cellL * 0.6));

  return (
    <group position={safePosition}>
      {/* 1. LOCATION COLORED FLOOR PLANE (ทำพื้นตามสีของ Location) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          onHover?.(id);
        }}
        onPointerOut={() => {
          setIsHovered(false);
          onHover?.(null);
        }}
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.65 : isHovered ? 0.48 : 0.35}
          roughness={0.45}
          metalness={0.1}
        />
      </mesh>

      {/* 2. INNER FLOOR GRID TILE HIGHLIGHT IN LOCATION COLOR */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.025, 0]}
        onClick={handleClick}
      >
        <planeGeometry args={[width - 0.4, length - 0.4]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={isSelected ? 0.4 : isHovered ? 0.3 : 0.18}
        />
      </mesh>

      {/* 3. BOLD SAFETY BOUNDARY CURB IN LOCATION COLOR (ขอบแบ่งโซนสี) */}
      <group position={[0, 0.08, 0]}>
        {/* North border */}
        <mesh position={[0, 0, -length / 2]} onClick={handleClick}>
          <boxGeometry args={[width, 0.16, 0.2]} />
          <meshStandardMaterial color={isSelected ? "#ffffff" : isHovered ? "#ffffff" : color} roughness={0.3} />
        </mesh>
        {/* South border */}
        <mesh position={[0, 0, length / 2]} onClick={handleClick}>
          <boxGeometry args={[width, 0.16, 0.2]} />
          <meshStandardMaterial color={isSelected ? "#ffffff" : isHovered ? "#ffffff" : color} roughness={0.3} />
        </mesh>
        {/* West border */}
        <mesh position={[-width / 2, 0, 0]} onClick={handleClick}>
          <boxGeometry args={[0.2, 0.16, length]} />
          <meshStandardMaterial color={isSelected ? "#ffffff" : isHovered ? "#ffffff" : color} roughness={0.3} />
        </mesh>
        {/* East border */}
        <mesh position={[width / 2, 0, 0]} onClick={handleClick}>
          <boxGeometry args={[0.2, 0.16, length]} />
          <meshStandardMaterial color={isSelected ? "#ffffff" : isHovered ? "#ffffff" : color} roughness={0.3} />
        </mesh>
      </group>

      {/* 4. CORNER BRACKET MARKERS IN LOCATION COLOR */}
      {[
        [-width / 2 + 0.6, -length / 2 + 0.6],
        [width / 2 - 0.6, -length / 2 + 0.6],
        [-width / 2 + 0.6, length / 2 - 0.6],
        [width / 2 - 0.6, length / 2 - 0.6],
      ].map(([cx, cz], cIdx) => (
        <mesh key={`corner-${cIdx}`} position={[cx, 0.035, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 1.2]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* 5. LARGE FLOOR STENCIL TEXT (รหัสและชื่อตำแหน่งบนพื้น) */}
      <group position={[0, 0.04, -length * 0.36]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text
          fontSize={Math.min(1.4, Math.max(0.6, width * 0.075))}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {`📍 ${locationCode || code}`}
        </Text>
      </group>
      <group position={[0, 0.04, -length * 0.26]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text
          fontSize={Math.min(0.8, Math.max(0.35, width * 0.045))}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
        >
          {t("{name} ({w}x{l} ม.)", { name, w: width, l: length })}
        </Text>
      </group>

      {/* 6. สินค้าจริงใน Location (รูปจาก master สินค้า) */}
      {shownLots.map((lot, idx) => {
        const c = idx % cargoCols;
        const r = Math.floor(idx / cargoCols);
        return (
          <LotCargo3D
            key={lot.lotId}
            lot={lot}
            size={cargoSize}
            heightFactor={0.55 + 0.45 * Math.min(1, lot.quantity / maxLotQty)}
            showLabel={isHovered || isSelected}
            position={[
              (c - (cargoCols - 1) / 2) * cellW,
              0,
              length * 0.12 + (r - (cargoRows - 1) / 2) * cellL,
            ]}
            onClick={handleClick}
          />
        );
      })}

      {/* 8. 3D HOVER TOOLTIP (แสดงรายการสินค้าและ Lot ทั้งหมดใน Location นี้) */}
      {isHovered && !onHover ? (
        <Billboard position={[0, Math.max(3.6, height + 3.2), 0]} follow>
          {/* Main Card Mesh */}
          <mesh onClick={handleClick}>
            <planeGeometry args={[5.6, Math.min(4.2, 2.2 + zoneItems.length * 0.45)]} />
            <meshBasicMaterial color="#020617" transparent opacity={0.96} />
          </mesh>

          {/* Glowing Border in Location Color */}
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(5.6, Math.min(4.2, 2.2 + zoneItems.length * 0.45))]} />
            <lineBasicMaterial color={color} linewidth={2} />
          </lineSegments>

          {/* Top Location Header with Color Dot */}
          <Text position={[0, 1.15, 0.02]} fontSize={0.28} color="#ffffff" anchorX="center" anchorY="middle">
            {`📍 ${locationCode || code} : ${name}`}
          </Text>
          <Text position={[0, 0.86, 0.02]} fontSize={0.16} color={color} anchorX="center" anchorY="middle">
            {t("พื้นที่จัดเก็บ Location • ขนาด {w}x{l} ม. ({area} ตร.ม.)", { w: width, l: length, area: width * length })}
          </Text>

          {/* Horizontal Divider Line */}
          <mesh position={[0, 0.68, 0.01]}>
            <planeGeometry args={[5.1, 0.015]} />
            <meshBasicMaterial color={color} />
          </mesh>

          {/* Stored Items & Lots Breakdown */}
          {zoneItems.slice(0, 3).map((it, idx) => {
            const yOffset = 0.42 - idx * 0.48;
            return (
              <group key={`hover-it-${idx}`}>
                <Text
                  position={[-2.45, yOffset, 0.02]}
                  fontSize={0.16}
                  color={idx === 0 ? "#fde047" : idx === 1 ? "#38bdf8" : "#f472b6"}
                  anchorX="left"
                  anchorY="middle"
                >
                  {`${idx + 1}. ${it.itemName}`}
                </Text>
                <Text
                  position={[-2.25, yOffset - 0.22, 0.02]}
                  fontSize={0.14}
                  color="#e2e8f0"
                  anchorX="left"
                  anchorY="middle"
                >
                  {`   ${t("จำนวน:")} ${Number(it.quantity).toLocaleString()} ${it.unit}  •  Lot: ${it.lotNumber || t("ไม่มีเลข Lot")}`}
                </Text>
              </group>
            );
          })}

          {zoneItems.length > 3 && (
            <Text position={[0, -0.68, 0.02]} fontSize={0.14} color="#94a3b8" anchorX="center" anchorY="middle">
              {t("... และอีก {n} รายการ (คลิกเพื่อดูรายการทั้งหมด)", { n: zoneItems.length - 3 })}
            </Text>
          )}

          {/* Footer Bar: Total Stock & Utilization */}
          <mesh position={[0, -0.88, 0.01]}>
            <planeGeometry args={[5.1, 0.015]} />
            <meshBasicMaterial color="#334155" />
          </mesh>
          <Text position={[0, -1.08, 0.02]} fontSize={0.16} color="#38bdf8" anchorX="center" anchorY="middle">
            {t("📊 รวม: {qty} กก.  •  ใช้งาน: {pct}%  •  คลิกเพื่อเลือก", { qty: totalQuantity.toLocaleString(), pct: utilization })}
          </Text>
        </Billboard>
      ) : (
        /* Floating Compact Area Tag with Location Color when NOT hovered */
        <Billboard position={[0, Math.max(2.6, height + 2.0), 0]} follow>
          <mesh position={[0, 0, 0]} onClick={handleClick}>
            <planeGeometry args={[Math.max(3.8, (locationCode || name).length * 0.26 + 1.8), 0.85]} />
            <meshBasicMaterial
              color="#090d16"
              transparent
              opacity={isSelected ? 0.96 : 0.88}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry
              args={[new THREE.PlaneGeometry(Math.max(3.8, (locationCode || name).length * 0.26 + 1.8), 0.85)]}
            />
            <lineBasicMaterial color={isSelected ? "#ffffff" : color} />
          </lineSegments>

          {/* Left indicator dot in location color */}
          <mesh position={[-Math.max(3.8, (locationCode || name).length * 0.26 + 1.8) / 2 + 0.35, 0.12, 0.01]}>
            <circleGeometry args={[0.12, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>

          <Text position={[0.15, 0.14, 0.02]} fontSize={0.24} color="#ffffff" anchorX="center" anchorY="middle">
            {`📍 ${locationCode || code}`}
          </Text>
          <Text position={[0, -0.18, 0.02]} fontSize={0.17} color="#fde047" anchorX="center" anchorY="middle">
            {`${name} • ${(zoneLots ?? []).length} lot`}
          </Text>
        </Billboard>
      )}
    </group>
  );
};
