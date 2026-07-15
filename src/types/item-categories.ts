export type ItemCategory = {
  id: string;
  code: string;
  nameTh: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ItemCategoryQueryParams = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateItemCategoryRequest = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateItemCategoryRequest = Partial<CreateItemCategoryRequest>;

export type ItemCategoryApiResponse = {
  message: string;
  data: ItemCategory;
};

export type ItemCategoryListApiResponse = {
  message: string;
  data: ItemCategory[];
};
