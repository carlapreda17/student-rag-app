export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}