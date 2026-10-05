/**
 * CATMS seed data — loaded into the local data store (see localDb.ts) the first
 * time the app runs without a backend, or after "Reset demo data".
 *
 * Only base tables live here. Invoices, invoice items, insurance claims,
 * payments and doctor payments are generated from SEED_BILLING by localDb.ts
 * using the same code path the UI uses, so seeded totals are always consistent.
 */
import type { AuthUser } from './api';

// ── Date helpers (local time, not UTC) ────────────────────────────────────────
export const localDate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const thisYear = new Date().getFullYear();

// ── Login accounts ────────────────────────────────────────────────────────────
export interface SeedUser extends AuthUser {
  password: string;
}

export const SEED_USERS: SeedUser[] = [
  { user_id: 1, user_type: 'staff', role: 'admin', username: 'admin_user', password: 'admin123', email: 'nimal@medsync.lk', first_name: 'Nimal', last_name: 'Fernando', staff_id: 1, branch_id: 1 },
  { user_id: 2, user_type: 'staff', role: 'branch_manager', username: 'manager_kandy', password: 'manager123', email: 'amara@medsync.lk', first_name: 'Amara', last_name: 'Perera', staff_id: 2, branch_id: 2 },
  { user_id: 3, user_type: 'staff', role: 'receptionist_cashier', username: 'cashier_user', password: 'cashier123', email: 'sithum@medsync.lk', first_name: 'Sithum', last_name: 'Rajapaksa', staff_id: 3, branch_id: 1 },
  { user_id: 4, user_type: 'staff', role: 'doctor', username: 'doctor_silva', password: 'doctor123', email: 'silva@medsync.lk', first_name: 'Priya', last_name: 'Silva', staff_id: 4, doctor_id: 1, branch_id: 1 },
  { user_id: 5, user_type: 'patient', role: 'patient', username: 'patient_kamal', password: 'patient123', email: 'kamal@gmail.com', first_name: 'Kamal', last_name: 'Gunawardena', patient_id: 1, branch_id: 1 },
  { user_id: 6, user_type: 'patient', role: 'patient', username: 'patient_dilrukshi', password: 'patient123', email: 'dilrukshi@email.com', first_name: 'Dilrukshi', last_name: 'Rathnayake', patient_id: 2, branch_id: 2 },
  { user_id: 7, user_type: 'patient', role: 'patient', username: 'patient_tharaka', password: 'patient123', email: 'tharaka.parent@gmail.com', first_name: 'Tharaka', last_name: 'Seneviratne', patient_id: 3, branch_id: 3 },
  { user_id: 8, user_type: 'patient', role: 'patient', username: 'patient_manel', password: 'patient123', email: 'manel.perera@email.com', first_name: 'Manel', last_name: 'Perera', patient_id: 4, branch_id: 1 },
  { user_id: 9, user_type: 'patient', role: 'patient', username: 'patient_ishara', password: 'patient123', email: 'ishara@gmail.com', first_name: 'Ishara', last_name: 'Wickramasinghe', patient_id: 5, branch_id: 2 },
  { user_id: 10, user_type: 'patient', role: 'patient', username: 'patient_nadeesha', password: 'patient123', email: 'nadeesha@email.com', first_name: 'Nadeesha', last_name: 'Kumari', patient_id: 6, branch_id: 3 },
  { user_id: 11, user_type: 'staff', role: 'doctor', username: 'doctor_bandara', password: 'doctor123', email: 'bandara@medsync.lk', first_name: 'Chamara', last_name: 'Bandara', staff_id: 6, doctor_id: 2, branch_id: 1 },
];

/** The account each demo role button logs in as. */
export const DEMO_USERNAMES: Record<string, string> = {
  admin: 'admin_user',
  branch_manager: 'manager_kandy',
  receptionist_cashier: 'cashier_user',
  doctor: 'doctor_silva',
  patient: 'patient_kamal',
};

// ── Branches ─────────────────────────────────────────────────────────────────
export const seedBranches = [
  { branch_id: 1, branch_name: 'MedSync Colombo', location: 'Colombo', contact_details: '011-234-5678', manager_staff_id: 1 },
  { branch_id: 2, branch_name: 'MedSync Kandy', location: 'Kandy', contact_details: '081-234-5678', manager_staff_id: 2 },
  { branch_id: 3, branch_name: 'MedSync Galle', location: 'Galle', contact_details: '091-234-5678', manager_staff_id: 5 },
];

