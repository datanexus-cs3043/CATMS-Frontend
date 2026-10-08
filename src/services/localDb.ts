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


// Persistence 
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


// Small helpers 
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


// Current user & roles 
const me = (): AuthUser => sessionUser ?? fail(401, 'Please sign in to continue.');
const isManagement = (u: AuthUser) => u.role === 'admin' || u.role === 'branch_manager';
const isFrontDesk = (u: AuthUser) => isManagement(u) || u.role === 'receptionist_cashier';
const requireFrontDesk = () => { const u = me(); if (!isFrontDesk(u)) forbidden(); return u; };
const requireManagement = () => { const u = me(); if (!isManagement(u)) forbidden(); return u; };


// Lookups 
const findBranch = (id: number) => getDb().branches.find(b => b.branch_id === id);
const findStaff = (id: number) => getDb().staff.find(s => s.staff_id === id);
const findDoctor = (id: number) => getDb().doctors.find(d => d.doctor_id === id);
const findPatient = (id: number) => getDb().patients.find(p => p.patient_id === id);
const findTreatment = (id: number) => getDb().treatments.find(t => t.treatment_id === id);
const findAppointment = (id: number) => getDb().appointments.find(a => a.appointment_id === id);
const findInvoice = (id: number) => getDb().invoices.find(i => i.invoice_id === id);
const invoiceForAppointment = (apptId: number) => getDb().invoices.find(i => i.appointment_id === apptId);
const patientName = (p?: Row) => (p ? `${p.first_name} ${p.last_name}` : undefined);


// Access rules 
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


// Views (joined at read time so edits propagate everywhere) 
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


// Billing core 
function recalcInvoice(inv: Row) {
  const d = getDb();
  const items = d.invoice_items.filter(i => i.invoice_id === inv.invoice_id);
  const total = items.reduce((s, i) => s + Number(i.unitprice) * Number(i.quantity), 0);
  const covered = d.insurance_claims
    .filter(c => c.invoice_id === inv.invoice_id && c.status === 'Approved')
    .reduce((s, c) => s + Number(c.approved_amount), 0);
  const paid = d.payments.filter(p => p.invoice_id === inv.invoice_id).reduce((s, p) => s + Number(p.amount), 0);
  inv.total_amount = round2(total);
  inv.insurance_covered = round2(covered);
  inv.amount_paid = round2(paid);
  inv.balance = round2(Math.max(0, total - covered - paid));
  inv.status = inv.balance <= 0 ? 'Paid' : paid > 0 || covered > 0 ? 'Partially Paid' : 'Unpaid';
}

function activePolicyFor(patientId: number, onDate: string) {
  return getDb().insurance_policies.find(p =>
    p.patient_id === patientId && p.status === 'Active' && p.start_date <= onDate && p.end_date >= onDate);
}

/** Insurance amount a policy covers for the given invoice items. */
function coverageFor(policyId: number, items: Row[]) {
  const coverages = getDb().insurance_coverages.filter(c => c.policy_id === policyId);
  return round2(items.reduce((sum, it) => {
    const cov = coverages.find(c => c.treatment_id === it.treatment_id);
    if (!cov) return sum;
    const line = Number(it.unitprice) * Number(it.quantity);
    return sum + Math.min(line * Number(cov.coverage_percentage) / 100, Number(cov.maximum_amount));
  }, 0));
}

function generateInvoice(appt: Row, staffId: number, invoiceDate: string) {
  const d = getDb();
  if (appt.status !== 'Completed') fail(400, 'Invoices can only be generated for completed appointments.');
  if (invoiceForAppointment(appt.appointment_id)) fail(409, 'An invoice already exists for this appointment.');

  let lines = d.appointment_treatments.filter(t => t.appointment_id === appt.appointment_id);
  if (lines.length === 0) {
    // No treatments recorded — bill the booked service (or a general consultation).
    lines = [{ treatment_id: appt.treatment_id || 1, quantity: 1 }];
  }

  const inv: Row = {
    invoice_id: nextId(d.invoices, 'invoice_id'),
    appointment_id: appt.appointment_id,
    staff_id: staffId,
    invoice_date: invoiceDate,
  };
  d.invoices.push(inv);

  const items = lines.map(l => {
    const t = findTreatment(l.treatment_id) ?? notFound('Treatment');
    const item = {
      invoice_item_id: nextId(d.invoice_items, 'invoice_item_id'),
      invoice_id: inv.invoice_id,
      treatment_id: t.treatment_id,
      quantity: Number(l.quantity) || 1,
      unitprice: Number(t.standard_price),
      description: t.service_code,
    };
    d.invoice_items.push(item);
    return item;
  });

  // Doctor's share of consultation fees
  items.filter(it => findTreatment(it.treatment_id)?.category_id === CONSULTATION_CATEGORY_ID).forEach(it => {
    d.doctor_payments.push({
      doctor_payment_id: nextId(d.doctor_payments, 'doctor_payment_id'),
      doctor_id: appt.doctor_id,
      appointment_id: appt.appointment_id,
      invoice_item_id: it.invoice_item_id,
      date: invoiceDate,
      time: appt.end_time,
      doctor_payment: round2(it.unitprice * it.quantity * DOCTOR_CONSULTATION_SHARE),
    });
  });

  // Insurance claim for covered treatments under an active policy
  const policy = activePolicyFor(appt.patient_id, appt.appointment_date);
  if (policy) {
    const covered = coverageFor(policy.policy_id, items);
    if (covered > 0) {
      d.insurance_claims.push({
        claim_id: nextId(d.insurance_claims, 'claim_id'),
        invoice_id: inv.invoice_id,
        policy_id: policy.policy_id,
        claim_date: invoiceDate,
        claim_amount: covered,
        approved_amount: 0,
        status: 'Pending',
      });
    }
  }

  recalcInvoice(inv);
  return inv;
}

