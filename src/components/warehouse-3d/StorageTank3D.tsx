"use client";

import React, { useState } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { tNow } from "@/lib/i18n/useT";
import type { StorageTankConfig, Selected3DObject } from "@/types/warehouse-3d";

interface StorageTank3DProps {
  tank: StorageTankConfig;
  selectedId: string | null;
  onSelect: (obj: Selected3DObject) => void;
}

export const StorageTank3D: React.FC<StorageTank3DProps> = ({
  tank,
  selectedId,
  onSelect,
}) => {
  const {
    id,
    name,
    code,
    color = "#94a3b8",
    locationId,
    locationCode,
  } = tank;

  const rawPos = Array.isArray(tank?.position) && tank.position.length >= 3 ? tank.position : [0, 0, 0];
  const safePosition: [number, number, number] = [
    Number(rawPos[0]) || 0,
    Number(rawPos[1]) || 0,
    Number(rawPos[2]) || 0,
  ];
  const radius = Number(tank?.radius) || 3;
  const height = Number(tank?.height) || 7;
  const capacityLiters = Number(tank?.capacityLiters) || 50000;
  const currentLiters = Number(tank?.currentLiters) || 25000;

  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedId === id;

  const fillPercent = Math.round((currentLiters / capacityLiters) * 100);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect({
      type: "tank",
      id,
      code: locationCode || code,
      name,
      locationId,
      locationCode: locationCode || code,
      capacity: capacityLiters,
      currentStock: currentLiters,
      utilizationPercent: fillPercent,
      items: [
        {
          itemCode: "OIL-TDAE",
          itemName: tNow("TDAE Processing Oil / น้ำมันผสมยาง"),
          lotNumber: "LOT-TANK-01-202610",
          quantity: currentLiters,
          unit: tNow("ลิตร"),
        },
      ],
    });
  };

  return (
    <group position={safePosition}>
      {/* 1. Concrete Containment Bund (Dike wall around tank) */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry
          args={[radius + 0.8, radius + 1.0, 0.8, 32, 1, true]}
        />
        <meshStandardMaterial color="#475569" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Main Tank Cylinder Body */}
      <mesh
        position={[0, height / 2 + 0.2, 0]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={() => setIsHovered(false)}
      >
        <cylinderGeometry args={[radius, radius, height, 36]} />
        <meshStandardMaterial
          color={isSelected ? "#ea580c" : color}
          emissive={isSelected ? "#ea580c" : isHovered ? "#38bdf8" : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.25 : 0}
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>

      {/* 3. Domed Tank Roof Cap */}
      <mesh
        position={[0, height + 0.2, 0]}
        castShadow
        onClick={handleClick}
      >
        <sphereGeometry
          args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 4]}
        />
        <meshStandardMaterial
          color={isSelected ? "#c2410c" : "#64748b"}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* 4. Inspection Ladder on side */}
      <group position={[radius + 0.15, height / 2 + 0.2, 0]}>
        {/* Left rail */}
        <mesh position={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.02, 0.02, height, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Right rail */}
        <mesh position={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.02, 0.02, height, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Rungs */}
        {Array.from({ length: Math.floor(height * 2) }).map((_, rIdx) => (
          <mesh key={`rung-${rIdx}`} position={[0, -height / 2 + rIdx * 0.5 + 0.25, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        ))}
      </group>

      {/* 5. Liquid Level Sight Gauge Tube */}
      <group position={[-radius - 0.1, height / 2 + 0.2, 0]}>
        {/* Transparent glass tube */}
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, height * 0.85, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.3}
            roughness={0.1}
          />
        </mesh>
        {/* Liquid level inside tube */}
        <mesh
          position={[
            0,
            -(height * 0.85) / 2 + (height * 0.85 * (fillPercent / 100)) / 2,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.04,
              0.04,
              height * 0.85 * (fillPercent / 100),
              16,
            ]}
          />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#d97706"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
};
