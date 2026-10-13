export type Position = {
  id: string;
  code: string;
  nameTh: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PositionQueryParams = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

export type CreatePositionRequest = {
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdatePositionRequest = Partial<CreatePositionRequest>;

export type PositionApiResponse = {
  message: string;
  data: Position;
};

export type PositionListApiResponse = {
  message: string;
  data: Position[];
};
