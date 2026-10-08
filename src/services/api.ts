import axios from 'axios';
import { handleLocalRequest, LocalHttpError } from './localDb';

// ── Role & Type definitions ──────────────────────────────────────────────────
export type UserRole = 'admin' | 'branch_manager' | 'doctor' | 'receptionist_cashier' | 'patient';
export type UserType = 'staff' | 'patient';

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

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  contact_details?: string;
  date_of_birth: string;
  gender: string;
  address?: string;
  branch_id: number;
}

// ── Domain Types ─────────────────────────────────────────────────────────────
export interface Branch {
  branch_id: number;
  branch_name: string;
  location: string;
  contact_details?: string;
  manager_staff_id?: number | null;
}

export interface Staff {
  staff_id: number;
  branch_id: number;
  users_logins_id?: number | null;
  first_name: string;
  last_name: string;
  contact_details?: string;
  email: string;
  staff_type: string;
  role: string;
  branch_name?: string;
}

export interface Doctor {
  doctor_id: number;
  staff_id: number;
  doctor_name: string;
  doctor_license_number: string;
  branch_id?: number;
  branch_name?: string;
  email?: string;
  contact_details?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  specialties?: Specialty[];
  specialty_ids?: number[];
}

export interface Specialty {
  specialty_id: number;
  specialty_name: string;
  description?: string;
}

export interface TreatmentCategory {
  category_id: number;
  category_name: string;
  description?: string;
}

export interface Treatment {
  treatment_id: number;
  category_id: number;
  service_code: string;
  treatment_name: string;
  standard_price: number;
  category_name?: string;
}

export interface Patient {
  patient_id: number;
  branch_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  patient_type?: string;
  contact_details?: string;
  email?: string;
  address?: string;
  user_id: number;
  branch_name?: string;
}

export interface EmergencyContact {
  emergency_contact_id: number;
  patient_id: number;
  contact_name: string;
  relationship: string;
  phone: string;
}

export interface InsuranceProvider {
  provider_id: number;
  provider_name: string;
  contact_details?: string;
}

export interface InsurancePolicy {
  policy_id: number;
  patient_id: number;
  provider_id: number;
  policy_number: number;
  start_date: string;
  end_date: string;
  status: string;
  provider_name?: string;
  patient_name?: string;
}

export interface InsuranceCoverage {
  coverage_id: number;
  policy_id: number;
  treatment_id: number;
  coverage_percentage: number;
  maximum_amount: number;
  treatment_name?: string;
}

export interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  branch_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  created_by: string;
  original_appointment_id?: number | null;
  treatment_id?: number | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | string;
  patient_name?: string;
  doctor_name?: string;
  branch_name?: string;
  treatment_name?: string;
  rescheduled_to?: number | null;
  invoice_id?: number | null;
  payment_status?: string | null;
  invoice_balance?: number | null;
}

export interface AppointmentTreatment {
  appointment_treatment_id: number;
  appointment_id: number;
  treatment_id: number;
  quantity: number;
  treatment_name?: string;
  service_code?: string;
  unit_price?: number;
}

export interface ConsultationNote {
  note_id: number;
  appointment_id: number;
  note_content: string;
  created_at: string;
}

export interface Invoice {
  invoice_id: number;
  appointment_id: number;
  staff_id: number;
  invoice_date: string;
  total_amount?: number;
  insurance_covered?: number;
  insurance_pending?: number;
  amount_paid: number;
  balance: number;
  status: string;
  patient_id?: number;
  patient_name?: string;
  doctor_id?: number;
  doctor_name?: string;
  branch_name?: string;
  appointment_date?: string;
}

export interface Payment {
  payment_id: number;
  invoice_id: number;
  amount: number;
  method: string;
  payment_date: string;
  received_by: string;
  patient_name?: string;
}

export interface InvoiceItem {
  invoice_item_id: number;
  invoice_id: number;
  treatment_id: number;
  quantity: number;
  unitprice: number;
  description?: string;
  treatment_name?: string;
}

export interface DoctorPayment {
  doctor_payment_id: number;
  doctor_id: number;
  appointment_id: number;
  invoice_item_id?: number | null;
  date: string;
  time: string;
  doctor_payment: number;
  doctor_name?: string;
}

