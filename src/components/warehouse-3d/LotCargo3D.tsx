"use client";

import React, { Suspense } from "react";
import * as THREE from "three";
import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { Billboard, RoundedBox, Text } from "@react-three/drei";
import type { ZoneLot } from "@/types/warehouse-3d";

interface LotCargo3DProps {
  lot: ZoneLot;
  position: [number, number, number];
  size: number;
  /** 0.55-1: ความสูงลังตามปริมาณเทียบ lot ที่มากที่สุดในโซน */
  heightFactor?: number;
  /** แสดงป้ายชื่อเต็ม (ตอน hover/เลือกโซน) — ปกติโชว์แค่จำนวนเพื่อไม่ให้รก */
  showLabel?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

function colorFromCode(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360}, 42%, 52%)`;
}

const BOX_COLOR = "#c8a778"; // กล่องกระดาษ
const PALLET_HEIGHT = 0.14;

/** แผ่นรูปสินค้า (มีขอบขาวเหมือนป้ายรูปติดข้างลัง) */
function PhotoPlate({
  src,
  size,
  position,
  rotationY,
}: {
  src: string;
  size: number;
  position: [number, number, number];
  rotationY: number;
}) {
  const texture = useLoader(THREE.TextureLoader, src);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[size * 0.88, size * 0.88]} />
        <meshStandardMaterial
          map={texture}
          map-colorSpace={THREE.SRGBColorSpace}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

/** สินค้า 1 lot: พาเลท + กล่องมุมมน + รูปสินค้าติด 4 ด้าน (ไม่มีรูป = ลังสีตามรหัส) */
export const LotCargo3D: React.FC<LotCargo3DProps> = ({
  lot,
  position,
  size,
  heightFactor = 1,
  showLabel = false,
  onClick,
}) => {
  const boxH = Math.max(0.5, size * heightFactor);
  const boxY = PALLET_HEIGHT + boxH / 2;
  const half = size / 2;
  const plate = Math.min(size, boxH) * 0.86;
  const body = lot.imageSrc ? BOX_COLOR : colorFromCode(lot.itemCode);

  return (
    <group position={position} onClick={onClick}>
      {/* เงาตกพื้น */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[size * 1.35, size * 1.35]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} depthWrite={false} />
      </mesh>

      {/* พาเลทไม้ */}
      <RoundedBox
        args={[size * 1.08, PALLET_HEIGHT, size * 1.08]}
        radius={0.03}
        position={[0, PALLET_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#9a6b3f" roughness={0.9} />
      </RoundedBox>

      {/* ตัวกล่อง */}
      <RoundedBox
        args={[size, boxH, size]}
        radius={0.07}
        smoothness={3}
        position={[0, boxY, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={body} roughness={0.75} />
      </RoundedBox>

      {lot.imageSrc && (
        <Suspense fallback={null}>
          <PhotoPlate src={lot.imageSrc} size={plate} position={[0, boxY, half + 0.01]} rotationY={0} />
          <PhotoPlate src={lot.imageSrc} size={plate} position={[0, boxY, -half - 0.01]} rotationY={Math.PI} />
          <PhotoPlate src={lot.imageSrc} size={plate} position={[half + 0.01, boxY, 0]} rotationY={Math.PI / 2} />
          <PhotoPlate src={lot.imageSrc} size={plate} position={[-half - 0.01, boxY, 0]} rotationY={-Math.PI / 2} />
        </Suspense>
      )}

      {/* ป้าย: ปกติโชว์แค่จำนวน / hover-เลือกโซนแล้วโชว์ชื่อ+Lot */}
      <Billboard position={[0, PALLET_HEIGHT + boxH + (showLabel ? 0.75 : 0.42), 0]} follow>
        {showLabel ? (
          <>
            <RoundedBox args={[3.1, 0.7, 0.02]} radius={0.12}>
              <meshBasicMaterial color="#0f172a" transparent opacity={0.94} />
            </RoundedBox>
            <Text position={[0, 0.14, 0.03]} fontSize={0.19} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={2.9}>
              {lot.itemName.slice(0, 28)}
            </Text>
            <Text position={[0, -0.14, 0.03]} fontSize={0.14} color="#fde68a" anchorX="center" anchorY="middle" maxWidth={2.9}>
              {`${lot.quantity.toLocaleString()} ${lot.unit} · Lot ${lot.lotNo}`}
            </Text>
          </>
        ) : (
          <>
            <RoundedBox args={[1.5, 0.36, 0.02]} radius={0.1}>
              <meshBasicMaterial color="#0f172a" transparent opacity={0.88} />
            </RoundedBox>
            <Text position={[0, 0, 0.03]} fontSize={0.17} color="#fde68a" anchorX="center" anchorY="middle" maxWidth={1.4}>
              {`${lot.quantity.toLocaleString()} ${lot.unit}`}
            </Text>
          </>
        )}
      </Billboard>
    </group>
  );
};