function settleClaim(claim: Row, status: string, approvedAmount?: number) {
  const inv = findInvoice(claim.invoice_id)!;
  if (status === 'Approved') {
    const otherApproved = getDb().insurance_claims
      .filter(c => c.invoice_id === inv.invoice_id && c.claim_id !== claim.claim_id && c.status === 'Approved')
      .reduce((s, c) => s + Number(c.approved_amount), 0);
    const payable = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid) - otherApproved);
    const requested = approvedAmount ?? Number(claim.claim_amount);
    if (requested < 0) fail(400, 'Approved amount cannot be negative.');
    claim.approved_amount = round2(Math.min(requested, Number(claim.claim_amount), payable));
  } else {
    claim.approved_amount = 0;
  }
  claim.status = status;
  recalcInvoice(inv);
}

function recordPayment(inv: Row, amount: number, method: string, receivedBy: string, date: string) {
  if (!(amount > 0)) fail(400, 'Payment amount must be greater than zero.');
  if (round2(amount) > Number(inv.balance)) fail(400, `Payment exceeds the outstanding balance of Rs. ${Number(inv.balance).toLocaleString()}.`);
  const d = getDb();
  const p = {
    payment_id: nextId(d.payments, 'payment_id'),
    invoice_id: inv.invoice_id,
    amount: round2(amount),
    method,
    payment_date: date,
    received_by: receivedBy,
  };
  d.payments.push(p);
  recalcInvoice(inv);
  return p;
}


// Appointment rules 
function assertNoOverlap(candidate: Row, ignoreIds: number[] = []) {
  const start = toMinutes(candidate.start_time);
  const end = toMinutes(candidate.end_time);
  if (!(end > start)) fail(400, 'End time must be after start time.');
  const clash = (a: Row) =>
    !ignoreIds.includes(a.appointment_id) &&
    a.status !== 'Cancelled' &&
    a.appointment_date === candidate.appointment_date &&
    toMinutes(a.start_time) < end && start < toMinutes(a.end_time);

  const doctorClash = getDb().appointments.find(a => a.doctor_id === candidate.doctor_id && clash(a));
  if (doctorClash) {
    fail(409, `The doctor already has an appointment from ${doctorClash.start_time} to ${doctorClash.end_time} on ${doctorClash.appointment_date}. Please choose another time.`);
  }
  const patientClash = getDb().appointments.find(a => a.patient_id === candidate.patient_id && clash(a));
  if (patientClash) {
    fail(409, `The patient already has an appointment from ${patientClash.start_time} to ${patientClash.end_time} on ${patientClash.appointment_date}.`);
  }
}

function assertNotPast(date: string, start: string) {
  const today = seed.localDate(0);
  if (date < today || (date === today && toMinutes(start) < toMinutes(nowTime()))) {
    fail(400, 'Appointments cannot be booked in the past.');
  }
}

function assertScheduled(a: Row, action: string) {
  if (a.status !== 'Scheduled') fail(400, `Only scheduled appointments can be ${action}. This one is ${a.status}.`);
}

function canManageAppointment(u: AuthUser, a: Row) {
  return isFrontDesk(u) || (u.role === 'patient' && a.patient_id === u.patient_id);
}


//  Reports 
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


// Router 
type Handler = (m: RegExpMatchArray, params: Row, body: Row) => unknown;
const routes: [string, RegExp, Handler][] = [];
const route = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp(`^${pattern.replace(/:\w+/g, '(\\d+)')}$`), h]);


// Auth 
const toAuthUser = (u: seed.SeedUser): AuthUser => {
  const { password: _pw, ...rest } = u;
  return rest;
};

export function localLogin(username: string, password: string): AuthUser {
  const u = getDb().users.find(x => x.username === text(username));
  if (!u || u.password !== password) fail(401, 'Invalid username or password.');
  return toAuthUser(u!);
}

export function localDemoUser(role: string): AuthUser {
  const username = seed.DEMO_USERNAMES[role] || seed.DEMO_USERNAMES.admin;
  return toAuthUser(getDb().users.find(u => u.username === username)!);
}

route('GET', '/auth/me', () => me());
route('POST', '/auth/logout', () => ({ message: 'Logged out' }));
route('POST', '/auth/login', (_m, _p, b) => {
  const user = localLogin(b.username, b.password);
  return { message: 'Login successful', user, access_token: `local_token_${user.role}`, token_type: 'bearer' };
});
route('POST', '/auth/register', (_m, _p, b) => {
  const d = getDb();
  const username = text(b.username);
  if (!username || !b.password) fail(400, 'Username and password are required.');
  if (d.users.some(u => u.username === username)) fail(409, 'That username is already taken.');
  if (!text(b.first_name) || !text(b.last_name) || !b.date_of_birth) fail(400, 'Name and date of birth are required.');
  const branchId = Number(b.branch_id) || 1;
  if (!findBranch(branchId)) notFound('Branch');
  const userId = nextId(d.users, 'user_id');
  const patientId = nextId(d.patients, 'patient_id');
  d.patients.push({
    patient_id: patientId, user_id: userId, branch_id: branchId,
    first_name: text(b.first_name), last_name: text(b.last_name),
    date_of_birth: b.date_of_birth, gender: b.gender || 'Other', patient_type: 'Regular',
    contact_details: text(b.contact_details), email: text(b.email), address: text(b.address),
  });
  const user: seed.SeedUser = {
    user_id: userId, user_type: 'patient', role: 'patient', username, password: String(b.password),
    email: text(b.email), first_name: text(b.first_name), last_name: text(b.last_name),
    patient_id: patientId, branch_id: branchId,
  };
  d.users.push(user);
  save();
  return { message: 'Account created', user: toAuthUser(user) };
});


