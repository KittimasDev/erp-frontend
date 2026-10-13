export type AttendanceDevice = {
  id: string;
  code: string;
  name: string;
  location?: string | null;
  keyPrefix: string;
  isActive: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
};

export type AttendanceDeviceWithKey = AttendanceDevice & { apiKey: string };

export type DeviceScanStatus = "PROCESSED" | "UNMATCHED" | "REJECTED" | "IGNORED";

export type AttendanceDeviceEvent = {
  id: string;
  deviceId: string;
  deviceName?: string | null;
  employeeCode: string;
  displayName?: string | null;
  scannedAt: string;
  direction: string;
  status: DeviceScanStatus;
  message?: string | null;
  receivedAt: string;
};

export type CreateAttendanceDeviceRequest = {
  code: string;
  name: string;
  location?: string;
};

export type UpdateAttendanceDeviceRequest = {
  name?: string;
  location?: string;
  isActive?: boolean;
};

type Envelope<T> = { statusCode?: number; message: string; data: T };

export type AttendanceDeviceListApiResponse = Envelope<AttendanceDevice[]>;
export type AttendanceDeviceApiResponse = Envelope<AttendanceDevice>;
export type AttendanceDeviceWithKeyApiResponse = Envelope<AttendanceDeviceWithKey>;
export type AttendanceDeviceEventListApiResponse = Envelope<AttendanceDeviceEvent[]>;

export const DEVICE_SCAN_STATUS_LABEL: Record<DeviceScanStatus, string> = {
  PROCESSED: "ลงเวลาแล้ว",
  UNMATCHED: "ไม่พบพนักงาน",
  REJECTED: "ลงเวลาไม่ได้",
  IGNORED: "สแกนซ้ำ",
};
