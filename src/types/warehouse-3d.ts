export interface WarehouseBuildingConfig {
  width: number; // in meters (X axis)
  length: number; // in meters (Z axis)
  height: number; // in meters (Y axis)
  wallColor?: string;
  floorColor?: string;
  showTrusses?: boolean;
  showRoof?: boolean;
  showWalls?: boolean;
}

export interface RackSlotConfig {
  bay: number; // 0-indexed bay
  level: number; // 0-indexed tier
  locationId?: string; // mapped warehouse_location.id
  locationCode?: string; // e.g. "RAW-A01-01"
  maxPallets?: number; // capacity (default: 2)
  occupiedPallets?: number; // current pallets
  items?: Array<{
    itemCode: string;
    itemName: string;
    lotNumber?: string;
    quantity: number;
    unit: string;
  }>;
}

export interface RackConfig {
  id: string;
  name: string;
  code: string;
  position: [number, number, number]; // [x, y, z]
  rotation: [number, number, number]; // [rotX, rotY, rotZ] in radians or degrees
  bays: number; // count of horizontal columns (bays)
  levels: number; // count of vertical beam levels
  bayWidth: number; // width of each bay in meters (default ~2.7m)
  bayDepth: number; // depth of rack in meters (default ~1.1m)
  levelHeight: number; // height of each tier in meters (default ~1.8m)
  color?: string; // rack upright color (default orange #ea580c)
  beamColor?: string; // beam color (default yellow/orange #f59e0b)
  locationId?: string; // primary linked warehouse_location.id
  locationCode?: string;
  slots?: RackSlotConfig[];
}

/** Lot จริงที่อยู่ใน Location (ไม่ถูกเก็บลงผัง — ประกอบตอนแสดงผล) */
export interface ZoneLot {
  lotId: string;
  lotNo: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  imageFileName?: string | null;
  /** blob URL ของรูป master ที่โหลดแล้ว (ใช้เป็นพื้นผิวใน 3D) */
  imageSrc?: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  qcStatus?: string;
  receivedDate?: string;
}

export interface ZoneConfig {
  id: string;
  name: string;
  code: string;
  type: 'floor_bulk' | 'staging' | 'quarantine' | 'dock';
  position: [number, number, number];
  dimensions: [number, number, number]; // [width, height, length]
  color: string;
  locationId?: string;
  locationCode?: string;
  /** Lot จริงใน Location นี้ (ประกอบตอนแสดงผล ไม่เก็บลง DB) */
  lots?: ZoneLot[];
  /** ช่องที่เพิ่งแบ่งใหม่ — ยังไม่มี location ในระบบ จะสร้างตอนกดบันทึก (ไม่ถูกเก็บลง DB) */
  pendingCreate?: boolean;
  /** location แม่ของช่องที่เพิ่งแบ่ง ใช้ตอนสร้าง location ใหม่ */
  pendingParentLocationId?: string;
  items?: Array<{
    itemCode: string;
    itemName: string;
    lotNumber?: string;
    quantity: number;
    unit: string;
  }>;
}

export interface StorageTankConfig {
  id: string;
  name: string;
  code: string;
  position: [number, number, number];
  radius: number;
  height: number;
  color?: string;
  locationId?: string;
  locationCode?: string;
  capacityLiters?: number;
  currentLiters?: number;
}

export interface DockDoorConfig {
  id: string;
  name: string;
  position: [number, number, number];
  width: number;
  height: number;
  wall: 'front' | 'back' | 'left' | 'right';
}

export type RoadType = 'main_avenue' | 'secondary' | 'access_lane' | 'parking_apron';

export interface CampusRoadConfig {
  id: string;
  name: string;
  position: [number, number]; // [X, Z] in meters
  width: number; // width in meters
  length: number; // length in meters
  rotation: number; // in degrees (0 = North-South along Z, 90 = East-West along X)
  roadType: RoadType;
  color?: string; // default asphalt '#334155'
  hasMarkings?: boolean; // dashed centerlines + yellow curb line
}

export interface Warehouse3DLayoutConfig {
  building: WarehouseBuildingConfig;
  racks: RackConfig[];
  zones: ZoneConfig[];
  tanks: StorageTankConfig[];
  docks: DockDoorConfig[];
  sitePosition?: [number, number]; // [X, Z] position on factory campus map
  siteRotation?: number; // rotation in degrees
  siteSize?: [number, number, number]; // [width, height, length] in meters on campus map
  siteRoads?: CampusRoadConfig[]; // factory campus roads network
}

export type Warehouse3DViewMode = '3d' | 'explode' | 'drone' | 'editor';

export type LightingPreset = 'day' | 'night' | 'sunset';

export interface Selected3DObject {
  type: 'rack' | 'rack_slot' | 'zone' | 'tank' | 'dock';
  id: string;
  code: string;
  name: string;
  locationId?: string;
  locationCode?: string;
  bay?: number;
  level?: number;
  currentStock?: number;
  capacity?: number;
  utilizationPercent?: number;
  lots?: ZoneLot[];
  items?: Array<{
    itemCode: string;
    itemName: string;
    lotNumber?: string;
    quantity: number;
    unit: string;
  }>;
}