// Branches 
// Public: the self-registration form needs the branch list before sign-in.
route('GET', '/branches', () => getDb().branches);
route('GET', '/branches/:id', m => { me(); return findBranch(Number(m[1])) ?? notFound('Branch'); });
route('POST', '/branches', (_m, _p, b) => {
  requireManagement();
  if (!text(b.branch_name) || !text(b.location)) fail(400, 'Branch name and location are required.');
  const d = getDb();
  const row = { branch_id: nextId(d.branches, 'branch_id'), branch_name: text(b.branch_name), location: text(b.location), contact_details: text(b.contact_details), manager_staff_id: num(b.manager_staff_id) ?? null };
  d.branches.push(row);
  return row;
});
route('PUT', '/branches/:id', (m, _p, b) => {
  requireManagement();
  const row = findBranch(Number(m[1])) ?? notFound('Branch');
  Object.assign(row, pick(b, ['branch_name', 'location', 'contact_details', 'manager_staff_id']));
  return row;
});


// Staff 
route('GET', '/staff', (_m, p) => {
  requireManagement();
  return getDb().staff
    .filter(s => (!p.branch_id || s.branch_id === Number(p.branch_id)) && (!p.role || s.role === p.role))
    .map(staffView);
});
route('GET', '/staff/:id', m => { requireManagement(); return staffView(findStaff(Number(m[1])) ?? notFound('Staff member')); });
route('POST', '/staff', (_m, _p, b) => {
  requireManagement();
  const d = getDb();
  if (!text(b.first_name) || !text(b.last_name) || !text(b.email)) fail(400, 'Name and email are required.');
  if (!findBranch(Number(b.branch_id))) notFound('Branch');
  const row = {
    staff_id: nextId(d.staff, 'staff_id'), branch_id: Number(b.branch_id),
    first_name: text(b.first_name), last_name: text(b.last_name), email: text(b.email),
    contact_details: text(b.contact_details), staff_type: b.staff_type || 'Non-Medical', role: b.role || 'Receptionist',
  };
  if (row.role === 'Doctor') {
    const license = text(b.doctor_license_number);
    if (!license) fail(400, 'A medical license number is required for doctors.');
    if (d.doctors.some(doc => doc.doctor_license_number === license)) fail(409, 'That license number is already registered.');
    row.staff_type = 'Medical';
    d.staff.push(row);
    d.doctors.push({
      doctor_id: nextId(d.doctors, 'doctor_id'), staff_id: row.staff_id,
      doctor_name: `Dr. ${row.first_name} ${row.last_name}`, doctor_license_number: license,
      specialty_ids: (b.specialty_ids || []).map(Number), bio: '',
    });
  } else {
    d.staff.push(row);
  }
  return staffView(row);
});
route('PUT', '/staff/:id', (m, _p, b) => {
  requireManagement();
  const row = findStaff(Number(m[1])) ?? notFound('Staff member');
  Object.assign(row, pick(b, ['first_name', 'last_name', 'email', 'contact_details', 'branch_id', 'role', 'staff_type']));
  const doc = getDb().doctors.find(d => d.staff_id === row.staff_id);
  if (doc) doc.doctor_name = `Dr. ${row.first_name} ${row.last_name}`;
  return staffView(row);
});


// Doctors 
route('GET', '/doctors', (_m, p) => {
  const u = me();
  let list = getDb().doctors.map(doctorView);
  // A doctor only ever sees their own record.
  if (u.role === 'doctor') return list.filter(d => d.doctor_id === u.doctor_id);
  if (p.branch_id) list = list.filter(d => d.branch_id === Number(p.branch_id));
  if (p.specialty_id) list = list.filter(d => d.specialties.some(s => s.specialty_id === Number(p.specialty_id)));
  if (p.search) {
    const q = String(p.search).toLowerCase();
    list = list.filter(d => d.doctor_name.toLowerCase().includes(q) || d.specialties.some(s => s.specialty_name.toLowerCase().includes(q)));
  }
  return list;
});
route('GET', '/doctors/:id', m => {
  const u = me();
  const id = Number(m[1]);
  if (u.role === 'doctor' && u.doctor_id !== id) forbidden('Doctors can only view their own profile.');
  return doctorView(findDoctor(id) ?? notFound('Doctor'));
});
route('PUT', '/doctors/:id', (m, _p, b) => {
  const u = me();
  const id = Number(m[1]);
  const doc = findDoctor(id) ?? notFound('Doctor');
  const isSelf = u.role === 'doctor' && u.doctor_id === id;
  if (!isSelf && !isManagement(u)) forbidden('You can only edit your own profile.');
  const staff = findStaff(doc.staff_id)!;

  if (b.first_name !== undefined && !text(b.first_name)) fail(400, 'First name cannot be empty.');
  if (b.last_name !== undefined && !text(b.last_name)) fail(400, 'Last name cannot be empty.');
  Object.assign(staff, pick(b, ['first_name', 'last_name', 'email', 'contact_details']));
  if (b.bio !== undefined) doc.bio = text(b.bio);
  if (Array.isArray(b.specialty_ids)) {
    const valid = b.specialty_ids.map(Number).filter((sid: number) => getDb().specialties.some(s => s.specialty_id === sid));
    if (valid.length === 0) fail(400, 'Select at least one specialty.');
    doc.specialty_ids = valid;
  }
  // Only management may change licence or branch.
  if (isManagement(u)) {
    if (b.doctor_license_number) doc.doctor_license_number = text(b.doctor_license_number);
    if (b.branch_id) staff.branch_id = Number(b.branch_id);
  }
  doc.doctor_name = `Dr. ${staff.first_name} ${staff.last_name}`;

  // Keep the login account in sync so the navbar shows the new details.
  const account = getDb().users.find(x => x.staff_id === staff.staff_id);
  if (account) Object.assign(account, { first_name: staff.first_name, last_name: staff.last_name, email: staff.email });
  return doctorView(doc);
});

