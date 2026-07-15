export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginUser = {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: string;
  user: LoginUser;
};
