"use client";

import React, { useState, useEffect } from "react";
import { App, Drawer, Form, Input, InputNumber, Button, Tabs, Select, Space, Card, Popconfirm } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import type {
  Warehouse3DLayoutConfig,
  RackConfig,
  ZoneConfig,
  StorageTankConfig,
} from "@/types/warehouse-3d";

interface Warehouse3DLayoutEditorModalProps {
  open: boolean;
  onClose: () => void;
  layout: Warehouse3DLayoutConfig;
  locations: Array<{
    id: string;
    locationCode: string;
    locationName: string;
  }>;
  onSave: (newLayout: Warehouse3DLayoutConfig) => Promise<void>;
  isSaving: boolean;
}

export const Warehouse3DLayoutEditorModal: React.FC<Warehouse3DLayoutEditorModalProps> = ({
  open,
  onClose,
  layout,
  locations,
  onSave,
  isSaving,
}) => {
  const { message } = App.useApp();

  const normalizeLayout = (cfg: Warehouse3DLayoutConfig): Warehouse3DLayoutConfig => {
    const raw = cfg || {};
    return {
      ...raw,
      building: {
        width: raw.building?.width ?? 40,
        length: raw.building?.length ?? 60,
        height: raw.building?.height ?? 10,
        wallColor: raw.building?.wallColor,
        floorColor: raw.building?.floorColor,
      },
      racks: (raw.racks || []).map((r) => ({
        ...r,
        position: [
          Number(r?.position?.[0]) || 0,
          Number(r?.position?.[1]) || 0,
          Number(r?.position?.[2]) || 0,
        ],
        rotation: [
          Number(r?.rotation?.[0]) || 0,
          Number(r?.rotation?.[1]) || 0,
          Number(r?.rotation?.[2]) || 0,
        ],
        bays: r?.bays ?? 3,
        levels: r?.levels ?? (r as any)?.tiers ?? 4,
        bayWidth: r?.bayWidth ?? 2.7,
        bayDepth: r?.bayDepth ?? (r as any)?.depth ?? 1.1,
        levelHeight: r?.levelHeight ?? (r as any)?.tierHeight ?? 1.8,
        color: r?.color || "#ea580c",
        beamColor: r?.beamColor || "#f59e0b",
      })),
      zones: (raw.zones || []).map((z: any) => {
        const dims = Array.isArray(z?.dimensions)
          ? z.dimensions
          : Array.isArray(z?.size)
          ? z.size
          : [6, 1, 8];
        return {
          ...z,
          position: [
            Number(z?.position?.[0]) || 0,
            Number(z?.position?.[1]) || 0,
            Number(z?.position?.[2]) || 0,
          ],
          dimensions: [
            Number(dims[0]) || 6,
            Number(dims[1]) || 1,
            Number(dims[2]) || 8,
          ],
          type: z?.type || "floor_bulk",
          color: z?.color || "#eab308",
        };
      }),
      tanks: (raw.tanks || []).map((t) => ({
        ...t,
        position: [
          Number(t?.position?.[0]) || 0,
          Number(t?.position?.[1]) || 0,
          Number(t?.position?.[2]) || 0,
        ],
        radius: t?.radius ?? 3,
        height: t?.height ?? 7,
        color: t?.color || "#94a3b8",
        capacityLiters: t?.capacityLiters ?? 50000,
        currentLiters: t?.currentLiters ?? 25000,
      })),
      docks: (raw.docks || []).map((d) => ({
        ...d,
        position: [
          Number(d?.position?.[0]) || 0,
          Number(d?.position?.[1]) || 0,
          Number(d?.position?.[2]) || 0,
        ],
      })),
    };
  };

  const [draftLayout, setDraftLayout] = useState<Warehouse3DLayoutConfig>(
    normalizeLayout(layout),
  );

  useEffect(() => {
    setDraftLayout(normalizeLayout(layout));
  }, [layout, open]);

  const handleBuildingChange = (field: string, val: number | null) => {
    if (val === null) return;
    setDraftLayout((prev) => ({
      ...prev,
      building: {
        ...prev.building,
        [field]: val,
      },
    }));
  };

  // Add new rack
  const handleAddRack = () => {
    const newIdx = (draftLayout.racks?.length || 0) + 1;
    const newRack: RackConfig = {
      id: `rack-custom-${Date.now()}`,
      name: `ชั้นวาง R-${newIdx}`,
      code: `RACK-${String(newIdx).padStart(2, "0")}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      bays: 3,
      levels: 4,
      bayWidth: 2.7,
      bayDepth: 1.1,
      levelHeight: 1.8,
      color: "#ea580c",
      beamColor: "#f59e0b",
    };
    setDraftLayout((prev) => ({
      ...prev,
      racks: [...(prev.racks || []), newRack],
    }));
  };

  const handleUpdateRack = (index: number, updates: Partial<RackConfig>) => {
    setDraftLayout((prev) => {
      const nextRacks = [...(prev.racks || [])];
      nextRacks[index] = { ...nextRacks[index], ...updates };
      return { ...prev, racks: nextRacks };
    });
  };

  const handleDeleteRack = (index: number) => {
    setDraftLayout((prev) => ({
      ...prev,
      racks: prev.racks.filter((_, i) => i !== index),
    }));
  };

  // Add new zone
  const handleAddZone = () => {
    const newIdx = (draftLayout.zones?.length || 0) + 1;
    const newZone: ZoneConfig = {
      id: `zone-custom-${Date.now()}`,
      name: `ลานกอง Z-${newIdx}`,
      code: `ZONE-${String(newIdx).padStart(2, "0")}`,
      type: "floor_bulk",
      position: [0, 0, 0],
      dimensions: [6, 1, 8],
      color: "#eab308",
    };
    setDraftLayout((prev) => ({
      ...prev,
      zones: [...(prev.zones || []), newZone],
    }));
  };

  const handleUpdateZone = (index: number, updates: Partial<ZoneConfig>) => {
    setDraftLayout((prev) => {
      const nextZones = [...(prev.zones || [])];
      nextZones[index] = { ...nextZones[index], ...updates };
      return { ...prev, zones: nextZones };
    });
  };

  const handleDeleteZone = (index: number) => {
    setDraftLayout((prev) => ({
      ...prev,
      zones: prev.zones.filter((_, i) => i !== index),
    }));
  };

  // Add new tank
  const handleAddTank = () => {
    const newIdx = (draftLayout.tanks?.length || 0) + 1;
    const newTank: StorageTankConfig = {
      id: `tank-custom-${Date.now()}`,
      name: `ถังบรรจุ T-${newIdx}`,
      code: `TANK-${String(newIdx).padStart(2, "0")}`,
      position: [0, 0, 0],
      radius: 3,
      height: 7,
      color: "#94a3b8",
      capacityLiters: 50000,
      currentLiters: 25000,
    };
    setDraftLayout((prev) => ({
      ...prev,
      tanks: [...(prev.tanks || []), newTank],
    }));
  };

  const handleUpdateTank = (index: number, updates: Partial<StorageTankConfig>) => {
    setDraftLayout((prev) => {
      const nextTanks = [...(prev.tanks || [])];
      nextTanks[index] = { ...nextTanks[index], ...updates };
      return { ...prev, tanks: nextTanks };
    });
  };

  const handleDeleteTank = (index: number) => {
    setDraftLayout((prev) => ({
      ...prev,
      tanks: prev.tanks.filter((_, i) => i !== index),
    }));
  };

  const handleSaveLayout = async () => {
    try {
      await onSave(draftLayout);
      message.success("บันทึกผังคลัง 3 มิติสำเร็จแล้ว");
      onClose();
    } catch {
      message.error("เกิดข้อผิดพลาดในการบันทึกผัง 3 มิติ");
    }
  };

  return (
    <Drawer
      title="🛠️ ตัวแก้ไขผังคลังสินค้า 3 มิติ (3D Layout Configurator)"
      open={open}
      onClose={onClose}
      size={560}
      extra={
        <Space>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={isSaving}
            onClick={handleSaveLayout}
            className="bg-orange-600 hover:bg-orange-500"
          >
            บันทึกผัง 3D
          </Button>
        </Space>
      }
    >
      <Tabs
        defaultActiveKey="zones"
        items={[
          {
            key: "zones",
            label: `พื้นที่จัดเก็บตาม Location (${draftLayout.zones?.length || 0})`,
            children: (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">พื้นที่จัดเก็บ / โซนแบ่งตามสีประจำ Location</span>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleAddZone}
                    className="text-emerald-600 border-emerald-400"
                  >
                    + เพิ่ม Location โซน
                  </Button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {draftLayout.zones?.map((zone, idx) => {
                    const dims = Array.isArray(zone?.dimensions) ? zone.dimensions : [12, 1, 16];
                    const pos = Array.isArray(zone?.position) ? zone.position : [0, 0, 0];
                    return (
                    <Card
                      key={zone.id}
                      size="small"
                      title={
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block border border-black/20"
                            style={{ backgroundColor: zone.color || "#10b981" }}
                          />
                          <span className="font-semibold text-slate-800 text-xs">
                            {zone.name} ({zone.code})
                          </span>
                        </div>
                      }
                      extra={
                        <Popconfirm
                          title="ลบลานนี้?"
                          onConfirm={() => handleDeleteZone(idx)}
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      }
                      className="bg-slate-50 border-slate-200"
                    >
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">ชื่อ Location</span>
                            <Input
                              size="small"
                              value={zone.name}
                              onChange={(e) => handleUpdateZone(idx, { name: e.target.value })}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">รหัส</span>
                            <Input
                              size="small"
                              value={zone.code}
                              onChange={(e) => handleUpdateZone(idx, { code: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            ผูก Location ในระบบ (Warehouse Location)
                          </span>
                          <Select
                            size="small"
                            allowClear
                            placeholder="เลือก Location ในระบบ"
                            value={zone.locationId}
                            onChange={(val) => {
                              const loc = locations.find((l) => l.id === val);
                              handleUpdateZone(idx, {
                                locationId: val,
                                locationCode: loc?.locationCode,
                              });
                            }}
                            className="w-full"
                            options={locations.map((l) => ({
                              value: l.id,
                              label: `${l.locationCode} - ${l.locationName}`,
                            }))}
                          />
                        </div>

                        {/* Zone Function & Color Assignment */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              ประเภทการใช้งานพื้นที่
                            </span>
                            <Select
                              size="small"
                              value={zone.type || "floor_bulk"}
                              onChange={(val) => handleUpdateZone(idx, { type: val })}
                              className="w-full"
                              options={[
                                { value: "floor_bulk", label: "🏗️ ลานเทกอง (Bulk Yard)" },
                                { value: "staging", label: "📦 ลานพักสินค้า (Staging)" },
                                { value: "quarantine", label: "⚠️ กักกันรอตรวจ (QC Hold)" },
                                { value: "dock", label: "🚪 ลานหน้าประตู Dock (Apron)" },
                              ]}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              สีประจำพื้น Location บนผัง 3D
                            </span>
                            <Select
                              size="small"
                              value={zone.color || "#10b981"}
                              onChange={(val) => handleUpdateZone(idx, { color: val })}
                              className="w-full"
                              options={[
                                { value: "#10b981", label: "🟢 เขียวมรกต (#10b981)" },
                                { value: "#f59e0b", label: "🟠 ส้มอำพัน (#f59e0b)" },
                                { value: "#06b6d4", label: "🔵 ฟ้าไซแอน (#06b6d4)" },
                                { value: "#8b5cf6", label: "🟣 ม่วง (#8b5cf6)" },
                                { value: "#ec4899", label: "🌸 ชมพู (#ec4899)" },
                                { value: "#3b82f6", label: "🔷 น้ำเงินหลวง (#3b82f6)" },
                                { value: "#14b8a6", label: "🩵 เขียวหัวเป็ด (#14b8a6)" },
                                { value: "#eab308", label: "🟡 เหลืองทอง (#eab308)" },
                              ]}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">กว้าง x ยาว</span>
                            <div className="flex gap-1">
                              <InputNumber
                                size="small"
                                value={dims[0] ?? 6}
                                onChange={(v) =>
                                  handleUpdateZone(idx, {
                                    dimensions: [v ?? 1, dims[1] ?? 1, dims[2] ?? 1],
                                  })
                                }
                                placeholder="X"
                              />
                              <InputNumber
                                size="small"
                                value={dims[2] ?? 8}
                                onChange={(v) =>
                                  handleUpdateZone(idx, {
                                    dimensions: [dims[0] ?? 1, dims[1] ?? 1, v ?? 1],
                                  })
                                }
                                placeholder="Z"
                              />
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">พิกัด X/Z</span>
                            <div className="flex gap-1">
                              <InputNumber
                                size="small"
                                value={pos[0] ?? 0}
                                onChange={(v) =>
                                  handleUpdateZone(idx, {
                                    position: [v ?? 0, pos[1] ?? 0, pos[2] ?? 0],
                                  })
                                }
                                placeholder="X"
                              />
                              <InputNumber
                                size="small"
                                value={pos[2] ?? 0}
                                onChange={(v) =>
                                  handleUpdateZone(idx, {
                                    position: [pos[0] ?? 0, pos[1] ?? 0, v ?? 0],
                                  })
                                }
                                placeholder="Z"
                              />
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">ความสูง (H)</span>
                            <InputNumber
                              size="small"
                              value={dims[1] ?? 1}
                              onChange={(v) =>
                                handleUpdateZone(idx, {
                                  dimensions: [dims[0] ?? 1, v ?? 1, dims[2] ?? 1],
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                    );
                  })}
                </div>
              </div>
            ),
          },
          {
            key: "building",
            label: "อาคาร (Building)",
            children: (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  กำหนดขนาดมิติของอาคารคลังสินค้า (หน่วยเป็นเมตร)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      ความกว้าง (Width - X)
                    </label>
                    <InputNumber
                      min={10}
                      max={200}
                      value={draftLayout.building?.width || 40}
                      onChange={(v) => handleBuildingChange("width", v)}
                      suffix="ม."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      ความยาว (Length - Z)
                    </label>
                    <InputNumber
                      min={10}
                      max={300}
                      value={draftLayout.building?.length || 60}
                      onChange={(v) => handleBuildingChange("length", v)}
                      suffix="ม."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      ความสูง (Height - Y)
                    </label>
                    <InputNumber
                      min={4}
                      max={30}
                      value={draftLayout.building?.height || 10}
                      onChange={(v) => handleBuildingChange("height", v)}
                      suffix="ม."
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "docks",
            label: `ประตูเทียบท่า (${draftLayout.docks?.length || 0})`,
            children: (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">ประตูขนถ่ายสินค้า (Loading Docks)</span>
                </div>
                <div className="space-y-2">
                  {draftLayout.docks?.map((dock) => (
                    <Card key={dock.id} size="small" className="bg-slate-50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">🚪 {dock.name}</span>
                        <span className="text-slate-500">{dock.width}x{dock.height} ม.</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
};