route('GET', '/specialties', () => { me(); return getDb().specialties; });


// Treatments 
route('GET', '/treatment-categories', () => { me(); return getDb().treatment_categories; });
route('GET', '/treatments', (_m, p) => {
  me();
  let list = getDb().treatments.map(treatmentView);
  if (p.category_id) list = list.filter(t => t.category_id === Number(p.category_id));
  if (p.search) {
    const q = String(p.search).toLowerCase();
    list = list.filter(t => t.treatment_name.toLowerCase().includes(q) || t.service_code.toLowerCase().includes(q));
  }
  return list;
});
route('GET', '/treatments/:id', m => { me(); return treatmentView(findTreatment(Number(m[1])) ?? notFound('Treatment')); });
route('POST', '/treatments', (_m, _p, b) => {
  requireManagement();
  const d = getDb();
  const code = text(b.service_code).toUpperCase();
  if (!code || !text(b.treatment_name) || !(Number(b.standard_price) > 0)) fail(400, 'Service code, name and a positive price are required.');
  if (d.treatments.some(t => t.service_code === code)) fail(409, 'That service code already exists.');
  const row = { treatment_id: nextId(d.treatments, 'treatment_id'), service_code: code, treatment_name: text(b.treatment_name), category_id: Number(b.category_id), standard_price: Number(b.standard_price) };
  d.treatments.push(row);
  return treatmentView(row);
});
route('PUT', '/treatments/:id', (m, _p, b) => {
  requireManagement();
  const row = findTreatment(Number(m[1])) ?? notFound('Treatment');
  if (b.standard_price !== undefined && !(Number(b.standard_price) > 0)) fail(400, 'Price must be positive.');
  Object.assign(row, pick(b, ['treatment_name', 'category_id', 'standard_price']));
  row.standard_price = Number(row.standard_price);
  return treatmentView(row);
});


