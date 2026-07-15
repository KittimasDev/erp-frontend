export type WeighbridgeScale = {
  id: string;
  scaleCode: string;
  scaleName: string;
  scaleType: string;
  locationName?: string;
  connectionType?: string;
  ipAddress?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  protocolName?: string;
  capacityKg?: string | number;
  decimalPlaces: number;
  isAutoReadEnabled: boolean;
  isManualFallbackAllowed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WeighbridgeScaleQueryParams = {
  code?: string;
  name?: string;
  scaleType?: string;
  locationName?: string;
  connectionType?: string;
  isActive?: boolean;
  isAutoReadEnabled?: boolean;
};

export type CreateWeighbridgeScaleRequest = {
  code: string;
  name: string;
  scaleType: string;
  locationName?: string;
  connectionType?: string;
  ipAddress?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  protocolName?: string;
  capacityKg?: number;
  decimalPlaces?: number;
  isAutoReadEnabled?: boolean;
  isManualFallbackAllowed?: boolean;
  isActive?: boolean;
};

export type UpdateWeighbridgeScaleRequest =
  Partial<CreateWeighbridgeScaleRequest>;

export type WeighbridgeScaleApiResponse = {
  message: string;
  data: WeighbridgeScale;
};

export type WeighbridgeScaleListApiResponse = {
  message: string;
  data: WeighbridgeScale[];
};
