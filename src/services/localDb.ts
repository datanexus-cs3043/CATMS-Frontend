import type { AuthUser } from './api';
import * as seed from './mockData';

type Row = Record<string, any>;

interface Db {
  version: number;
  users: seed.SeedUser[];
  branches: Row[];
  staff: Row[];
  specialties: Row[];
  doctors: Row[];
  patients: Row[];
  emergency_contacts: Row[];
  treatment_categories: Row[];
  treatments: Row[];
  insurance_providers: Row[];
  insurance_policies: Row[];
  insurance_coverages: Row[];
  appointments: Row[];
  appointment_treatments: Row[];
  notes: Row[];
  invoices: Row[];
  invoice_items: Row[];
  payments: Row[];
  doctor_payments: Row[];
  insurance_claims: Row[];
}

const DB_VERSION = 3;
const DB_KEY = 'catms_local_db';
/** Share of consultation fees paid out to the treating doctor. */
const DOCTOR_CONSULTATION_SHARE = 0.5;
const CONSULTATION_CATEGORY_ID = 1;

export class LocalHttpError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

const fail = (status: number, detail: string): never => { throw new LocalHttpError(status, detail); };
const forbidden = (detail = 'You do not have permission to access this resource.') => fail(403, detail);
const notFound = (what: string) => fail(404, `${what} not found.`);

// ── Persistence ───────────────────────────────────────────────────────────────
let db: Db | null = null;
let sessionUser: AuthUser | null = null;

export const setSessionUser = (user: AuthUser | null) => { sessionUser = user; };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function getDb(): Db {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (parsed.version === DB_VERSION) {
        db = parsed;
        return db;
      }
    }
  } catch { /* corrupted storage — reseed */ }
  db = buildSeed();
  save();
  return db;
}

function save() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ }
}

export function resetLocalDb() {
  db = buildSeed();
  save();
}

function buildSeed(): Db {
  const fresh: Db = {
    version: DB_VERSION,
    users: clone(seed.SEED_USERS),
    branches: clone(seed.seedBranches),
    staff: clone(seed.seedStaff),
    specialties: clone(seed.seedSpecialties),
    doctors: clone(seed.seedDoctors),
    patients: clone(seed.seedPatients),
    emergency_contacts: clone(seed.seedEmergencyContacts),
    treatment_categories: clone(seed.seedTreatmentCategories),
    treatments: clone(seed.seedTreatments),
    insurance_providers: clone(seed.seedInsuranceProviders),
    insurance_policies: clone(seed.seedInsurancePolicies),
    insurance_coverages: clone(seed.seedInsuranceCoverages),
    appointments: clone(seed.seedAppointments),
    appointment_treatments: seed.seedAppointmentTreatments.map((t, i) => ({ appointment_treatment_id: i + 1, ...t })),
    notes: clone(seed.seedNotes),
    invoices: [],
    invoice_items: [],
    payments: [],
    doctor_payments: [],
    insurance_claims: [],
  };
  db = fresh;
  for (const step of seed.SEED_BILLING) {
    const appt = fresh.appointments.find(a => a.appointment_id === step.appointment_id)!;
    const inv = generateInvoice(appt, 3, appt.appointment_date);
    const claim = fresh.insurance_claims.find(c => c.invoice_id === inv.invoice_id);
    if (claim && step.claim) settleClaim(claim, step.claim);
    for (const amount of step.payments) recordPayment(inv, amount, 'Cash', 'cashier_user', appt.appointment_date);
  }
  return fresh;
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100;
const nextId = (rows: Row[], key: string) => rows.reduce((m, r) => Math.max(m, Number(r[key]) || 0), 0) + 1;
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const toMinutes = (t: string) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};
const pick = (src: Row, keys: string[]) =>
  Object.fromEntries(keys.filter(k => src[k] !== undefined).map(k => [k, src[k]]));
const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const text = (v: unknown) => String(v ?? '').trim();

// ── Current user & roles ──────────────────────────────────────────────────────
const me = (): AuthUser => sessionUser ?? fail(401, 'Please sign in to continue.');
const isManagement = (u: AuthUser) => u.role === 'admin' || u.role === 'branch_manager';
const isFrontDesk = (u: AuthUser) => isManagement(u) || u.role === 'receptionist_cashier';
const requireFrontDesk = () => { const u = me(); if (!isFrontDesk(u)) forbidden(); return u; };
const requireManagement = () => { const u = me(); if (!isManagement(u)) forbidden(); return u; };

// ── Lookups ───────────────────────────────────────────────────────────────────
const findBranch = (id: number) => getDb().branches.find(b => b.branch_id === id);
const findStaff = (id: number) => getDb().staff.find(s => s.staff_id === id);
const findDoctor = (id: number) => getDb().doctors.find(d => d.doctor_id === id);
const findPatient = (id: number) => getDb().patients.find(p => p.patient_id === id);
const findTreatment = (id: number) => getDb().treatments.find(t => t.treatment_id === id);
const findAppointment = (id: number) => getDb().appointments.find(a => a.appointment_id === id);
const findInvoice = (id: number) => getDb().invoices.find(i => i.invoice_id === id);
const invoiceForAppointment = (apptId: number) => getDb().invoices.find(i => i.appointment_id === apptId);
const patientName = (p?: Row) => (p ? `${p.first_name} ${p.last_name}` : undefined);