// Patients 
route('GET', '/patients', (_m, p) => {
  const u = me();
  let list = getDb().patients;
  if (u.role === 'patient') list = list.filter(x => x.patient_id === u.patient_id);
  else if (u.role === 'doctor') list = list.filter(x => u.doctor_id && doctorHasPatient(u.doctor_id, x.patient_id));
  else if (!isFrontDesk(u)) forbidden();
  if (p.branch_id) list = list.filter(x => x.branch_id === Number(p.branch_id));
  if (p.search) {
    const q = String(p.search).toLowerCase();
    list = list.filter(x => `${x.first_name} ${x.last_name}`.toLowerCase().includes(q) || String(x.email || '').toLowerCase().includes(q));
  }
  return list.map(patientView);
});
route('GET', '/patients/:id', m => {
  const id = Number(m[1]);
  const p = findPatient(id) ?? notFound('Patient');
  if (!canSeePatient(me(), id)) forbidden('You can only access your own patient records.');
  return patientView(p);
});
route('POST', '/patients', (_m, _p, b) => {
  requireFrontDesk();
  const d = getDb();
  if (!text(b.first_name) || !text(b.last_name) || !b.date_of_birth) fail(400, 'Name and date of birth are required.');
  if (b.date_of_birth > seed.localDate(0)) fail(400, 'Date of birth cannot be in the future.');
  const branchId = Number(b.branch_id) || 1;
  if (!findBranch(branchId)) notFound('Branch');
  const userId = nextId(d.users, 'user_id');
  const patientId = nextId(d.patients, 'patient_id');
  let username = `${text(b.first_name)}.${text(b.last_name)}`.toLowerCase().replace(/[^a-z.]/g, '');
  if (d.users.some(x => x.username === username)) username = `${username}${patientId}`;
  const row = {
    patient_id: patientId, user_id: userId, branch_id: branchId,
    first_name: text(b.first_name), last_name: text(b.last_name), date_of_birth: b.date_of_birth,
    gender: b.gender || 'Other', patient_type: b.patient_type || 'Regular',
    contact_details: text(b.contact_details), email: text(b.email), address: text(b.address),
  };
  d.patients.push(row);
  d.users.push({
    user_id: userId, user_type: 'patient', role: 'patient', username, password: 'patient123',
    email: row.email, first_name: row.first_name, last_name: row.last_name, patient_id: patientId, branch_id: branchId,
  });
  if (text(b.emergency_contact_name) && text(b.emergency_contact_phone)) {
    d.emergency_contacts.push({
      emergency_contact_id: nextId(d.emergency_contacts, 'emergency_contact_id'), patient_id: patientId,
      contact_name: text(b.emergency_contact_name), relationship: text(b.emergency_contact_relationship) || 'Other', phone: text(b.emergency_contact_phone),
    });
  }
  return { ...patientView(row), username, temporary_password: 'patient123' };
});
route('PUT', '/patients/:id', (m, _p, b) => {
  const u = me();
  const id = Number(m[1]);
  const row = findPatient(id) ?? notFound('Patient');
  const isSelf = u.role === 'patient' && u.patient_id === id;
  if (!isSelf && !isFrontDesk(u)) forbidden('You can only edit your own profile.');
  const fields = isSelf
    ? ['contact_details', 'email', 'address']
    : ['first_name', 'last_name', 'date_of_birth', 'gender', 'patient_type', 'contact_details', 'email', 'address', 'branch_id'];
  Object.assign(row, pick(b, fields));
  const account = getDb().users.find(x => x.patient_id === id);
  if (account) Object.assign(account, { first_name: row.first_name, last_name: row.last_name, email: row.email });
  return patientView(row);
});
route('GET', '/patients/:id/emergency-contacts', m => {
  const id = Number(m[1]);
  if (!canSeePatient(me(), id)) forbidden();
  return getDb().emergency_contacts.filter(e => e.patient_id === id);
});
route('POST', '/patients/:id/emergency-contacts', (m, _p, b) => {
  const u = me();
  const id = Number(m[1]);
  findPatient(id) ?? notFound('Patient');
  if (!isFrontDesk(u) && !(u.role === 'patient' && u.patient_id === id)) forbidden();
  if (!text(b.contact_name) || !text(b.phone)) fail(400, 'Contact name and phone are required.');
  const d = getDb();
  const row = { emergency_contact_id: nextId(d.emergency_contacts, 'emergency_contact_id'), patient_id: id, contact_name: text(b.contact_name), relationship: text(b.relationship) || 'Other', phone: text(b.phone) };
  d.emergency_contacts.push(row);
  return row;
});
route('DELETE', '/emergency-contacts/:id', m => {
  const u = me();
  const d = getDb();
  const row = d.emergency_contacts.find(e => e.emergency_contact_id === Number(m[1])) ?? notFound('Emergency contact');
  if (!isFrontDesk(u) && !(u.role === 'patient' && u.patient_id === row.patient_id)) forbidden();
  d.emergency_contacts = d.emergency_contacts.filter(e => e !== row);
  return { message: 'Deleted' };
});
route('GET', '/patients/:id/insurance-policies', m => {
  const id = Number(m[1]);
  if (!canSeePatient(me(), id)) forbidden();
  return getDb().insurance_policies.filter(p => p.patient_id === id).map(policyView);
});