// ── Staff (medical and non-medical) ─────────────────────────────────────────
export const seedStaff = [
  { staff_id: 1, branch_id: 1, first_name: 'Nimal', last_name: 'Fernando', email: 'nimal@medsync.lk', contact_details: '077-100-1001', staff_type: 'Non-Medical', role: 'Manager' },
  { staff_id: 2, branch_id: 2, first_name: 'Amara', last_name: 'Perera', email: 'amara@medsync.lk', contact_details: '077-100-1002', staff_type: 'Non-Medical', role: 'Manager' },
  { staff_id: 3, branch_id: 1, first_name: 'Sithum', last_name: 'Rajapaksa', email: 'sithum@medsync.lk', contact_details: '077-100-1003', staff_type: 'Non-Medical', role: 'Receptionist' },
  { staff_id: 4, branch_id: 1, first_name: 'Priya', last_name: 'Silva', email: 'silva@medsync.lk', contact_details: '077-111-2222', staff_type: 'Medical', role: 'Doctor' },
  { staff_id: 5, branch_id: 3, first_name: 'Sunil', last_name: 'De Mel', email: 'sunil@medsync.lk', contact_details: '077-100-1005', staff_type: 'Non-Medical', role: 'Manager' },
  { staff_id: 6, branch_id: 1, first_name: 'Chamara', last_name: 'Bandara', email: 'bandara@medsync.lk', contact_details: '077-222-3333', staff_type: 'Medical', role: 'Doctor' },
  { staff_id: 7, branch_id: 2, first_name: 'Nimali', last_name: 'Jayasena', email: 'jayasena@medsync.lk', contact_details: '076-333-4444', staff_type: 'Medical', role: 'Doctor' },
  { staff_id: 8, branch_id: 2, first_name: 'Rohan', last_name: 'Mendis', email: 'mendis@medsync.lk', contact_details: '075-444-5555', staff_type: 'Medical', role: 'Doctor' },
  { staff_id: 9, branch_id: 3, first_name: 'Dilini', last_name: 'Wickrama', email: 'wickrama@medsync.lk', contact_details: '074-555-6666', staff_type: 'Medical', role: 'Doctor' },
  { staff_id: 10, branch_id: 3, first_name: 'Kasun', last_name: 'Herath', email: 'kasun@medsync.lk', contact_details: '077-100-1010', staff_type: 'Non-Medical', role: 'Receptionist' },
  { staff_id: 11, branch_id: 2, first_name: 'Ruwani', last_name: 'Dias', email: 'ruwani@medsync.lk', contact_details: '077-100-1011', staff_type: 'Medical', role: 'Nurse' },
];

// ── Specialties ───────────────────────────────────────────────────────────────
export const seedSpecialties = [
  { specialty_id: 1, specialty_name: 'General Medicine', description: 'Primary care and common illnesses' },
  { specialty_id: 2, specialty_name: 'ENT', description: 'Ear, nose and throat' },
  { specialty_id: 3, specialty_name: 'Paediatrics', description: 'Child healthcare' },
  { specialty_id: 4, specialty_name: 'Cardiology', description: 'Heart and vascular health' },
  { specialty_id: 5, specialty_name: 'Dermatology', description: 'Skin conditions' },
  { specialty_id: 6, specialty_name: 'Orthopaedics', description: 'Bone and joint care' },
  { specialty_id: 7, specialty_name: 'Ophthalmology', description: 'Eye care' },
];

// ── Doctors (branch, email and contact come from the linked staff row) ──────
export const seedDoctors = [
  { doctor_id: 1, staff_id: 4, doctor_name: 'Dr. Priya Silva', doctor_license_number: 'SLMC-2841', specialty_ids: [1, 4], bio: 'MBBS (Colombo), MD (Medicine). 12 years of experience in internal medicine and cardiology.' },
  { doctor_id: 2, staff_id: 6, doctor_name: 'Dr. Chamara Bandara', doctor_license_number: 'SLMC-3921', specialty_ids: [2, 1], bio: 'MBBS, MS (ENT). Special interest in sinus and hearing disorders.' },
  { doctor_id: 3, staff_id: 7, doctor_name: 'Dr. Nimali Jayasena', doctor_license_number: 'SLMC-1042', specialty_ids: [3, 5], bio: 'MBBS, MD (Paediatrics). Child health and paediatric dermatology.' },
  { doctor_id: 4, staff_id: 8, doctor_name: 'Dr. Rohan Mendis', doctor_license_number: 'SLMC-5523', specialty_ids: [6], bio: 'MBBS, MS (Ortho). Sports injuries and joint care.' },
  { doctor_id: 5, staff_id: 9, doctor_name: 'Dr. Dilini Wickrama', doctor_license_number: 'SLMC-7734', specialty_ids: [7, 1], bio: 'MBBS, MS (Ophthalmology). Cataract and general eye care.' },
];