// ── Access rules ──────────────────────────────────────────────────────────────
const doctorHasPatient = (doctorId: number, patientId: number) =>
  getDb().appointments.some(a => a.doctor_id === doctorId && a.patient_id === patientId);

function canSeeAppointment(u: AuthUser, a: Row) {
  if (isFrontDesk(u)) return true;
  if (u.role === 'doctor') return a.doctor_id === u.doctor_id;
  if (u.role === 'patient') return a.patient_id === u.patient_id;
  return false;
}

function canSeePatient(u: AuthUser, patientId: number) {
  if (isFrontDesk(u)) return true;
  if (u.role === 'doctor') return !!u.doctor_id && doctorHasPatient(u.doctor_id, patientId);
  if (u.role === 'patient') return u.patient_id === patientId;
  return false;
}

function canSeeInvoice(u: AuthUser, inv: Row) {
  if (isFrontDesk(u)) return true;
  if (u.role === 'patient') return findAppointment(inv.appointment_id)?.patient_id === u.patient_id;
  return false;
}

function getVisibleAppointment(id: number) {
  const a = findAppointment(id) ?? notFound('Appointment');
  if (!canSeeAppointment(me(), a)) forbidden('You can only access your own appointments.');
  return a;
}

function getVisibleInvoice(id: number) {
  const inv = findInvoice(id) ?? notFound('Invoice');
  if (!canSeeInvoice(me(), inv)) forbidden('You can only access your own bills.');
  return inv;
}

// ── Views (joined at read time so edits propagate everywhere) ─────────────────
function doctorView(d: Row) {
  const s = findStaff(d.staff_id) || {};
  const specialties = getDb().specialties.filter(sp => (d.specialty_ids || []).includes(sp.specialty_id));
  return {
    doctor_id: d.doctor_id,
    staff_id: d.staff_id,
    doctor_name: d.doctor_name,
    doctor_license_number: d.doctor_license_number,
    first_name: s.first_name,
    last_name: s.last_name,
    branch_id: s.branch_id,
    branch_name: findBranch(s.branch_id)?.branch_name,
    email: s.email,
    contact_details: s.contact_details,
    bio: d.bio || '',
    specialties: specialties.map(sp => ({ specialty_id: sp.specialty_id, specialty_name: sp.specialty_name })),
  };
}

function patientView(p: Row): Row {
  return { ...p, branch_name: findBranch(p.branch_id)?.branch_name };
}

function staffView(s: Row) {
  return { ...s, branch_name: findBranch(s.branch_id)?.branch_name };
}

function treatmentView(t: Row): Row {
  const cat = getDb().treatment_categories.find(c => c.category_id === t.category_id);
  return { ...t, category_name: cat?.category_name };
}

function appointmentView(a: Row): Row {
  const inv = invoiceForAppointment(a.appointment_id);
  const doctor = findDoctor(a.doctor_id);
  return {
    ...a,
    patient_name: patientName(findPatient(a.patient_id)),
    doctor_name: doctor?.doctor_name,
    branch_name: findBranch(a.branch_id)?.branch_name,
    treatment_name: a.treatment_id ? findTreatment(a.treatment_id)?.treatment_name : undefined,
    rescheduled_to: getDb().appointments.find(x => x.original_appointment_id === a.appointment_id)?.appointment_id ?? null,
    invoice_id: inv?.invoice_id ?? null,
    payment_status: inv ? inv.status : a.status === 'Completed' ? 'Not invoiced' : null,
    invoice_balance: inv ? inv.balance : null,
  };
}

function invoiceView(inv: Row): Row {
  const a = findAppointment(inv.appointment_id) || {};
  const pendingClaims = getDb().insurance_claims.filter(c => c.invoice_id === inv.invoice_id && c.status === 'Pending');
  return {
    ...inv,
    patient_id: a.patient_id,
    patient_name: patientName(findPatient(a.patient_id)),
    doctor_id: a.doctor_id,
    doctor_name: findDoctor(a.doctor_id)?.doctor_name,
    branch_name: findBranch(a.branch_id)?.branch_name,
    appointment_date: a.appointment_date,
    insurance_pending: round2(pendingClaims.reduce((s, c) => s + Number(c.claim_amount), 0)),
  };
}

function invoiceItemView(it: Row) {
  return { ...it, treatment_name: findTreatment(it.treatment_id)?.treatment_name, service_code: findTreatment(it.treatment_id)?.service_code };
}

function policyView(p: Row) {
  return {
    ...p,
    patient_name: patientName(findPatient(p.patient_id)),
    provider_name: getDb().insurance_providers.find(pr => pr.provider_id === p.provider_id)?.provider_name,
  };
}

function claimView(c: Row) {
  const pol = getDb().insurance_policies.find(p => p.policy_id === c.policy_id) || {};
  return {
    ...c,
    patient_name: patientName(findPatient(pol.patient_id)),
    provider_name: getDb().insurance_providers.find(pr => pr.provider_id === pol.provider_id)?.provider_name,
    policy_number: pol.policy_number,
  };
}