// Insurance 
route('GET', '/insurance-providers', () => { me(); return getDb().insurance_providers; });
route('POST', '/insurance-providers', (_m, _p, b) => {
  requireFrontDesk();
  const d = getDb();
  if (!text(b.provider_name)) fail(400, 'Provider name is required.');
  if (d.insurance_providers.some(p => p.provider_name.toLowerCase() === text(b.provider_name).toLowerCase())) fail(409, 'Provider already exists.');
  const row = { provider_id: nextId(d.insurance_providers, 'provider_id'), provider_name: text(b.provider_name), contact_details: text(b.contact_details) };
  d.insurance_providers.push(row);
  return row;
});
route('GET', '/insurance-policies', (_m, p) => {
  const u = me();
  let list = getDb().insurance_policies;
  if (u.role === 'patient') list = list.filter(x => x.patient_id === u.patient_id);
  else if (!isFrontDesk(u)) forbidden();
  if (p.patient_id) list = list.filter(x => x.patient_id === Number(p.patient_id));
  if (p.status) list = list.filter(x => x.status === p.status);
  return list.map(policyView);
});
route('POST', '/insurance-policies', (_m, _p, b) => {
  requireFrontDesk();
  const d = getDb();
  if (!findPatient(Number(b.patient_id))) notFound('Patient');
  if (!d.insurance_providers.some(p => p.provider_id === Number(b.provider_id))) notFound('Insurance provider');
  if (!b.start_date || !b.end_date || b.end_date < b.start_date) fail(400, 'End date must be on or after the start date.');
  const row = {
    policy_id: nextId(d.insurance_policies, 'policy_id'), patient_id: Number(b.patient_id), provider_id: Number(b.provider_id),
    policy_number: Number(b.policy_number), start_date: b.start_date, end_date: b.end_date, status: b.status || 'Active',
  };
  d.insurance_policies.push(row);
  return policyView(row);
});
route('PUT', '/insurance-policies/:id', (m, _p, b) => {
  requireFrontDesk();
  const row = getDb().insurance_policies.find(p => p.policy_id === Number(m[1])) ?? notFound('Policy');
  Object.assign(row, pick(b, ['status', 'start_date', 'end_date', 'policy_number']));
  return policyView(row);
});
route('GET', '/insurance-policies/:id/coverages', m => {
  const u = me();
  const pol = getDb().insurance_policies.find(p => p.policy_id === Number(m[1])) ?? notFound('Policy');
  if (!isFrontDesk(u) && !(u.role === 'patient' && u.patient_id === pol.patient_id)) forbidden();
  return getDb().insurance_coverages.filter(c => c.policy_id === pol.policy_id)
    .map(c => ({ ...c, treatment_name: findTreatment(c.treatment_id)?.treatment_name }));
});
route('POST', '/insurance-policies/:id/coverages', (m, _p, b) => {
  requireFrontDesk();
  const d = getDb();
  const pol = d.insurance_policies.find(p => p.policy_id === Number(m[1])) ?? notFound('Policy');
  if (!findTreatment(Number(b.treatment_id))) notFound('Treatment');
  const pct = Number(b.coverage_percentage);
  if (!(pct > 0 && pct <= 100)) fail(400, 'Coverage percentage must be between 1 and 100.');
  if (!(Number(b.maximum_amount) > 0)) fail(400, 'Maximum amount must be positive.');
  if (d.insurance_coverages.some(c => c.policy_id === pol.policy_id && c.treatment_id === Number(b.treatment_id))) {
    fail(409, 'This treatment is already covered by the policy.');
  }
  const row = { coverage_id: nextId(d.insurance_coverages, 'coverage_id'), policy_id: pol.policy_id, treatment_id: Number(b.treatment_id), coverage_percentage: pct, maximum_amount: Number(b.maximum_amount) };
  d.insurance_coverages.push(row);
  return { ...row, treatment_name: findTreatment(row.treatment_id)?.treatment_name };
});
route('GET', '/insurance-claims', (_m, p) => {
  const u = me();
  let list = getDb().insurance_claims;
  if (u.role === 'patient') list = list.filter(c => canSeeInvoice(u, findInvoice(c.invoice_id)!));
  else if (!isFrontDesk(u)) forbidden();
  if (p.status) list = list.filter(c => c.status === p.status);
  if (p.invoice_id) list = list.filter(c => c.invoice_id === Number(p.invoice_id));
  return list.map(claimView);
});
route('POST', '/insurance-claims', (_m, _p, b) => {
  requireFrontDesk();
  const d = getDb();
  const inv = findInvoice(Number(b.invoice_id)) ?? notFound('Invoice');
  const pol = d.insurance_policies.find(p => p.policy_id === Number(b.policy_id)) ?? notFound('Policy');
  const appt = findAppointment(inv.appointment_id)!;
  if (pol.patient_id !== appt.patient_id) fail(400, 'This policy does not belong to the invoiced patient.');
  if (pol.status !== 'Active' || pol.start_date > appt.appointment_date || pol.end_date < appt.appointment_date) {
    fail(400, 'The policy was not active on the appointment date.');
  }
  const amount = Number(b.claim_amount);
  if (!(amount > 0)) fail(400, 'Claim amount must be greater than zero.');
  if (amount > Number(inv.balance)) fail(400, `Claim cannot exceed the outstanding balance of Rs. ${Number(inv.balance).toLocaleString()}.`);
  const row = { claim_id: nextId(d.insurance_claims, 'claim_id'), invoice_id: inv.invoice_id, policy_id: pol.policy_id, claim_date: b.claim_date || seed.localDate(0), claim_amount: round2(amount), approved_amount: 0, status: 'Pending' };
  d.insurance_claims.push(row);
  return claimView(row);
});
route('PUT', '/insurance-claims/:id', (m, _p, b) => {
  requireFrontDesk();
  const claim = getDb().insurance_claims.find(c => c.claim_id === Number(m[1])) ?? notFound('Claim');
  if (!['Approved', 'Rejected', 'Pending'].includes(b.status)) fail(400, 'Invalid claim status.');
  if (claim.status !== 'Pending') fail(400, `This claim is already ${claim.status}.`);
  settleClaim(claim, b.status, num(b.approved_amount));
  return claimView(claim);
});


