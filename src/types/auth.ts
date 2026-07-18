export type AuthRole = {
  id: string;
  roleCode: string;
  roleName: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginUser = {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  roles: AuthRole[];
};

export type LoginData = {
  access_token: string;
  token_type: string;
  expires_in: string;
  user: LoginUser;
};

export type LoginApiResponse = {
  statusCode?: number;
  message: string;
  data: LoginData;
};

export type MeApiResponse = {
  statusCode?: number;
  message: string;
  data: LoginUser;
};
