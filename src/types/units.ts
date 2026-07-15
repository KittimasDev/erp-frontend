export type Unit = {
  id: string;
  code: string;
  nameTh: string;
  nameEn?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateUnitRequest = {
  code: string;
  name: string;
  symbol?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateUnitRequest = Partial<CreateUnitRequest>;

export type UnitApiResponse = {
  message: string;
  data: Unit;
};

export type UnitListApiResponse = {
  message: string;
  data: Unit[];
};