// Appointments 
route('GET', '/appointments', (_m, p) => {
  const u = me();
  let list = getDb().appointments.filter(a => canSeeAppointment(u, a));
  if (p.patient_id) list = list.filter(a => a.patient_id === Number(p.patient_id));
  if (p.doctor_id) list = list.filter(a => a.doctor_id === Number(p.doctor_id));
  if (p.branch_id) list = list.filter(a => a.branch_id === Number(p.branch_id));
  if (p.date) list = list.filter(a => a.appointment_date === p.date);
  if (p.status) list = list.filter(a => a.status === p.status);
  return list
    .slice()
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date) || a.start_time.localeCompare(b.start_time))
    .map(appointmentView);
});
route('GET', '/appointments/:id', m => appointmentView(getVisibleAppointment(Number(m[1]))));
route('POST', '/appointments', (_m, _p, b) => {
  const u = me();
  const d = getDb();
  if (u.role === 'doctor') forbidden('Doctors cannot book appointments. Please ask the front desk.');
  const patientId = u.role === 'patient' ? u.patient_id! : Number(b.patient_id);
  if (!findPatient(patientId)) notFound('Patient');
  const doctor = findDoctor(Number(b.doctor_id)) ?? notFound('Doctor');
  if (!b.appointment_date || !b.start_time || !b.end_time) fail(400, 'Date, start time and end time are required.');

  const type = b.appointment_type || 'Consultation';
  const isWalkIn = type === 'Walk-in' || type === 'Emergency';
  if (u.role === 'patient' && isWalkIn) forbidden('Walk-in and emergency visits are registered by clinic staff.');
  if (isWalkIn) {
    if (b.appointment_date !== seed.localDate(0)) fail(400, 'Walk-in and emergency appointments must be for today.');
  } else {
    assertNotPast(b.appointment_date, b.start_time);
  }
  if (b.treatment_id && !findTreatment(Number(b.treatment_id))) notFound('Treatment');

  const row = {
    appointment_id: nextId(d.appointments, 'appointment_id'),
    patient_id: patientId,
    doctor_id: doctor.doctor_id,
    branch_id: findStaff(doctor.staff_id)!.branch_id, // a doctor works at one branch
    appointment_date: b.appointment_date,
    start_time: String(b.start_time).slice(0, 5),
    end_time: String(b.end_time).slice(0, 5),
    appointment_type: type,
    created_by: u.username || 'staff',
    treatment_id: num(b.treatment_id) ?? null,
    original_appointment_id: null,
    status: 'Scheduled',
  };
  assertNoOverlap(row);
  d.appointments.push(row);
  return appointmentView(row);
});
route('PUT', '/appointments/:id/cancel', m => {
  const u = me();
  const a = getVisibleAppointment(Number(m[1]));
  if (!canManageAppointment(u, a) && !(u.role === 'doctor' && a.doctor_id === u.doctor_id)) forbidden();
  assertScheduled(a, 'cancelled');
  a.status = 'Cancelled';
  return appointmentView(a);
});
route('PUT', '/appointments/:id/complete', m => {
  const u = me();
  const a = getVisibleAppointment(Number(m[1]));
  if (!isFrontDesk(u) && !(u.role === 'doctor' && a.doctor_id === u.doctor_id)) forbidden('Only the treating doctor or clinic staff can complete an appointment.');
  assertScheduled(a, 'completed');
  if (a.appointment_date > seed.localDate(0)) fail(400, 'A future appointment cannot be marked as completed.');
  a.status = 'Completed';
  // Record the booked service as the first treatment so the visit is billable.
  const d = getDb();
  if (a.treatment_id && !d.appointment_treatments.some(t => t.appointment_id === a.appointment_id)) {
    d.appointment_treatments.push({ appointment_treatment_id: nextId(d.appointment_treatments, 'appointment_treatment_id'), appointment_id: a.appointment_id, treatment_id: a.treatment_id, quantity: 1 });
  }
  return appointmentView(a);
});
route('POST', '/appointments/:id/reschedule', (m, _p, b) => {
  const u = me();
  const d = getDb();
  const a = getVisibleAppointment(Number(m[1]));
  if (!canManageAppointment(u, a)) forbidden('Only the patient or clinic staff can reschedule this appointment.');
  assertScheduled(a, 'rescheduled');
  if (!b.appointment_date || !b.start_time || !b.end_time) fail(400, 'New date, start time and end time are required.');
  assertNotPast(b.appointment_date, b.start_time);
  const row = {
    ...a,
    appointment_id: nextId(d.appointments, 'appointment_id'),
    appointment_date: b.appointment_date,
    start_time: String(b.start_time).slice(0, 5),
    end_time: String(b.end_time).slice(0, 5),
    created_by: u.username || 'staff',
    original_appointment_id: a.appointment_id,
    status: 'Scheduled',
  };
  assertNoOverlap(row, [a.appointment_id]);
  a.status = 'Cancelled';
  d.appointments.push(row);
  return appointmentView(row);
});
route('GET', '/appointments/:id/notes', m => {
  const a = getVisibleAppointment(Number(m[1]));
  return getDb().notes.filter(n => n.appointment_id === a.appointment_id);
});
route('POST', '/appointments/:id/notes', (m, _p, b) => {
  const u = me();
  const a = getVisibleAppointment(Number(m[1]));
  if (!(u.role === 'doctor' && a.doctor_id === u.doctor_id) && !isManagement(u)) forbidden('Only the treating doctor can add consultation notes.');
  if (a.status === 'Cancelled') fail(400, 'Notes cannot be added to a cancelled appointment.');
  if (!text(b.note_content)) fail(400, 'Note cannot be empty.');
  const d = getDb();
  const row = { note_id: nextId(d.notes, 'note_id'), appointment_id: a.appointment_id, note_content: text(b.note_content), created_at: new Date().toISOString() };
  d.notes.push(row);
  return row;
});
route('GET', '/appointments/:id/treatments', m => {
  const a = getVisibleAppointment(Number(m[1]));
  return getDb().appointment_treatments.filter(t => t.appointment_id === a.appointment_id).map(t => {
    const tr = findTreatment(t.treatment_id);
    return { ...t, treatment_name: tr?.treatment_name, service_code: tr?.service_code, unit_price: tr?.standard_price };
  });
});
const assertCanEditTreatments = (a: Row) => {
  const u = me();
  if (!(u.role === 'doctor' && a.doctor_id === u.doctor_id) && !isFrontDesk(u)) forbidden('Only the treating doctor or clinic staff can record treatments.');
  if (a.status !== 'Completed') fail(400, 'Mark the appointment as completed before recording treatments.');
  if (invoiceForAppointment(a.appointment_id)) fail(400, 'Treatments are locked because an invoice has already been generated.');
};
route('POST', '/appointments/:id/treatments', (m, _p, b) => {
  const a = getVisibleAppointment(Number(m[1]));
  assertCanEditTreatments(a);
  const t = findTreatment(Number(b.treatment_id)) ?? notFound('Treatment');
  const qty = Math.max(1, Number(b.quantity) || 1);
  const d = getDb();
  const existing = d.appointment_treatments.find(x => x.appointment_id === a.appointment_id && x.treatment_id === t.treatment_id);
  if (existing) existing.quantity += qty;
  else d.appointment_treatments.push({ appointment_treatment_id: nextId(d.appointment_treatments, 'appointment_treatment_id'), appointment_id: a.appointment_id, treatment_id: t.treatment_id, quantity: qty });
  return { message: 'Treatment recorded' };
});
route('DELETE', '/appointments/:id/treatments/:tid', m => {
  const a = getVisibleAppointment(Number(m[1]));
  assertCanEditTreatments(a);
  const d = getDb();
  d.appointment_treatments = d.appointment_treatments.filter(x => !(x.appointment_id === a.appointment_id && x.appointment_treatment_id === Number(m[2])));
  return { message: 'Treatment removed' };
});


