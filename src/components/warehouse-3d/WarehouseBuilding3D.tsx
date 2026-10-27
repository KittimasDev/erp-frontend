"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Grid } from "@react-three/drei";
import type { WarehouseBuildingConfig, DockDoorConfig } from "@/types/warehouse-3d";

interface WarehouseBuilding3DProps {
  building: WarehouseBuildingConfig;
  docks?: DockDoorConfig[];
}

export const WarehouseBuilding3D: React.FC<WarehouseBuilding3DProps> = ({
  building,
  docks = [],
}) => {
  const safeBuilding = building || {};
  const width = Number(safeBuilding.width) || 40;
  const length = Number(safeBuilding.length) || 60;
  const height = Number(safeBuilding.height) || 10;
  const floorColor = safeBuilding.floorColor || "#94a3b8";
  const halfW = width / 2;
  const halfL = length / 2;

  // Steel truss rafters every 10 meters along length
  const trussPositions = useMemo(() => {
    const spacing = 10;
    const count = Math.max(2, Math.floor(length / spacing));
    const positions: number[] = [];
    for (let i = 0; i <= count; i++) {
      positions.push(-halfL + i * (length / count));
    }
    return positions;
  }, [length, halfL]);

  return (
    <group name="warehouse-building">
      {/* 1. BRIGHT POLISHED INDUSTRIAL EPOXY FLOOR */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color={floorColor} // Bright clean industrial grey epoxy
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      {/* Crisp Floor Grid for positioning */}
      <Grid
        position={[0, 0.005, 0]}
        args={[width, length]}
        cellSize={1}
        cellThickness={0.8}
        cellColor="#cbd5e1"
        sectionSize={5}
        sectionThickness={1.4}
        sectionColor="#64748b"
        fadeDistance={90}
        fadeStrength={1.2}
      />

      {/* 2. PAINTED SAFETY WALKWAYS & FORKLIFT AISLE LINES */}
      <group name="floor-safety-markings" position={[0, 0.015, 0]}>
        {/* Main Central Forklift Highway (Yellow safety corridor) */}
        {/* Left aisle boundary line */}
        <mesh position={[-2.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, length - 4]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
        {/* Right aisle boundary line */}
        <mesh position={[2.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, length - 4]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>

        {/* Perimeter Safety Border around the floor */}
        <mesh position={[0, 0, -halfL + 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width - 2, 0.15]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
        <mesh position={[0, 0, halfL - 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width - 2, 0.15]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
        <mesh position={[-halfW + 1, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, length - 2]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
        <mesh position={[halfW - 1, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, length - 2]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      </group>

      {/* 3. CONCRETE FOUNDATION CURB / KICKPLATES */}
      <group name="perimeter-curb">
        {/* North */}
        <mesh position={[0, 0.3, -halfL]} receiveShadow castShadow>
          <boxGeometry args={[width + 0.6, 0.6, 0.4]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
        {/* South */}
        <mesh position={[0, 0.3, halfL]} receiveShadow castShadow>
          <boxGeometry args={[width + 0.6, 0.6, 0.4]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
        {/* West */}
        <mesh position={[-halfW, 0.3, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.4, 0.6, length]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
        {/* East */}
        <mesh position={[halfW, 0.3, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.4, 0.6, length]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
      </group>

      {/* 4. STEEL STRUCTURAL I-BEAM COLUMNS & OPEN-WEB ROOF TRUSSES */}
      <group name="building-superstructure">
        {trussPositions.map((z, idx) => (
          <group key={`truss-bay-${idx}`}>
            {/* Left Column (Industrial Blue/Grey Steel I-beam) */}
            <mesh position={[-halfW + 0.2, height / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[0.45, height, 0.45]} />
              <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Yellow Crash Guard at Column Base */}
            <mesh position={[-halfW + 0.2, 0.5, z]} castShadow>
              <boxGeometry args={[0.65, 1.0, 0.65]} />
              <meshStandardMaterial color="#facc15" roughness={0.4} />
            </mesh>

            {/* Right Column */}
            <mesh position={[halfW - 0.2, height / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[0.45, height, 0.45]} />
              <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Yellow Crash Guard at Column Base */}
            <mesh position={[halfW - 0.2, 0.5, z]} castShadow>
              <boxGeometry args={[0.65, 1.0, 0.65]} />
              <meshStandardMaterial color="#facc15" roughness={0.4} />
            </mesh>

            {/* Main Transverse Steel Truss Bottom Chord */}
            <mesh position={[0, height - 0.6, z]} castShadow>
              <boxGeometry args={[width - 0.6, 0.3, 0.25]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Sloped Roof Rafters (Left & Right Pitch to Center Ridge) */}
            <mesh
              position={[-halfW / 2, height + 0.6, z]}
              rotation={[0, 0, Math.atan2(1.6, halfW)]}
              castShadow
            >
              <boxGeometry args={[halfW * 1.03, 0.25, 0.25]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh
              position={[halfW / 2, height + 0.6, z]}
              rotation={[0, 0, -Math.atan2(1.6, halfW)]}
              castShadow
            >
              <boxGeometry args={[halfW * 1.03, 0.25, 0.25]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Truss Web Bracings (Diagonal steel lattice struts) */}
            {[-halfW * 0.7, -halfW * 0.35, 0, halfW * 0.35, halfW * 0.7].map((bx, bIdx) => (
              <mesh key={`strut-${bIdx}`} position={[bx, height + 0.1, z]} castShadow>
                <boxGeometry args={[0.1, 1.4, 0.1]} />
                <meshStandardMaterial color="#64748b" metalness={0.6} />
              </mesh>
            ))}

            {/* High-Bay LED UFO Industrial Light Fixtures */}
            {[-halfW * 0.5, 0, halfW * 0.5].map((lx, lIdx) => (
              <group key={`light-${lIdx}`} position={[lx, height - 1.0, z]}>
                {/* Suspension Rod */}
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
                  <meshBasicMaterial color="#334155" />
                </mesh>
                {/* UFO Lamp Housing */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.45, 0.6, 0.15, 16]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.8} />
                </mesh>
                {/* Glowing LED Lens */}
                <mesh position={[0, -0.08, 0]}>
                  <cylinderGeometry args={[0.42, 0.42, 0.02, 16]} />
                  <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={1.8}
                  />
                </mesh>
              </group>
            ))}
          </group>
        ))}

        {/* Longitudinal Roof Purlins running along building length */}
        {[-halfW * 0.8, -halfW * 0.4, 0, halfW * 0.4, halfW * 0.8].map((px, pIdx) => (
          <mesh
            key={`purlin-${pIdx}`}
            position={[px, height + (1 - Math.abs(px) / halfW) * 1.4 + 0.3, 0]}
            castShadow
          >
            <boxGeometry args={[0.15, 0.15, length]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* Translucent Frosted Skylight Ridge running down center */}
        <mesh position={[0, height + 1.8, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[3.5, 0.08, length - 2]} />
          <meshStandardMaterial
            color="#bae6fd"
            emissive="#e0f2fe"
            emissiveIntensity={0.6}
            transparent
            opacity={0.45}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 5. INDUSTRIAL LOADING DOCKS & SAFETY BOLLARDS */}
      <group name="dock-doors">
        {docks.map((dock) => {
          const rawPos = Array.isArray(dock?.position) && dock.position.length >= 3 ? dock.position : [0, 0, 0];
          const dx = Number(rawPos[0]) || 0;
          const dy = Number(rawPos[1]) || 0;
          const dz = Number(rawPos[2]) || 0;
          const dockW = Number(dock?.width) || 3.2;
          const dockH = Number(dock?.height) || 3.8;

          return (
            <group key={dock.id} position={[dx, dy, dz]}>
              {/* Outer Concrete Dock Frame */}
              <mesh position={[0, dockH / 2, 0]} castShadow>
                <boxGeometry args={[dockW + 0.8, dockH + 0.6, 0.5]} />
                <meshStandardMaterial color="#334155" roughness={0.6} />
              </mesh>

              {/* Aluminum Rolling Shutter Door */}
              <mesh position={[0, dockH / 2, 0.08]} castShadow>
                <boxGeometry args={[dockW, dockH, 0.12]} />
                <meshStandardMaterial
                  color="#e2e8f0"
                  metalness={0.75}
                  roughness={0.3}
                />
              </mesh>

              {/* Safety Yellow/Black Warning Header Stripe */}
              <mesh position={[0, dockH + 0.15, 0.3]}>
                <boxGeometry args={[dockW + 1.0, 0.4, 0.25]} />
                <meshStandardMaterial color="#facc15" roughness={0.4} />
              </mesh>

              {/* Dock Leveler Pit on floor */}
              <mesh position={[0, 0.02, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.2, 2.8]} />
                <meshStandardMaterial color="#475569" metalness={0.8} />
              </mesh>

              {/* Rubber Dock Bumpers on sides */}
              <mesh position={[-dockW / 2 - 0.25, 0.8, 0.4]} castShadow>
                <boxGeometry args={[0.25, 1.2, 0.35]} />
                <meshStandardMaterial color="#0f172a" roughness={0.9} />
              </mesh>
              <mesh position={[dockW / 2 + 0.25, 0.8, 0.4]} castShadow>
                <boxGeometry args={[0.25, 1.2, 0.35]} />
                <meshStandardMaterial color="#0f172a" roughness={0.9} />
              </mesh>

              {/* Yellow Steel Safety Bollards protecting dock corners */}
              <group position={[-dockW / 2 - 0.7, 0.6, 0.8]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.12, 0.12, 1.2, 16]} />
                  <meshStandardMaterial color="#facc15" metalness={0.3} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.6, 0]}>
                  <sphereGeometry args={[0.12, 16, 16]} />
                  <meshStandardMaterial color="#facc15" />
                </mesh>
              </group>
              <group position={[dockW / 2 + 0.7, 0.6, 0.8]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.12, 0.12, 1.2, 16]} />
                  <meshStandardMaterial color="#facc15" metalness={0.3} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.6, 0]}>
                  <sphereGeometry args={[0.12, 16, 16]} />
                  <meshStandardMaterial color="#facc15" />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>

      {/* 6. BRIGHT INSULATED SANDWICH WALLS (Semi-transparent for easy viewing inside) */}
      <group name="insulated-walls">
        {/* Back Wall (North) */}
        <mesh position={[0, 3.5, -halfL]} receiveShadow>
          <boxGeometry args={[width, 7, 0.15]} />
          <meshStandardMaterial
            color="#f1f5f9"
            transparent
            opacity={0.35}
            roughness={0.4}
          />
        </mesh>
        {/* Left Wall (West) */}
        <mesh position={[-halfW, 3.5, 0]} receiveShadow>
          <boxGeometry args={[0.15, 7, length]} />
          <meshStandardMaterial
            color="#f1f5f9"
            transparent
            opacity={0.35}
            roughness={0.4}
          />
        </mesh>
      </group>
    </group>
  );
};
