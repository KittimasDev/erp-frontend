export type Section = {
  id: string;
  code: string;
  nameTh: string;
  departmentId: string;
  departmentName?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SectionQueryParams = {
  name?: string;
  departmentId?: string;
  isActive?: boolean;
};

export type CreateSectionRequest = {
  code: string;
  name: string;
  departmentId: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateSectionRequest = Partial<CreateSectionRequest>;

export type SectionApiResponse = {
  message: string;
  data: Section;
};

export type SectionListApiResponse = {
  message: string;
  data: Section[];
};
