export type TireClassification = {
  id: string;
  classificationCode: string;
  classificationName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TireClassificationQueryParams = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateTireClassificationRequest = {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateTireClassificationRequest =
  Partial<CreateTireClassificationRequest>;

export type TireClassificationApiResponse = {
  message: string;
  data: TireClassification;
};

export type TireClassificationListApiResponse = {
  message: string;
  data: TireClassification[];
};