export interface InsuranceClaim {
  claim_id: number;
  invoice_id: number;
  policy_id: number;
  claim_date: string;
  claim_amount: number;
  approved_amount: number;
  status: string;
  patient_name?: string;
  provider_name?: string;
  policy_number?: number;
}

export interface BranchAppointmentSummary {
  branch_id?: number;
  branch_name: string;
  appointment_date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface DoctorRevenueReport {
  doctor_id: number;
  doctor_name: string;
  branch_name?: string;
  total_revenue: number;
  collected?: number;
  appointment_count: number;
  avg_revenue: number;
}

export interface TreatmentCountReport {
  category_name: string;
  treatment_name: string;
  count: number;
  total_revenue: number;
}

export interface OutstandingPatient {
  patient_id: number;
  patient_name: string;
  contact_details?: string;
  total_outstanding: number;
  invoice_count: number;
}

export interface InsuranceSummary {
  total_claims: number;
  total_billed?: number;
  out_of_pocket_paid?: number;
  approved_amount: number;
  out_of_pocket: number;
  pending_amount: number;
}

// ── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let cachedCsrfToken = '';

api.interceptors.request.use(async (config) => {
  const method = (config.method || '').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!cachedCsrfToken) {
      try {
        const base = config.baseURL || 'http://localhost:8000/api';
        const res = await axios.get(`${base}/auth/csrf`, { withCredentials: true });
        cachedCsrfToken = res.data?.csrf_token || '';
      } catch {
        // Backend offline or unreachable
      }
    }
    if (cachedCsrfToken) {
      config.headers['X-CSRF-Token'] = cachedCsrfToken;
    }
  }
  return config;
});

// ── Offline / not-yet-implemented endpoints → local data store ────────────────
// The backend currently implements only auth. Any request that fails because
// the server is unreachable, or because the endpoint does not exist yet
// (404/405/501), is answered by the local store, which applies the same
// role-based access rules the API is expected to enforce.
const shouldUseLocalStore = (error: any): boolean => {
  if (!error?.config) return false;
  if (!error.response) return true; // network error: backend not running
  const url: string = error.config.url || '';
  if (url.startsWith('/auth/')) return false; // real auth answers are authoritative
  return [404, 405, 501].includes(error.response.status);
};

api.interceptors.response.use(
  res => res,
  async (error) => {
    if (!shouldUseLocalStore(error)) throw error;
    const cfg = error.config;
    let body: any = cfg.data;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    try {
      const data = handleLocalRequest((cfg.method || 'get').toUpperCase(), cfg.url || '', cfg.params || {}, body || {});
      return { data, status: 200, statusText: 'OK', headers: {}, config: cfg };
    } catch (e) {
      if (e instanceof LocalHttpError) {
        const err: any = new Error(e.detail);
        err.response = { status: e.status, data: { detail: e.detail } };
        err.config = cfg;
        throw err;
      }
      throw e;
    }
  }
);

/** Extract a readable message from an API error. */
export const apiErrorMessage = (err: any, fallback = 'Something went wrong. Please try again.'): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
};

// ── Auth Service ──────────────────────────────────────────────────────────────
export const authService = {
  login: async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', credentials);
    return res.data;
  },
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<AuthUser> => {
    const res = await api.get<AuthUser>('/auth/me');
    return res.data;
  },
  logout: async (): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>('/auth/logout');
    return res.data;
  },
  getCsrfToken: async (): Promise<{ csrf_token: string }> => {
    const res = await api.get<{ csrf_token: string }>('/auth/csrf');
    return res.data;
  },
};

// ── Generic CRUD helpers ──────────────────────────────────────────────────────
const get = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const res = await api.get<T>(url, { params });
  return res.data;
};
const post = async <T>(url: string, data?: unknown): Promise<T> => {
  const res = await api.post<T>(url, data);
  return res.data;
};
const put = async <T>(url: string, data?: unknown): Promise<T> => {
  const res = await api.put<T>(url, data);
  return res.data;
};
const del = async <T>(url: string): Promise<T> => {
  const res = await api.delete<T>(url);
  return res.data;
};

// ── Branch Service ─────────────────────────────────────────────────────────────
export const branchService = {
  getAll: () => get<Branch[]>('/branches'),
  getById: (id: number) => get<Branch>(`/branches/${id}`),
  create: (data: Partial<Branch>) => post<Branch>('/branches', data),
  update: (id: number, data: Partial<Branch>) => put<Branch>(`/branches/${id}`, data),
  delete: (id: number) => del(`/branches/${id}`),
};

