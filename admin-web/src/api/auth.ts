import { apiClient } from "./client";
import type { LoginRequest, LoginResponse } from "../types/auth";

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/login", credentials);
    return response.data;
  },
};