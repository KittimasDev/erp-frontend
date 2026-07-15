export type Department = {
  id: string;
  code: string;
  nameTh: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DepartmentQueryParams = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

export type CreateDepartmentRequest = {
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

export type DepartmentApiResponse = {
  message: string;
  data: Department;
};

export type DepartmentListApiResponse = {
  message: string;
  data: Department[];
};