// ── Patients ──────────────────────────────────────────────────────────────────
export const seedPatients = [
  { patient_id: 1, user_id: 5, first_name: 'Kamal', last_name: 'Gunawardena', date_of_birth: '1990-03-15', gender: 'Male', contact_details: '077-987-6543', email: 'kamal@gmail.com', address: '12 Galle Road, Colombo 03', branch_id: 1, patient_type: 'Regular' },
  { patient_id: 2, user_id: 6, first_name: 'Dilrukshi', last_name: 'Rathnayake', date_of_birth: '1985-07-22', gender: 'Female', contact_details: '076-876-5432', email: 'dilrukshi@email.com', address: '45 Kandy Road, Peradeniya', branch_id: 2, patient_type: 'Regular' },
  { patient_id: 3, user_id: 7, first_name: 'Tharaka', last_name: 'Seneviratne', date_of_birth: '2012-01-08', gender: 'Male', contact_details: '075-765-4321', email: 'tharaka.parent@gmail.com', address: '78 Marine Drive, Galle', branch_id: 3, patient_type: 'Child' },
  { patient_id: 4, user_id: 8, first_name: 'Manel', last_name: 'Perera', date_of_birth: '1952-11-30', gender: 'Female', contact_details: '074-654-3210', email: 'manel.perera@email.com', address: '23 Flower Road, Colombo 07', branch_id: 1, patient_type: 'Senior' },
  { patient_id: 5, user_id: 9, first_name: 'Ishara', last_name: 'Wickramasinghe', date_of_birth: '1998-06-14', gender: 'Male', contact_details: '071-543-2109', email: 'ishara@gmail.com', address: '56 Peradeniya Road, Kandy', branch_id: 2, patient_type: 'Regular' },
  { patient_id: 6, user_id: 10, first_name: 'Nadeesha', last_name: 'Kumari', date_of_birth: '1992-09-25', gender: 'Female', contact_details: '072-432-1098', email: 'nadeesha@email.com', address: '91 Hospital Road, Galle', branch_id: 3, patient_type: 'VIP' },
];

export const seedEmergencyContacts = [
  { emergency_contact_id: 1, patient_id: 1, contact_name: 'Kamani Gunawardena', relationship: 'Spouse', phone: '077-111-9999' },
  { emergency_contact_id: 2, patient_id: 2, contact_name: 'Rohana Rathnayake', relationship: 'Husband', phone: '076-222-8888' },
  { emergency_contact_id: 3, patient_id: 3, contact_name: 'Sanjeewa Seneviratne', relationship: 'Father', phone: '075-333-7777' },
  { emergency_contact_id: 4, patient_id: 4, contact_name: 'Ajith Perera', relationship: 'Son', phone: '074-444-6666' },
];

// ── Treatment catalogue ───────────────────────────────────────────────────────
export const seedTreatmentCategories = [
  { category_id: 1, category_name: 'Consultations', description: 'Doctor consultations and check-ups' },
  { category_id: 2, category_name: 'Diagnostics & Imaging', description: 'X-Ray, ECG and eye tests' },
  { category_id: 3, category_name: 'Laboratory', description: 'Blood and other laboratory tests' },
  { category_id: 4, category_name: 'Procedures', description: 'Injections, dressings and minor procedures' },
  { category_id: 5, category_name: 'Therapy', description: 'Physiotherapy and rehabilitation' },
];

export const seedTreatments = [
  { treatment_id: 1, service_code: 'CON-001', treatment_name: 'General Consultation', category_id: 1, standard_price: 1500 },
  { treatment_id: 2, service_code: 'CON-002', treatment_name: 'Specialist Consultation', category_id: 1, standard_price: 2500 },
  { treatment_id: 3, service_code: 'CON-003', treatment_name: 'Emergency Consultation', category_id: 1, standard_price: 3000 },
  { treatment_id: 4, service_code: 'DIA-001', treatment_name: 'X-Ray (Chest)', category_id: 2, standard_price: 3500 },
  { treatment_id: 5, service_code: 'DIA-002', treatment_name: 'ECG', category_id: 2, standard_price: 2500 },
  { treatment_id: 6, service_code: 'DIA-003', treatment_name: 'Eye Examination', category_id: 2, standard_price: 2000 },
  { treatment_id: 7, service_code: 'LAB-001', treatment_name: 'Full Blood Count', category_id: 3, standard_price: 1800 },
  { treatment_id: 8, service_code: 'PRO-001', treatment_name: 'Injection (IM/IV)', category_id: 4, standard_price: 800 },
  { treatment_id: 9, service_code: 'PRO-002', treatment_name: 'Wound Dressing', category_id: 4, standard_price: 1000 },
  { treatment_id: 10, service_code: 'THE-001', treatment_name: 'Physiotherapy Session', category_id: 5, standard_price: 2200 },
];