// ── Staff Service ──────────────────────────────────────────────────────────────
export const staffService = {
  getAll: (params?: { branch_id?: number; role?: string }) => get<Staff[]>('/staff', params as Record<string, unknown>),
  getById: (id: number) => get<Staff>(`/staff/${id}`),
  create: (data: Partial<Staff>) => post<Staff>('/staff', data),
  update: (id: number, data: Partial<Staff>) => put<Staff>(`/staff/${id}`, data),
  delete: (id: number) => del(`/staff/${id}`),
};

// ── Doctor Service ─────────────────────────────────────────────────────────────
export const doctorService = {
  getAll: (params?: { branch_id?: number; specialty_id?: number; search?: string }) =>
    get<Doctor[]>('/doctors', params as Record<string, unknown>),
  getById: (id: number) => get<Doctor>(`/doctors/${id}`),
  create: (data: Partial<Doctor>) => post<Doctor>('/doctors', data),
  update: (id: number, data: Partial<Doctor>) => put<Doctor>(`/doctors/${id}`, data),
  delete: (id: number) => del(`/doctors/${id}`),
};

// ── Specialty Service ─────────────────────────────────────────────────────────
export const specialtyService = {
  getAll: () => get<Specialty[]>('/specialties'),
  getById: (id: number) => get<Specialty>(`/specialties/${id}`),
  create: (data: Partial<Specialty>) => post<Specialty>('/specialties', data),
  update: (id: number, data: Partial<Specialty>) => put<Specialty>(`/specialties/${id}`, data),
};

// ── Treatment Service ─────────────────────────────────────────────────────────
export const treatmentService = {
  getAll: (params?: { category_id?: number; search?: string }) =>
    get<Treatment[]>('/treatments', params as Record<string, unknown>),
  getById: (id: number) => get<Treatment>(`/treatments/${id}`),
  getCategories: () => get<TreatmentCategory[]>('/treatment-categories'),
  create: (data: Partial<Treatment>) => post<Treatment>('/treatments', data),
  update: (id: number, data: Partial<Treatment>) => put<Treatment>(`/treatments/${id}`, data),
};

// ── Patient Service ───────────────────────────────────────────────────────────
export const patientService = {
  getAll: (params?: { branch_id?: number; search?: string }) =>
    get<Patient[]>('/patients', params as Record<string, unknown>),
  getById: (id: number) => get<Patient>(`/patients/${id}`),
  create: (data: Partial<Patient>) => post<Patient>('/patients', data),
  update: (id: number, data: Partial<Patient>) => put<Patient>(`/patients/${id}`, data),
  getEmergencyContacts: (id: number) => get<EmergencyContact[]>(`/patients/${id}/emergency-contacts`),
  addEmergencyContact: (id: number, data: Partial<EmergencyContact>) =>
    post<EmergencyContact>(`/patients/${id}/emergency-contacts`, data),
  deleteEmergencyContact: (contactId: number) => del(`/emergency-contacts/${contactId}`),
  getInsurancePolicies: (id: number) => get<InsurancePolicy[]>(`/patients/${id}/insurance-policies`),
};

// ── Insurance Service ─────────────────────────────────────────────────────────
export const insuranceService = {
  getProviders: () => get<InsuranceProvider[]>('/insurance-providers'),
  createProvider: (data: Partial<InsuranceProvider>) => post<InsuranceProvider>('/insurance-providers', data),
  getPolicies: (params?: { patient_id?: number; status?: string }) =>
    get<InsurancePolicy[]>('/insurance-policies', params as Record<string, unknown>),
  getPolicyById: (id: number) => get<InsurancePolicy>(`/insurance-policies/${id}`),
  createPolicy: (data: Partial<InsurancePolicy>) => post<InsurancePolicy>('/insurance-policies', data),
  updatePolicy: (id: number, data: Partial<InsurancePolicy>) =>
    put<InsurancePolicy>(`/insurance-policies/${id}`, data),
  getCoverageByPolicy: (policyId: number) =>
    get<InsuranceCoverage[]>(`/insurance-policies/${policyId}/coverages`),
  addCoverage: (policyId: number, data: Partial<InsuranceCoverage>) =>
    post<InsuranceCoverage>(`/insurance-policies/${policyId}/coverages`, data),
  getClaims: (params?: { status?: string; invoice_id?: number }) =>
    get<InsuranceClaim[]>('/insurance-claims', params as Record<string, unknown>),
  getClaimById: (id: number) => get<InsuranceClaim>(`/insurance-claims/${id}`),
  createClaim: (data: Partial<InsuranceClaim>) => post<InsuranceClaim>('/insurance-claims', data),
  updateClaim: (id: number, data: Partial<InsuranceClaim>) =>
    put<InsuranceClaim>(`/insurance-claims/${id}`, data),
};

