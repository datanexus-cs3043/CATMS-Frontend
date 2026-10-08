import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  appointmentService,
  patientService,
  doctorService,
  invoiceService,
  branchService,
  Appointment,
  Branch,
} from '../services/api';
import { localDate } from '../utils/date';
import { HeroSlider, Slide } from '../components/HeroSlider';
import { statusBadge } from './Appointments';

import {
  CalendarPlus,
  Zap,
  UserPlus,
  Receipt,
  ShieldCheck,
  BarChart3,
  Search,
  Calendar,
  Users,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

interface DashStats {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  pendingInvoices: number;
  upcoming: number;
  outstanding: number;
}

const StatCard: React.FC<{ label: string; value: string | number; hint?: string; onClick?: () => void }> = ({ label, value, hint, onClick }) => (
  <div
    className={`stat-card ${onClick ? 'stat-card-link' : ''}`}
    onClick={onClick}
    onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {hint && <div className="text-xs text-primary mt-2">{hint}</div>}
  </div>
);

type Action = { label: string; desc: string; path: string; roles: string[] };

const ACTIONS: Action[] = [
  { label: 'Book an appointment', desc: 'Schedule a patient with a doctor', path: '/appointments?new=1', roles: ['admin', 'branch_manager', 'receptionist_cashier'] },
  { label: 'Register a walk-in', desc: 'Emergency or same-day visit, no prior booking', path: '/appointments?walkin=1', roles: ['admin', 'branch_manager', 'receptionist_cashier'] },
  { label: 'Register a patient', desc: 'New record, shared across branches', path: '/patients?new=1', roles: ['admin', 'branch_manager', 'receptionist_cashier'] },
  { label: 'Create an invoice', desc: 'Bill a completed appointment', path: '/invoices?new=1', roles: ['admin', 'branch_manager', 'receptionist_cashier'] },
  { label: 'Review insurance claims', desc: 'Approve or reject pending claims', path: '/insurance', roles: ['admin', 'branch_manager', 'receptionist_cashier'] },
  { label: 'Management reports', desc: 'Revenue, dues, treatments, coverage', path: '/reports', roles: ['admin', 'branch_manager'] },
  { label: 'Book an appointment', desc: 'Choose a doctor and a time that suits you', path: '/my-appointments?book=1', roles: ['patient'] },
  { label: 'Find a doctor', desc: 'Search by name or specialty', path: '/doctors', roles: ['patient'] },
  { label: 'My bills', desc: 'See what is paid and what is due', path: '/my-bills', roles: ['patient'] },
  { label: "Today's schedule", desc: 'Your appointments and consultations', path: '/my-appointments', roles: ['doctor'] },
  { label: 'My patients', desc: 'Records of patients under your care', path: '/my-patients', roles: ['doctor'] },
  { label: 'My profile', desc: 'Contact details, specialties and bio', path: '/my-profile', roles: ['doctor', 'patient'] },
];

const SLIDES: Record<string, Slide[]> = {
  staff: [
    { eyebrow: 'Front desk', title: 'Every branch, one appointment book.', body: 'Book, reschedule and register walk-ins in seconds. Double bookings for a doctor are blocked automatically.' },
    { eyebrow: 'Billing', title: 'From treatment to invoice without re-typing.', body: 'Invoices are built from the treatments recorded at the visit, with insurance coverage applied per policy.' },
    { eyebrow: 'Patient records', title: 'Registered in Galle, seen in Colombo.', body: 'Patient details, emergency contacts and insurance are available at every MedSync branch.' },
  ],
  doctor: [
    { eyebrow: 'Your practice', title: 'Your schedule, and only yours.', body: 'See the day ahead, complete consultations and record treatments from the catalogue.' },
    { eyebrow: 'Clinical notes', title: 'Notes that stay with the visit.', body: 'Consultation notes and treatments are kept against each appointment for your follow-ups.' },
    { eyebrow: 'Your profile', title: 'Patients see what you publish.', body: 'Keep your specialties and contact details current — changes appear across the system straight away.' },
  ],
  patient: [
    { eyebrow: 'Your care', title: 'Book a specialist in a few taps.', body: 'Search doctors by name or specialty across Colombo, Kandy and Galle and choose a time that suits you.' },
    { eyebrow: 'Clear billing', title: 'Know what you owe, and what insurance paid.', body: 'Each visit shows whether it is paid, with insurance deductions itemised on your bill.' },
    { eyebrow: 'One record', title: 'Visit any branch — your history comes with you.', body: 'Your appointments, emergency contacts and insurance details are shared across MedSync.' },
  ],
};

const getActionIcon = (label: string) => {
  switch (label) {
    case 'Book an appointment':
      return <CalendarPlus size={18} />;
    case 'Register a walk-in':
      return <Zap size={18} />;
    case 'Register a patient':
      return <UserPlus size={18} />;
    case 'Create an invoice':
    case 'My bills':
      return <Receipt size={18} />;
    case 'Review insurance claims':
      return <ShieldCheck size={18} />;
    case 'Management reports':
      return <BarChart3 size={18} />;
    case 'Find a doctor':
      return <Search size={18} />;
    case "Today's schedule":
      return <Calendar size={18} />;
    case 'My patients':
      return <Users size={18} />;
    case 'My profile':
      return <UserCheck size={18} />;
    default:
      return <CalendarPlus size={18} />;
  }
};

export default function Dashboard() {
  const { user, isAdmin, isCashier, isDoctor, isPatient } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashStats>({ totalPatients: 0, totalDoctors: 0, todayAppointments: 0, pendingInvoices: 0, upcoming: 0, outstanding: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = localDate(0);
  const staffView = isAdmin || isCashier;
  const personalView = isDoctor || isPatient;
  const firstName = user?.first_name || user?.username || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // The API scopes every list to what the signed-in user may see.
        const [patients, doctors, appts, invoices, brs] = await Promise.allSettled([
          isPatient ? Promise.resolve([]) : patientService.getAll(),
          isDoctor ? Promise.resolve([]) : doctorService.getAll(),
          appointmentService.getAll(),
          isDoctor ? Promise.resolve([]) : invoiceService.getAll({ status: 'Unpaid,Partially Paid' }),
          branchService.getAll(),
        ]);
        const list = appts.status === 'fulfilled' ? appts.value : [];
        const invs = invoices.status === 'fulfilled' ? invoices.value : [];
        setStats({
          totalPatients: patients.status === 'fulfilled' ? patients.value.length : 0,
          totalDoctors: doctors.status === 'fulfilled' ? doctors.value.length : 0,
          todayAppointments: list.filter(a => a.appointment_date === today && a.status !== 'Cancelled').length,
          pendingInvoices: invs.length,
          upcoming: list.filter(a => a.status === 'Scheduled' && a.appointment_date >= today).length,
          outstanding: invs.reduce((s, i) => s + Number(i.balance), 0),
        });
        setAppointments([
          ...list.filter(a => a.appointment_date >= today)
            .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)),
          ...list.filter(a => a.appointment_date < today),
        ].slice(0, 8));
        if (brs.status === 'fulfilled') setBranches(brs.value);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [today, user?.user_id]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const slides = SLIDES[isDoctor ? 'doctor' : isPatient ? 'patient' : 'staff'];
  const heroActions = staffView ? (
    <>
      <button className="btn btn-light" onClick={() => navigate('/appointments?new=1')}>Book appointment</button>
      <button className="btn btn-outline-light" onClick={() => navigate('/appointments?walkin=1')}>Register walk-in</button>
    </>
  ) : isPatient ? (
    <>
      <button className="btn btn-light" onClick={() => navigate('/my-appointments?book=1')}>Book appointment</button>
      <button className="btn btn-outline-light" onClick={() => navigate('/doctors')}>Find a doctor</button>
    </>
  ) : (
    <>
      <button className="btn btn-light" onClick={() => navigate('/my-appointments')}>Open my schedule</button>
      <button className="btn btn-outline-light" onClick={() => navigate('/my-profile')}>Edit profile</button>
    </>
  );

  const actions = ACTIONS.filter(a => a.roles.includes(user?.role || ''));

  return (
    <div>
      <div className="mb-4.5">
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h2 className="text-[26px] mt-0.5">
          {greeting()}, {isDoctor ? `Dr. ${user?.last_name || firstName}` : firstName}
        </h2>
      </div>

      <HeroSlider slides={slides} actions={heroActions} />

      {isLoading ? (
        <div className="stats-grid">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24" />)}</div>
      ) : (
        <div className="stats-grid">
          {staffView && <StatCard label="Registered patients" value={stats.totalPatients} onClick={() => navigate('/patients')} />}
          {isDoctor && <StatCard label="My patients" value={stats.totalPatients} onClick={() => navigate('/my-patients')} />}
          {(staffView || isPatient) && <StatCard label={isPatient ? 'Doctors available' : 'Doctors on staff'} value={stats.totalDoctors} onClick={() => navigate('/doctors')} />}
          <StatCard label={personalView ? 'My appointments today' : 'Appointments today'} value={stats.todayAppointments} onClick={() => navigate(personalView ? '/my-appointments' : '/appointments')} />
          {personalView && <StatCard label="Upcoming appointments" value={stats.upcoming} onClick={() => navigate('/my-appointments')} />}
          {staffView && <StatCard label="Invoices awaiting payment" value={stats.pendingInvoices} onClick={() => navigate('/invoices')} />}
          {isPatient && (
            <StatCard
              label="Balance due"
              value={`Rs. ${stats.outstanding.toLocaleString()}`}
              hint={stats.outstanding > 0 ? 'View bills' : undefined}
              onClick={() => navigate('/my-bills')}
            />
          )}
        </div>
      )}

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick actions</h3>
          </div>
          <div className="action-list">
            {actions.map(a => (
              <button
                key={a.path + a.label}
                className="action-item"
                onClick={() => navigate(a.path)}
              >
                <div className="action-item-left">
                  <div className="action-icon">
                    {getActionIcon(a.label)}
                  </div>
                  <div className="action-item-content">
                    <span className="action-item-title">{a.label}</span>
                    <span className="action-item-desc">{a.desc}</span>
                  </div>
                </div>
                <ChevronRight className="action-item-arrow" size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title">{personalView ? 'My appointments' : 'Upcoming and recent appointments'}</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(personalView ? '/my-appointments' : '/appointments')}>View all</button>
          </div>
          {isLoading ? (
            <div className="card-body">{[1, 2, 3].map(i => <div key={i} className="skeleton h-11 mb-2" />)}</div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No appointments yet</p>
              <p className="empty-state-desc">Appointments will appear here once they are booked.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    {!isPatient && <th>Patient</th>}
                    {!isDoctor && <th>Doctor</th>}
                    <th>Branch</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(appt => (
                    <tr className="cursor-pointer" key={appt.appointment_id} onClick={() => navigate(`/appointments/${appt.appointment_id}`)}>
                      <td className="whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {appt.appointment_date === today ? 'Today' : new Date(appt.appointment_date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-500">{appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}</div>
                      </td>
                      {!isPatient && <td className="font-medium">{appt.patient_name}</td>}
                      {!isDoctor && <td>{appt.doctor_name}</td>}
                      <td className="text-gray-500">{appt.branch_name?.replace('MedSync ', '')}</td>
                      <td>{statusBadge(appt.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="branch-strip">
        {branches.map(b => (
          <div key={b.branch_id} className="branch-tile">
            <div className="eyebrow">Branch</div>
            <div className="branch-tile-name">{b.branch_name}</div>
            <div className="branch-tile-meta">{b.location} · {b.contact_details}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
