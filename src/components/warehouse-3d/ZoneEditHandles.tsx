"use client";

import React, { useEffect, useRef, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import type { ZoneConfig } from "@/types/warehouse-3d";

type DragKind = "move" | "n" | "s" | "e" | "w";

interface ZoneEditHandlesProps {
  zone: ZoneConfig;
  building: { width: number; length: number };
  onChange: (patch: Pick<ZoneConfig, "position" | "dimensions">) => void;
  onDragStateChange: (dragging: boolean) => void;
}

const MIN_SIZE = 1;
const snap = (v: number) => Math.round(v * 2) / 2; // ทีละ 0.5 ม.
const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

/** จุดจับบนโซนที่เลือก: ก้อนกลางลากย้าย, ก้อนกลางขอบทั้ง 4 ลากยืด/หด (ชิดกริด 0.5 ม. และอยู่ในอาคาร) */
export const ZoneEditHandles: React.FC<ZoneEditHandlesProps> = ({
  zone,
  building,
  onChange,
  onDragStateChange,
}) => {
  const drag = useRef<{
    kind: DragKind;
    start: [number, number];
    pos: [number, number, number];
    dims: [number, number, number];
  } | null>(null);
  const [active, setActive] = useState(false);

  const [w, h, l] = zone.dimensions;
  const [px, py, pz] = zone.position;
  const bx = building.width / 2;
  const bz = building.length / 2;

  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setActive(false);
    onDragStateChange(false);
    document.body.style.cursor = "auto";
  };

  useEffect(() => {
    if (!active) return;
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const begin = (kind: DragKind, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    drag.current = {
      kind,
      start: [e.point.x, e.point.z],
      pos: [px, py, pz],
      dims: [w, h, l],
    };
    setActive(true);
    onDragStateChange(true);
  };

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const dx = e.point.x - d.start[0];
    const dz = e.point.z - d.start[1];
    const [sx, sy, sz] = d.pos;
    const [sw, sh, sl] = d.dims;

    let nx = sx;
    let nz = sz;
    let nw = sw;
    let nl = sl;

    if (d.kind === "move") {
      nx = clamp(snap(sx + dx), -bx + sw / 2, bx - sw / 2);
      nz = clamp(snap(sz + dz), -bz + sl / 2, bz - sl / 2);
    } else if (d.kind === "e") {
      const left = sx - sw / 2;
      const right = clamp(snap(sx + sw / 2 + dx), left + MIN_SIZE, bx);
      nw = right - left;
      nx = left + nw / 2;
    } else if (d.kind === "w") {
      const right = sx + sw / 2;
      const left = clamp(snap(sx - sw / 2 + dx), -bx, right - MIN_SIZE);
      nw = right - left;
      nx = left + nw / 2;
    } else if (d.kind === "s") {
      const top = sz - sl / 2;
      const bottom = clamp(snap(sz + sl / 2 + dz), top + MIN_SIZE, bz);
      nl = bottom - top;
      nz = top + nl / 2;
    } else {
      const bottom = sz + sl / 2;
      const top = clamp(snap(sz - sl / 2 + dz), -bz, bottom - MIN_SIZE);
      nl = bottom - top;
      nz = top + nl / 2;
    }

    onChange({ position: [nx, sy, nz], dimensions: [nw, sh, nl] });
  };

  const hover = (cursor: string) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!drag.current) document.body.style.cursor = cursor;
    },
    onPointerOut: () => {
      if (!drag.current) document.body.style.cursor = "auto";
    },
  });

  const edgeHandle = (kind: DragKind, x: number, z: number, cursor: string) => (
    <mesh position={[x, 0.45, z]} onPointerDown={(e) => begin(kind, e)} {...hover(cursor)}>
      <boxGeometry args={[0.9, 0.7, 0.9]} />
      <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} />
    </mesh>
  );

  return (
    <group position={[px, 0, pz]}>
      {/* ก้อนกลาง: ลากย้ายทั้งโซน */}
      <mesh position={[0, 0.4, 0]} onPointerDown={(e) => begin("move", e)} {...hover("move")}>
        <cylinderGeometry args={[0.7, 0.7, 0.6, 24]} />
        <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={0.6} />
      </mesh>
      {edgeHandle("e", w / 2, 0, "ew-resize")}
      {edgeHandle("w", -w / 2, 0, "ew-resize")}
      {edgeHandle("s", 0, l / 2, "ns-resize")}
      {edgeHandle("n", 0, -l / 2, "ns-resize")}

      {/* แผ่นโปร่งใสขนาดใหญ่ไว้รับเมาส์ระหว่างลาก */}
      {active && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-px, 0.1, -pz]}
          onPointerMove={handleMove}
          onPointerUp={(e) => {
            e.stopPropagation();
            end();
          }}
        >
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};