// ── Insurance ─────────────────────────────────────────────────────────────────
export const seedInsuranceProviders = [
  { provider_id: 1, provider_name: 'AIA Insurance Lanka', contact_details: '011-231-0310' },
  { provider_id: 2, provider_name: 'Ceylinco Life', contact_details: '011-246-1461' },
  { provider_id: 3, provider_name: 'Union Assurance', contact_details: '011-242-8428' },
];

export const seedInsurancePolicies = [
  { policy_id: 1, patient_id: 1, provider_id: 1, policy_number: 100001, start_date: `${thisYear - 1}-01-01`, end_date: `${thisYear + 1}-12-31`, status: 'Active' },
  { policy_id: 2, patient_id: 6, provider_id: 2, policy_number: 200002, start_date: `${thisYear - 3}-06-15`, end_date: `${thisYear - 1}-06-14`, status: 'Expired' },
  { policy_id: 3, patient_id: 4, provider_id: 3, policy_number: 300003, start_date: `${thisYear - 1}-03-01`, end_date: `${thisYear + 2}-02-28`, status: 'Active' },
];

/** Policy terms: which treatments a policy reimburses, by what %, up to what cap. */
export const seedInsuranceCoverages = [
  { coverage_id: 1, policy_id: 1, treatment_id: 2, coverage_percentage: 50, maximum_amount: 1000 },
  { coverage_id: 2, policy_id: 1, treatment_id: 4, coverage_percentage: 80, maximum_amount: 3000 },
  { coverage_id: 3, policy_id: 1, treatment_id: 5, coverage_percentage: 70, maximum_amount: 2000 },
  { coverage_id: 4, policy_id: 3, treatment_id: 1, coverage_percentage: 100, maximum_amount: 1500 },
  { coverage_id: 5, policy_id: 3, treatment_id: 5, coverage_percentage: 50, maximum_amount: 1500 },
  { coverage_id: 6, policy_id: 2, treatment_id: 6, coverage_percentage: 60, maximum_amount: 1500 },
];

