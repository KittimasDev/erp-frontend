"use client";

import React, { useState, useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import type { ZoneConfig, Selected3DObject } from "@/types/warehouse-3d";

interface FloorZone3DProps {
  zone: ZoneConfig;
  selectedId: string | null;
  onSelect: (obj: Selected3DObject) => void;
}

export const FloorZone3D: React.FC<FloorZone3DProps> = ({
  zone,
  selectedId,
  onSelect,
}) => {
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

  // Items stored in this warehouse location (use real lots if provided, else defaults)
  const zoneItems = useMemo(() => {
    if (zone.items && zone.items.length > 0) {
      return zone.items;
    }
    return [
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
  }, [zone.items]);

  const totalQuantity = useMemo(() => {
    return zoneItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  }, [zoneItems]);

  const primaryItem = zoneItems[0] || {
    itemCode: "RAW-RUB-01",
    itemName: "ยางดิบ / ยางก้อนถ้วย",
    lotNumber: "LOT-RAW-202610-01",
    quantity: 14500,
    unit: "กก.",
  };

  const secondaryItem = zoneItems[1] || {
    itemCode: "CAKE-RUB-02",
    itemName: "ขี้ยาง / ยางเค้ก",
    lotNumber: "LOT-CAKE-202610-02",
    quantity: 8200,
    unit: "กก.",
  };

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
    });
  };

  // Stack positions dynamically scaled to zone dimensions
  const leftStackX = -width * 0.25;
  const rightStackX = width * 0.25;
  const stackZ = 0;

  // Determine if primary item is tire-based to render tires, or rubber bales
  const isTirePrimary =
    primaryItem.itemCode.includes("TIRE") ||
    primaryItem.itemName.includes("ยางเก่า") ||
    primaryItem.itemName.includes("ยางรถ");

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
        }}
        onPointerOut={() => setIsHovered(false)}
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
          {`${name} (${width}x${length} ม.)`}
        </Text>
      </group>

      {/* 6. CARGO STACK 1 (Primary Item & Lot in this Location) */}
      <group
        position={[leftStackX, 0, stackZ]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onClick={handleClick}
      >
        {/* Timber Skid Base */}
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[Math.min(width * 0.38, 3.2), 0.16, Math.min(length * 0.38, 3.6)]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>

        {isTirePrimary ? (
          /* Cylindrical Tire Stack */
          <group position={[0, 0.16, 0]}>
            {[-0.6, 0.6].map((tx) =>
              [-0.6, 0.6].map((tz) => (
                <mesh key={`tire-${tx}-${tz}`} position={[tx, 0.55, tz]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.55, 0.55, 1.1, 16]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.9} />
                </mesh>
              )),
            )}
          </group>
        ) : (
          /* Natural Rubber Bales Stack (Amber Brown with straps) */
          <group position={[0, 0.16, 0]}>
            <mesh position={[-0.6, 0.32, -0.6]} castShadow receiveShadow>
              <boxGeometry args={[1.1, 0.6, 1.1]} />
              <meshStandardMaterial color="#b45309" roughness={0.65} />
            </mesh>
            <mesh position={[0.6, 0.32, -0.6]} castShadow receiveShadow>
              <boxGeometry args={[1.1, 0.6, 1.1]} />
              <meshStandardMaterial color="#92400e" roughness={0.65} />
            </mesh>
            <mesh position={[-0.6, 0.32, 0.6]} castShadow receiveShadow>
              <boxGeometry args={[1.1, 0.6, 1.1]} />
              <meshStandardMaterial color="#a16207" roughness={0.7} />
            </mesh>
            <mesh position={[0.6, 0.32, 0.6]} castShadow receiveShadow>
              <boxGeometry args={[1.1, 0.6, 1.1]} />
              <meshStandardMaterial color="#b45309" roughness={0.65} />
            </mesh>
            {/* Top Tier */}
            <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.9, 0.55, 1.9]} />
              <meshStandardMaterial color="#b45309" roughness={0.65} />
            </mesh>
            {/* Strapping Belts */}
            <mesh position={[0, 0.62, 0]}>
              <boxGeometry args={[2.34, 0.05, 2.34]} />
              <meshStandardMaterial color="#0f172a" roughness={0.3} />
            </mesh>
          </group>
        )}

        {/* Floating 3D Tag on Stack 1 */}
        <group position={[0, 1.95, 0]}>
          <Billboard follow>
            <mesh>
              <planeGeometry args={[2.8, 0.55]} />
              <meshBasicMaterial color="#090d16" transparent opacity={0.92} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.PlaneGeometry(2.8, 0.55)]} />
              <lineBasicMaterial color={color} />
            </lineSegments>
            <Text position={[0, 0.11, 0.02]} fontSize={0.16} color="#ffffff" anchorX="center" anchorY="middle">
              {`📦 ${primaryItem.itemName.slice(0, 24)}`}
            </Text>
            <Text position={[0, -0.12, 0.02]} fontSize={0.13} color="#fde047" anchorX="center" anchorY="middle">
              {`${Number(primaryItem.quantity).toLocaleString()} ${primaryItem.unit} • Lot: ${primaryItem.lotNumber || '-'}`}
            </Text>
          </Billboard>
        </group>
      </group>

      {/* 7. CARGO STACK 2 (Secondary Item & Lot in this Location) */}
      <group
        position={[rightStackX, 0, stackZ]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onClick={handleClick}
      >
        {/* Timber Skid Base */}
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[Math.min(width * 0.36, 3.0), 0.16, Math.min(length * 0.36, 3.4)]} />
          <meshStandardMaterial color="#451a03" roughness={0.95} />
        </mesh>

        {/* Rough Dark Rubber Cake / Material Blocks */}
        <group position={[0, 0.16, 0]}>
          <mesh position={[-0.55, 0.3, -0.55]} castShadow receiveShadow>
            <boxGeometry args={[1.15, 0.55, 1.15]} />
            <meshStandardMaterial color="#262626" roughness={0.85} />
          </mesh>
          <mesh position={[0.55, 0.3, -0.55]} castShadow receiveShadow>
            <boxGeometry args={[1.15, 0.55, 1.15]} />
            <meshStandardMaterial color="#1c1917" roughness={0.9} />
          </mesh>
          <mesh position={[-0.55, 0.3, 0.55]} castShadow receiveShadow>
            <boxGeometry args={[1.15, 0.55, 1.15]} />
            <meshStandardMaterial color="#292524" roughness={0.85} />
          </mesh>
          <mesh position={[0.55, 0.3, 0.55]} castShadow receiveShadow>
            <boxGeometry args={[1.15, 0.55, 1.15]} />
            <meshStandardMaterial color="#262626" roughness={0.85} />
          </mesh>
          {/* Top Layer */}
          <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.5, 1.8]} />
            <meshStandardMaterial color="#1c1917" roughness={0.9} />
          </mesh>
        </group>

        {/* Floating 3D Tag on Stack 2 */}
        <group position={[0, 1.82, 0]}>
          <Billboard follow>
            <mesh>
              <planeGeometry args={[2.8, 0.55]} />
              <meshBasicMaterial color="#090d16" transparent opacity={0.92} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.PlaneGeometry(2.8, 0.55)]} />
              <lineBasicMaterial color={color} />
            </lineSegments>
            <Text position={[0, 0.11, 0.02]} fontSize={0.16} color="#ffffff" anchorX="center" anchorY="middle">
              {`📦 ${secondaryItem.itemName.slice(0, 24)}`}
            </Text>
            <Text position={[0, -0.12, 0.02]} fontSize={0.13} color="#fca5a5" anchorX="center" anchorY="middle">
              {`${Number(secondaryItem.quantity).toLocaleString()} ${secondaryItem.unit} • Lot: ${secondaryItem.lotNumber || '-'}`}
            </Text>
          </Billboard>
        </group>
      </group>

      {/* 8. 3D HOVER TOOLTIP (แสดงรายการสินค้าและ Lot ทั้งหมดใน Location นี้) */}
      {isHovered ? (
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
            {`พื้นที่จัดเก็บ Location • ขนาด ${width}x${length} ม. (${width * length} ตร.ม.)`}
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
                  {`   จำนวน: ${Number(it.quantity).toLocaleString()} ${it.unit}  •  Lot: ${it.lotNumber || 'ไม่มีเลข Lot'}`}
                </Text>
              </group>
            );
          })}

          {zoneItems.length > 3 && (
            <Text position={[0, -0.68, 0.02]} fontSize={0.14} color="#94a3b8" anchorX="center" anchorY="middle">
              {`... และอีก ${zoneItems.length - 3} รายการ (คลิกเพื่อดูรายการทั้งหมด)`}
            </Text>
          )}

          {/* Footer Bar: Total Stock & Utilization */}
          <mesh position={[0, -0.88, 0.01]}>
            <planeGeometry args={[5.1, 0.015]} />
            <meshBasicMaterial color="#334155" />
          </mesh>
          <Text position={[0, -1.08, 0.02]} fontSize={0.16} color="#38bdf8" anchorX="center" anchorY="middle">
            {`📊 รวม: ${totalQuantity.toLocaleString()} กก.  •  ใช้งาน: ${utilization}%  •  คลิกเพื่อเลือก`}
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
            {`${name} • ${totalQuantity.toLocaleString()} กก. (Lot: ${primaryItem.lotNumber || '-'})`}
          </Text>
        </Billboard>
      )}
    </group>
  );
};