// ── Appointment Service ───────────────────────────────────────────────────────
export const appointmentService = {
  getAll: (params?: {
    patient_id?: number;
    doctor_id?: number;
    branch_id?: number;
    date?: string;
    status?: string;
  }) => get<Appointment[]>('/appointments', params as Record<string, unknown>),
  complete: (id: number) => put<Appointment>(`/appointments/${id}/complete`),
  getTreatments: (id: number) => get<AppointmentTreatment[]>(`/appointments/${id}/treatments`),
  addTreatment: (id: number, data: { treatment_id: number; quantity: number }) =>
    post(`/appointments/${id}/treatments`, data),
  removeTreatment: (id: number, appointmentTreatmentId: number) =>
    del(`/appointments/${id}/treatments/${appointmentTreatmentId}`),
  getById: (id: number) => get<Appointment>(`/appointments/${id}`),
  create: (data: Partial<Appointment>) => post<Appointment>('/appointments', data),
  update: (id: number, data: Partial<Appointment>) => put<Appointment>(`/appointments/${id}`, data),
  cancel: (id: number) => put(`/appointments/${id}/cancel`),
  reschedule: (id: number, data: { appointment_date: string; start_time: string; end_time: string }) =>
    post<Appointment>(`/appointments/${id}/reschedule`, data),
  getNotes: (id: number) => get<ConsultationNote[]>(`/appointments/${id}/notes`),
  addNote: (id: number, data: { note_content: string }) =>
    post<ConsultationNote>(`/appointments/${id}/notes`, data),
};

// ── Invoice Service ───────────────────────────────────────────────────────────
export const invoiceService = {
  getAll: (params?: { status?: string; patient_id?: number; appointment_id?: number }) =>
    get<Invoice[]>('/invoices', params as Record<string, unknown>),
  getById: (id: number) => get<Invoice>(`/invoices/${id}`),
  /** Generate the invoice for a completed appointment from its recorded treatments. */
  generate: (appointmentId: number) => post<Invoice>('/invoices', { appointment_id: appointmentId }),
  update: (id: number, data: Partial<Invoice>) => put<Invoice>(`/invoices/${id}`, data),
  getItems: (id: number) => get<InvoiceItem[]>(`/invoices/${id}/items`),
  addItem: (id: number, data: Partial<InvoiceItem>) =>
    post<InvoiceItem>(`/invoices/${id}/items`, data),
  makePayment: (id: number, data: { amount: number; method?: string }) =>
    post<Invoice>(`/invoices/${id}/payments`, data),
  getPayments: (id: number) => get<Payment[]>(`/invoices/${id}/payments`),
  getAllPayments: () => get<Payment[]>('/payments'),
  getDoctorPayments: (params?: { doctor_id?: number }) =>
    get<DoctorPayment[]>('/doctor-payments', params as Record<string, unknown>),
};

// ── Reports Service ───────────────────────────────────────────────────────────
export const reportsService = {
  getBranchAppointmentSummary: (params?: { date?: string; branch_id?: number }) =>
    get<BranchAppointmentSummary[]>('/reports/branch-appointment-summary', params as Record<string, unknown>),
  getDoctorRevenue: (params?: { from_date?: string; to_date?: string }) =>
    get<DoctorRevenueReport[]>('/reports/doctor-revenue', params as Record<string, unknown>),
  getOutstandingPatients: () =>
    get<OutstandingPatient[]>('/reports/outstanding-patients'),
  getTreatmentCounts: (params?: { from_date?: string; to_date?: string }) =>
    get<TreatmentCountReport[]>('/reports/treatment-counts', params as Record<string, unknown>),
  getInsuranceSummary: (params?: { from_date?: string; to_date?: string }) =>
    get<InsuranceSummary>('/reports/insurance-summary', params as Record<string, unknown>),
};

export default api;