export type ScreenFunctionCatalog = {
  id: string;
  functionCode: string;
  functionName: string;
  permissionId: string;
  permissionCode: string;
};

export type ScreenCatalog = {
  id: string;
  screenCode: string;
  screenName: string;
  moduleCode?: string;
  functions: ScreenFunctionCatalog[];
};

export type ScreenCatalogListApiResponse = {
  statusCode?: number;
  message: string;
  data: ScreenCatalog[];
};

export type RolePermissionAssignment = {
  permissionId: string;
  isAllowed: boolean;
};

export type RolePermissionsData = {
  roleId: string;
  assignments: RolePermissionAssignment[];
};

export type RolePermissionsApiResponse = {
  statusCode?: number;
  message: string;
  data: RolePermissionsData;
};

export type UpdateRolePermissionsRequest = {
  assignments: RolePermissionAssignment[];
};

export type MyPermissionsData = {
  mode: "matrix" | "legacy";
  screenCodes: string[];
  permissionCodes: string[];
};

export type MyPermissionsApiResponse = {
  statusCode?: number;
  message: string;
  data: MyPermissionsData;
};
