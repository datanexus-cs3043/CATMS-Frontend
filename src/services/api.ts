import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

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

export type DoctorCreateRequest = Pick<Doctor, 'staff_id' | 'doctor_name' | 'doctor_license_number'>;
export type DoctorUpdateRequest = Partial<Pick<Doctor, 'doctor_name' | 'doctor_license_number'>>;

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

// ── CSRF protection ───────────────────────────────────────────────────────────
// The backend requires an X-CSRF-Token header on every POST/PUT/PATCH/DELETE.
// The token is tied to the logged-in user and expires after 2 hours, so it is
// cached here, cleared on login/logout, and refetched once if it is rejected.
const CSRF_METHODS = ['post', 'put', 'patch', 'delete'];
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

const clearCsrfToken = () => {
  csrfToken = null;
  csrfRequest = null;
};

const fetchCsrfToken = (): Promise<string> => {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (!csrfRequest) {
    const request: Promise<string> = api
      .get<{ csrf_token: string }>('/auth/csrf', { timeout: 15000 })
      .then((res: AxiosResponse<{ csrf_token: string }>) => {
        csrfToken = res.data.csrf_token;
        return res.data.csrf_token;
      })
      .finally(() => { csrfRequest = null; });
    csrfRequest = request;
    return request;
  }
  return csrfRequest;
};

const needsCsrf = (cfg: InternalAxiosRequestConfig): boolean =>
  CSRF_METHODS.includes((cfg.method || 'get').toLowerCase()) &&
  !(cfg.url || '').startsWith('/auth/') &&
  !cfg.headers.has('X-CSRF-Token');

const isCsrfRejection = (error: any): boolean =>
  error?.response?.status === 403 &&
  String(error.response.data?.detail || '').toLowerCase().includes('csrf');

api.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
  if (needsCsrf(cfg)) cfg.headers.set('X-CSRF-Token', await fetchCsrfToken());
  return cfg;
});

