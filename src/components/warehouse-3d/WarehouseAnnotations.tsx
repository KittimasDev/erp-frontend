"use client";

import React, { useState } from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";
import type {
  RackConfig,
  ZoneConfig,
  StorageTankConfig,
  DockDoorConfig,
} from "@/types/warehouse-3d";

interface WarehouseAnnotationsProps {
  racks?: RackConfig[];
  zones?: ZoneConfig[];
  tanks?: StorageTankConfig[];
  docks?: DockDoorConfig[];
  visible: boolean;
  selectedId: string | null;
  onSelectRack?: (rack: RackConfig) => void;
  onSelectZone: (zone: ZoneConfig) => void;
  onSelectTank?: (tank: StorageTankConfig) => void;
}

function AnnotationBadge({
  position,
  text,
  dotColor,
  isSelected,
  onClick,
}: {
  position: [number, number, number];
  text: string;
  dotColor: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const width = Math.max(2.4, text.length * 0.36 + 0.9);
  const height = 0.75;

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* Background Pill Mesh */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={isSelected ? "#ea580c" : hovered ? "#334155" : "#090d16"}
          transparent
          opacity={0.88}
          depthTest={false}
        />
      </mesh>

      {/* Outer Border Outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial
          color={isSelected ? "#fdba74" : hovered ? "#38bdf8" : dotColor}
          depthTest={false}
        />
      </lineSegments>

      {/* Left Indicator Dot */}
      <mesh position={[-width / 2 + 0.32, 0, 0.01]}>
        <circleGeometry args={[0.11, 16]} />
        <meshBasicMaterial
          color={isSelected ? "#ffedd5" : dotColor}
          depthTest={false}
        />
      </mesh>

      {/* Label Text */}
      <Text
        position={[0.18, 0, 0.02]}
        fontSize={0.32}
        color={isSelected ? "#ffffff" : "#f8fafc"}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </Billboard>
  );
}

export const WarehouseAnnotations: React.FC<WarehouseAnnotationsProps> = ({
  racks = [],
  zones = [],
  tanks = [],
  docks = [],
  visible,
  selectedId,
  onSelectRack,
  onSelectZone,
  onSelectTank,
}) => {
  if (!visible) return null;

  return (
    <group name="warehouse-annotations">
      {/* 1. Zone / Location Annotations */}
      {zones.map((zone) => {
        const rawPos = Array.isArray(zone?.position) && zone.position.length >= 3 ? zone.position : [0, 0, 0];
        const zx = Number(rawPos[0]) || 0;
        const zy = Number(rawPos[1]) || 0;
        const zz = Number(rawPos[2]) || 0;
        const isSelected = selectedId === zone.id;

        return (
          <AnnotationBadge
            key={`ann-zone-${zone.id}`}
            position={[zx, zy + 2.2, zz]}
            text={zone.locationCode ? `${zone.locationCode} • ${zone.name}` : zone.name}
            dotColor={zone.color || "#10b981"}
            isSelected={isSelected}
            onClick={() => onSelectZone(zone)}
          />
        );
      })}

      {/* 3. Dock Annotations */}
      {docks.map((dock) => {
        const rawPos = Array.isArray(dock?.position) && dock.position.length >= 3 ? dock.position : [0, 0, 0];
        const dx = Number(rawPos[0]) || 0;
        const dy = Number(rawPos[1]) || 0;
        const dz = Number(rawPos[2]) || 0;
        const dockH = Number(dock?.height) || 3.8;

        return (
          <AnnotationBadge
            key={`ann-dock-${dock.id}`}
            position={[dx, dy + dockH + 0.6, dz]}
            text={`🚪 ${dock.name}`}
            dotColor="#10b981"
            isSelected={false}
            onClick={() => {}}
          />
        );
      })}
    </group>
  );
};
