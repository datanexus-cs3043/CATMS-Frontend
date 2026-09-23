import axios from 'axios';

// 5 Roles matching CATMS-Backend (app/auth/schemas.py)
export type UserRole = 
  | 'admin' 
  | 'branch_manager' 
  | 'doctor' 
  | 'receptionist_cashier' 
  | 'patient';

export type UserType = 'staff' | 'patient';

// User structure returned by /api/auth/me and /api/auth/login
export interface AuthUser {
  user_id: number;
  user_type: UserType;
  role: UserRole;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  staff_id?: number | null;
  patient_id?: number | null;
  doctor_id?: number | null;
  branch_id?: number | null;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  access_token?: string;
  token_type?: string;
}




// Axios instance connecting to CATMS-Backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  withCredentials: true, // CRITICAL: Sends and receives HttpOnly cookies from FastAPI
  headers: {
    'Content-Type': 'application/json',
  },
});




// Authentication API service calls
export const authService = {
  // Login: POST /api/auth/login
  login: async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  // Get current user profile: GET /api/auth/me
  getMe: async (): Promise<AuthUser> => {
    const response = await api.get<AuthUser>('/auth/me');
    return response.data;
  },

  // Logout: POST /api/auth/logout
  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/logout');
    return response.data;
  },

  // Get CSRF Token: GET /api/auth/csrf
  getCsrfToken: async (): Promise<{ csrf_token: string }> => {
    const response = await api.get<{ csrf_token: string }>('/auth/csrf');
    return response.data;
  },
};

export default api;