function paymentView(p: Row) {
  const inv = findInvoice(p.invoice_id);
  const a = inv ? findAppointment(inv.appointment_id) : undefined;
  return { ...p, patient_name: patientName(findPatient(a?.patient_id)) };
}


// ── Reports ───────────────────────────────────────────────────────────────────
const inRange = (date: string, from?: string, to?: string) => (!from || date >= from) && (!to || date <= to);

function reportBranchSummary(params: Row) {
  const d = getDb();
  const rows = new Map<string, Row>();
  d.appointments
    .filter(a => (!params.date || a.appointment_date === params.date) && (!params.branch_id || a.branch_id === Number(params.branch_id)))
    .forEach(a => {
      const key = `${a.branch_id}|${a.appointment_date}`;
      if (!rows.has(key)) {
        rows.set(key, { branch_id: a.branch_id, branch_name: findBranch(a.branch_id)?.branch_name, appointment_date: a.appointment_date, scheduled: 0, completed: 0, cancelled: 0, total: 0 });
      }
      const r = rows.get(key)!;
      r[String(a.status).toLowerCase()] += 1;
      r.total += 1;
    });
  return [...rows.values()].sort((x, y) => y.appointment_date.localeCompare(x.appointment_date) || x.branch_name.localeCompare(y.branch_name));
}

function reportDoctorRevenue(params: Row) {
  const d = getDb();
  return d.doctors.map(doc => {
    const invs = d.invoices.filter(inv => {
      const a = findAppointment(inv.appointment_id);
      return a?.doctor_id === doc.doctor_id && inRange(inv.invoice_date, params.from_date, params.to_date);
    });
    const total = invs.reduce((s, i) => s + Number(i.total_amount), 0);
    const collected = invs.reduce((s, i) => s + Number(i.amount_paid) + Number(i.insurance_covered), 0);
    return {
      doctor_id: doc.doctor_id,
      doctor_name: doc.doctor_name,
      branch_name: findBranch(findStaff(doc.staff_id)?.branch_id)?.branch_name,
      appointment_count: invs.length,
      total_revenue: round2(total),
      collected: round2(collected),
      avg_revenue: invs.length ? round2(total / invs.length) : 0,
    };
  }).sort((a, b) => b.total_revenue - a.total_revenue);
}

function reportOutstanding() {
  const d = getDb();
  const byPatient = new Map<number, Row>();
  d.invoices.filter(i => Number(i.balance) > 0).forEach(inv => {
    const pid = findAppointment(inv.appointment_id)?.patient_id;
    if (!pid) return;
    const p = findPatient(pid);
    if (!byPatient.has(pid)) {
      byPatient.set(pid, { patient_id: pid, patient_name: patientName(p), contact_details: p?.contact_details, total_outstanding: 0, invoice_count: 0 });
    }
    const r = byPatient.get(pid)!;
    r.total_outstanding = round2(r.total_outstanding + Number(inv.balance));
    r.invoice_count += 1;
  });
  return [...byPatient.values()].sort((a, b) => b.total_outstanding - a.total_outstanding);
}

function reportTreatmentCounts(params: Row) {
  const d = getDb();
  const rows = new Map<number, Row>();
  d.appointment_treatments.forEach(at => {
    const a = findAppointment(at.appointment_id);
    if (!a || a.status !== 'Completed' || !inRange(a.appointment_date, params.from_date, params.to_date)) return;
    const t = findTreatment(at.treatment_id);
    if (!t) return;
    if (!rows.has(t.treatment_id)) {
      rows.set(t.treatment_id, { category_name: treatmentView(t).category_name, treatment_name: t.treatment_name, count: 0, total_revenue: 0 });
    }
    const r = rows.get(t.treatment_id)!;
    r.count += Number(at.quantity);
    r.total_revenue = round2(r.total_revenue + Number(at.quantity) * Number(t.standard_price));
  });
  return [...rows.values()].sort((a, b) => a.category_name.localeCompare(b.category_name) || b.count - a.count);
}

function reportInsuranceSummary(params: Row) {
  const d = getDb();
  const invs = d.invoices.filter(i => inRange(i.invoice_date, params.from_date, params.to_date));
  const ids = new Set(invs.map(i => i.invoice_id));
  const claims = d.insurance_claims.filter(c => ids.has(c.invoice_id));
  const billed = invs.reduce((s, i) => s + Number(i.total_amount), 0);
  const approved = claims.filter(c => c.status === 'Approved').reduce((s, c) => s + Number(c.approved_amount), 0);
  const pending = claims.filter(c => c.status === 'Pending').reduce((s, c) => s + Number(c.claim_amount), 0);
  const paid = invs.reduce((s, i) => s + Number(i.amount_paid), 0);
  return {
    total_claims: claims.length,
    total_billed: round2(billed),
    approved_amount: round2(approved),
    pending_amount: round2(pending),
    out_of_pocket: round2(billed - approved),
    out_of_pocket_paid: round2(paid),
  };
}