// Invoices & payments 
route('GET', '/invoices', (_m, p) => {
  const u = me();
  if (!isFrontDesk(u) && u.role !== 'patient') forbidden();
  let list = getDb().invoices.filter(i => canSeeInvoice(u, i)).map(invoiceView);
  if (p.patient_id) list = list.filter(i => i.patient_id === Number(p.patient_id));
  if (p.appointment_id) list = list.filter(i => i.appointment_id === Number(p.appointment_id));
  if (p.status) {
    const statuses = String(p.status).split(',');
    list = list.filter(i => statuses.includes(i.status));
  }
  return list.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date) || b.invoice_id - a.invoice_id);
});
route('GET', '/invoices/:id', m => invoiceView(getVisibleInvoice(Number(m[1]))));
route('POST', '/invoices', (_m, _p, b) => {
  const u = requireFrontDesk();
  const appt = findAppointment(Number(b.appointment_id)) ?? notFound('Appointment');
  const inv = generateInvoice(appt, u.staff_id || 3, seed.localDate(0));
  return invoiceView(inv);
});
route('GET', '/invoices/:id/items', m => {
  const inv = getVisibleInvoice(Number(m[1]));
  return getDb().invoice_items.filter(i => i.invoice_id === inv.invoice_id).map(invoiceItemView);
});
route('GET', '/invoices/:id/payments', m => {
  const inv = getVisibleInvoice(Number(m[1]));
  return getDb().payments.filter(p => p.invoice_id === inv.invoice_id);
});
route('POST', '/invoices/:id/payments', (m, _p, b) => {
  const u = requireFrontDesk();
  const inv = findInvoice(Number(m[1])) ?? notFound('Invoice');
  recordPayment(inv, Number(b.amount), b.method || 'Cash', u.username || 'staff', seed.localDate(0));
  return invoiceView(inv);
});
route('GET', '/payments', () => {
  requireFrontDesk();
  return getDb().payments.slice().sort((a, b) => b.payment_id - a.payment_id).map(paymentView);
});
route('GET', '/doctor-payments', (_m, p) => {
  const u = me();
  let list = getDb().doctor_payments;
  if (u.role === 'doctor') list = list.filter(x => x.doctor_id === u.doctor_id);
  else if (!isFrontDesk(u)) forbidden();
  if (p.doctor_id) list = list.filter(x => x.doctor_id === Number(p.doctor_id));
  return list.map(x => ({ ...x, doctor_name: findDoctor(x.doctor_id)?.doctor_name }));
});


// Reports (management only) 
route('GET', '/reports/branch-appointment-summary', (_m, p) => { requireManagement(); return reportBranchSummary(p); });
route('GET', '/reports/appointments-summary', (_m, p) => { requireManagement(); return reportBranchSummary(p); });
route('GET', '/reports/doctor-revenue', (_m, p) => { requireManagement(); return reportDoctorRevenue(p); });
route('GET', '/reports/outstanding-patients', () => { requireManagement(); return reportOutstanding(); });
route('GET', '/reports/outstanding-balances', () => { requireManagement(); return reportOutstanding(); });
route('GET', '/reports/treatment-counts', (_m, p) => { requireManagement(); return reportTreatmentCounts(p); });
route('GET', '/reports/treatments-by-category', (_m, p) => { requireManagement(); return reportTreatmentCounts(p); });
route('GET', '/reports/insurance-summary', (_m, p) => { requireManagement(); return reportInsuranceSummary(p); });
route('GET', '/reports/insurance-vs-out-of-pocket', (_m, p) => { requireManagement(); return reportInsuranceSummary(p); });


/**
 * Handle one API request against the local store. Throws LocalHttpError.
 * Every successful write is persisted.
 */
export function handleLocalRequest(method: string, url: string, params: Row = {}, body: Row = {}): unknown {
  getDb();
  const path = url.split('?')[0].replace(/\/+$/, '') || '/';
  const query = { ...Object.fromEntries(new URLSearchParams(url.split('?')[1] || '')), ...params };
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') delete query[key];
  }
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = path.match(re);
    if (!match) continue;
    const result = handler(match, query, body || {});
    if (method !== 'GET') save();
    return clone(result);
  }
  return fail(404, `No handler for ${method} ${path}`);
}
