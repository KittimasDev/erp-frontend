export type Truck = {
  id: string;
  truckCode: string;
  sellerId?: string;
  licensePlate: string;
  province?: string;
  truckType?: string;
  driverName?: string;
  driverPhone?: string;
  tareWeightKg?: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TruckQueryParams = {
  code?: string;
  licensePlate?: string;
  sellerId?: string;
  province?: string;
  truckType?: string;
  driverName?: string;
  driverPhone?: string;
  isActive?: boolean;
};

export type CreateTruckRequest = {
  code: string;
  licensePlate: string;
  sellerId?: string;
  province?: string;
  truckType?: string;
  driverName?: string;
  driverPhone?: string;
  tareWeightKg?: number;
  isActive?: boolean;
};

export type UpdateTruckRequest = Partial<CreateTruckRequest>;

export type TruckApiResponse = {
  message: string;
  data: Truck;
};

export type TruckListApiResponse = {
  message: string;
  data: Truck[];
};