// ── Appointments ──────────────────────────────────────────────────────────────
export const seedAppointments = [
  { appointment_id: 1, patient_id: 1, doctor_id: 1, branch_id: 1, appointment_date: localDate(0), start_time: '09:00', end_time: '09:30', appointment_type: 'Consultation', created_by: 'patient_kamal', treatment_id: 1, status: 'Scheduled', original_appointment_id: null },
  { appointment_id: 2, patient_id: 2, doctor_id: 3, branch_id: 2, appointment_date: localDate(0), start_time: '10:00', end_time: '10:30', appointment_type: 'Consultation', created_by: 'cashier_user', treatment_id: 2, status: 'Scheduled', original_appointment_id: null },
  { appointment_id: 3, patient_id: 3, doctor_id: 2, branch_id: 1, appointment_date: localDate(0), start_time: '11:00', end_time: '11:30', appointment_type: 'Walk-in', created_by: 'cashier_user', treatment_id: 3, status: 'Scheduled', original_appointment_id: null },
  { appointment_id: 4, patient_id: 4, doctor_id: 1, branch_id: 1, appointment_date: localDate(-1), start_time: '14:00', end_time: '14:30', appointment_type: 'Consultation', created_by: 'cashier_user', treatment_id: 1, status: 'Completed', original_appointment_id: null },
  { appointment_id: 5, patient_id: 5, doctor_id: 4, branch_id: 2, appointment_date: localDate(-1), start_time: '15:00', end_time: '15:30', appointment_type: 'Emergency', created_by: 'manager_kandy', treatment_id: 3, status: 'Completed', original_appointment_id: null },
  { appointment_id: 6, patient_id: 6, doctor_id: 5, branch_id: 3, appointment_date: localDate(1), start_time: '09:30', end_time: '10:00', appointment_type: 'Consultation', created_by: 'cashier_user', treatment_id: 6, status: 'Scheduled', original_appointment_id: null },
  { appointment_id: 7, patient_id: 1, doctor_id: 2, branch_id: 1, appointment_date: localDate(-7), start_time: '10:00', end_time: '10:30', appointment_type: 'Consultation', created_by: 'patient_kamal', treatment_id: 2, status: 'Completed', original_appointment_id: null },
  { appointment_id: 8, patient_id: 1, doctor_id: 1, branch_id: 1, appointment_date: localDate(-3), start_time: '16:00', end_time: '16:30', appointment_type: 'Follow-up', created_by: 'patient_kamal', treatment_id: 1, status: 'Cancelled', original_appointment_id: null },
  { appointment_id: 9, patient_id: 3, doctor_id: 5, branch_id: 3, appointment_date: localDate(-3), start_time: '11:00', end_time: '11:30', appointment_type: 'Consultation', created_by: 'cashier_user', treatment_id: 6, status: 'Completed', original_appointment_id: null },
  { appointment_id: 10, patient_id: 1, doctor_id: 3, branch_id: 2, appointment_date: localDate(3), start_time: '15:00', end_time: '15:30', appointment_type: 'Consultation', created_by: 'patient_kamal', treatment_id: 2, status: 'Scheduled', original_appointment_id: null },
  { appointment_id: 11, patient_id: 2, doctor_id: 1, branch_id: 1, appointment_date: localDate(-2), start_time: '09:00', end_time: '09:30', appointment_type: 'Consultation', created_by: 'patient_dilrukshi', treatment_id: 1, status: 'Completed', original_appointment_id: null },
  { appointment_id: 12, patient_id: 5, doctor_id: 1, branch_id: 1, appointment_date: localDate(2), start_time: '10:00', end_time: '10:30', appointment_type: 'Consultation', created_by: 'cashier_user', treatment_id: 1, status: 'Scheduled', original_appointment_id: null },
];

/** Treatments prescribed during completed appointments. */
export const seedAppointmentTreatments = [
  { appointment_id: 4, treatment_id: 1, quantity: 1 },
  { appointment_id: 4, treatment_id: 5, quantity: 1 },
  { appointment_id: 5, treatment_id: 3, quantity: 1 },
  { appointment_id: 5, treatment_id: 9, quantity: 1 },
  { appointment_id: 5, treatment_id: 8, quantity: 1 },
  { appointment_id: 7, treatment_id: 2, quantity: 1 },
  { appointment_id: 7, treatment_id: 4, quantity: 1 },
  { appointment_id: 9, treatment_id: 6, quantity: 1 },
  { appointment_id: 9, treatment_id: 1, quantity: 1 },
  { appointment_id: 11, treatment_id: 1, quantity: 1 },
  { appointment_id: 11, treatment_id: 7, quantity: 1 },
];

export const seedNotes = [
  { note_id: 1, appointment_id: 4, note_content: 'Occasional chest discomfort during exercise. BP 130/85. ECG normal sinus rhythm. Advised lifestyle changes; review in 2 weeks.', created_at: `${localDate(-1)}T14:20:00` },
  { note_id: 2, appointment_id: 7, note_content: 'Recurring sinus congestion for 3 weeks. Chest X-Ray clear. Prescribed nasal spray and antihistamine.', created_at: `${localDate(-7)}T10:25:00` },
  { note_id: 3, appointment_id: 5, note_content: 'Laceration on left forearm after fall. Cleaned, dressed and tetanus injection given.', created_at: `${localDate(-1)}T15:20:00` },
  { note_id: 4, appointment_id: 11, note_content: 'Fatigue for 2 weeks. FBC ordered; mild anaemia suspected. Iron supplements started.', created_at: `${localDate(-2)}T09:25:00` },
];

/**
 * Billing script replayed at seed time: generate the invoice for each completed
 * appointment, settle insurance claims, then record the listed payments.
 */
export const SEED_BILLING: { appointment_id: number; claim?: 'Approved' | 'Pending' | 'Rejected'; payments: number[] }[] = [
  { appointment_id: 4, claim: 'Approved', payments: [1250] },   // Manel: insured, fully settled
  { appointment_id: 5, payments: [2500] },                      // Ishara: partial payment
  { appointment_id: 7, claim: 'Approved', payments: [1000] },   // Kamal: insured, partially paid
  { appointment_id: 9, payments: [] },                          // Tharaka: unpaid
  { appointment_id: 11, payments: [] },                         // Dilrukshi: unpaid
];