// Expired or stale CSRF token: get a fresh one and retry the request once.
api.interceptors.response.use(
  res => res,
  async (error) => {
    if (isCsrfRejection(error) && error.config && !error.config._csrfRetried) {
      clearCsrfToken();
      error.config._csrfRetried = true;
      error.config.headers.delete('X-CSRF-Token');
      return api.request(error.config);
    }
    throw error;
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
const isAuthUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  const staffRoles: UserRole[] = ['admin', 'branch_manager', 'doctor', 'receptionist_cashier'];
  return Number.isSafeInteger(user.user_id) && Number(user.user_id) > 0 && (
    (user.user_type === 'patient' && user.role === 'patient') ||
    (user.user_type === 'staff' && staffRoles.includes(user.role as UserRole))
  );
};

export const authService = {
  login: async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
    clearCsrfToken();
    const res = await api.post<LoginResponse>('/auth/login', credentials, { timeout: 15000 });
    if (!isAuthUser(res.data?.user)) throw new Error('Invalid sign-in response');
    return res.data;
  },
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<AuthUser> => {
    const res = await api.get<AuthUser>('/auth/me', { timeout: 15000 });
    if (!isAuthUser(res.data)) throw new Error('Invalid session response');
    return res.data;
  },
  logout: async (): Promise<{ message: string }> => {
    clearCsrfToken();
    const res = await api.post<{ message: string }>('/auth/logout');
    return res.data;
  },
  getCsrfToken: async (): Promise<{ csrf_token: string }> => {
    const res = await api.get<{ csrf_token: string }>('/auth/csrf', { timeout: 15000 });
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
  update: async (id: number, data: Partial<Staff>) => {
    const { csrf_token } = await authService.getCsrfToken();
    if (typeof csrf_token !== 'string' || !csrf_token) throw new Error('Unable to authorize the staff update');
    const res = await api.put<Staff>(`/staff/${id}`, data, {
      headers: { 'X-CSRF-Token': csrf_token },
      timeout: 15000,
    });
    return res.data;
  },
  delete: (id: number) => del(`/staff/${id}`),
};

// ── Doctor Service ─────────────────────────────────────────────────────────────
const readDoctor = (value: unknown): Doctor => {
  const doc = value as Partial<Doctor> | null;
  if (!doc || !Number.isSafeInteger(doc.doctor_id) || Number(doc.doctor_id) <= 0 ||
      !Number.isSafeInteger(doc.staff_id) || Number(doc.staff_id) <= 0 ||
      typeof doc.doctor_name !== 'string' || typeof doc.doctor_license_number !== 'string') {
    throw new Error('Invalid doctor response');
  }
  if (doc.specialties !== undefined && (!Array.isArray(doc.specialties) || doc.specialties.some(s =>
    !s || !Number.isSafeInteger(s.specialty_id) || s.specialty_id <= 0 || typeof s.specialty_name !== 'string'))) {
    throw new Error('Invalid doctor specialties response');
  }
  return doc as Doctor;
};

const doctorWriteConfig = async () => {
  const { csrf_token } = await authService.getCsrfToken();
  if (typeof csrf_token !== 'string' || !csrf_token) throw new Error('Unable to authorize the doctor update');
  return { headers: { 'X-CSRF-Token': csrf_token }, timeout: 15000 };
};

export const doctorService = {
  getAll: async (params?: { branch_id?: number; specialty_id?: number; search?: string }): Promise<Doctor[]> => {
    const doctors: Doctor[] = [];
    const seen = new Set<number>();
    // The backend caps pages at 100; do not silently omit the rest of the directory.
    for (let skip = 0; ; skip += 100) {
      const res = await api.get<Doctor[]>('/doctors', { params: { ...params, skip, limit: 100 }, timeout: 15000 });
      if (!Array.isArray(res.data)) throw new Error('Invalid doctor directory response');
      const page = res.data.map(readDoctor);
      for (const doc of page) {
        if (!Number.isSafeInteger(doc.branch_id) || Number(doc.branch_id) <= 0 ||
            typeof doc.branch_name !== 'string' || !Array.isArray(doc.specialties)) {
          throw new Error('Doctor directory response is missing branch or specialty details');
        }
        if (seen.has(doc.doctor_id)) throw new Error('Doctor directory changed while loading. Please reload.');
        seen.add(doc.doctor_id);
        doctors.push(doc);
      }
      if (page.length < 100) return doctors;
    }
  },
  getById: async (id: number): Promise<Doctor> => {
    const res = await api.get<Doctor>(`/doctors/${id}`, { timeout: 15000 });
    const doctor = readDoctor(res.data);
    if (doctor.doctor_id !== id) throw new Error('Doctor response does not match the requested profile');
    return doctor;
  },
  create: async (data: DoctorCreateRequest): Promise<Doctor> => {
    const res = await api.post<Doctor>('/doctors', data, await doctorWriteConfig());
    const doctor = readDoctor(res.data);
    if (doctor.staff_id !== data.staff_id) throw new Error('Doctor response does not match the selected staff record');
    return doctor;
  },
  update: async (id: number, data: DoctorUpdateRequest): Promise<Doctor> => {
    const res = await api.put<Doctor>(`/doctors/${id}`, data, await doctorWriteConfig());
    const doctor = readDoctor(res.data);
    if (doctor.doctor_id !== id) throw new Error('Doctor response does not match the updated profile');
    return doctor;
  },
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
  getInsurancePolicies: (id: number) => get<InsurancePolicy[]>(`/patients/${id}/insurance`),
};

// ── Insurance Service ─────────────────────────────────────────────────────────
export const insuranceService = {
  getProviders: () => get<InsuranceProvider[]>('/insurance/providers'),
  createProvider: (data: Partial<InsuranceProvider>) => post<InsuranceProvider>('/insurance/providers', data),
  // The backend list endpoints take no filters (they are already scoped to the
  // user's branch/patient), so optional filters are applied here.
  getPolicies: async (params?: { patient_id?: number; status?: string }) => {
    const policies = await get<InsurancePolicy[]>('/insurance/policies');
    return policies.filter(p =>
      (params?.patient_id === undefined || p.patient_id === params.patient_id) &&
      (params?.status === undefined || p.status === params.status));
  },
  getPolicyById: (id: number) => get<InsurancePolicy>(`/insurance/policies/${id}`),
  createPolicy: (data: Partial<InsurancePolicy>) => post<InsurancePolicy>('/insurance/policies', data),
  updatePolicy: (id: number, data: Partial<InsurancePolicy>) =>
    put<InsurancePolicy>(`/insurance/policies/${id}`, data),
  getCoverageByPolicy: async (policyId: number) => {
    const coverages = await get<InsuranceCoverage[]>('/insurance/coverage');
    return coverages.filter(c => c.policy_id === policyId);
  },
  addCoverage: (policyId: number, data: Partial<InsuranceCoverage>) =>
    post<InsuranceCoverage>('/insurance/coverage', { ...data, policy_id: policyId }),
  getClaims: async (params?: { status?: string; invoice_id?: number }) => {
    const claims = await get<InsuranceClaim[]>('/insurance/claims');
    return claims.filter(c =>
      (params?.invoice_id === undefined || c.invoice_id === params.invoice_id) &&
      (params?.status === undefined || c.status === params.status));
  },
  getClaimById: (id: number) => get<InsuranceClaim>(`/insurance/claims/${id}`),
  createClaim: (data: Partial<InsuranceClaim>) => post<InsuranceClaim>('/insurance/claims', data),
  updateClaim: (id: number, data: Partial<InsuranceClaim>) =>
    put<InsuranceClaim>(`/insurance/claims/${id}`, data),
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
