import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  appointmentService, patientService, doctorService, branchService, treatmentService,
  apiErrorMessage, Appointment, Patient, Doctor, Branch, Treatment
} from '../services/api';
import { localDate } from '../services/mockData';

const typeBadge = (type: string) => {
  if (type === 'Emergency' || type === 'Walk-in') return <span className="badge badge-warning">{type}</span>;
  return <span className="badge bad  ge-info">{type}</span>;
};

export const statusBadge = (status?: string) => {
  if (status === 'Completed') return <span className="badge badge-success">Completed</span>;
  if (status === 'Cancelled') return <span className="badge badge-danger">Cancelled</span>;
  return <span className="badge badge-primary">Scheduled</span>;
};

const nowHHMM = (offsetMinutes = 0) => {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const emptyForm = (walkIn: boolean, patientId?: number, doctorId?: number): Partial<Appointment> => ({
  patient_id: patientId,
  doctor_id: doctorId,
  appointment_date: localDate(0),
  start_time: walkIn ? nowHHMM() : '09:00',
  end_time: walkIn ? nowHHMM(30) : '09:30',
  appointment_type: walkIn ? 'Walk-in' : 'Consultation',
});

export default function Appointments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [form, setForm] = useState<Partial<Appointment>>(emptyForm(false));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [listError, setListError] = useState('');

  useEffect(() => {
    loadData();
    const pid = searchParams.get('patient_id') ? Number(searchParams.get('patient_id')) : undefined;
    const did = searchParams.get('doctor_id') ? Number(searchParams.get('doctor_id')) : undefined;
    const isWalkIn = searchParams.get('walkin') === '1';
    if (pid || did || isWalkIn || searchParams.get('new') === '1') {
      openModal(isWalkIn, pid, did);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appts, pts, docs, brs, txs] = await Promise.all([
        appointmentService.getAll(),
        patientService.getAll(),
        doctorService.getAll(),
        branchService.getAll(),
        treatmentService.getAll(),
      ]);
      setAppointments(appts);
      setPatients(pts);
      setDoctors(docs);
      setBranches(brs);
      setTreatments(txs);
    } catch (err) {
      setListError(apiErrorMessage(err, 'Could not load appointments.'));
    } finally { setIsLoading(false); }
  };

  const openModal = (asWalkIn: boolean, patientId?: number, doctorId?: number) => {
    setWalkIn(asWalkIn);
    setForm(emptyForm(asWalkIn, patientId, doctorId));
    setError('');
    setShowModal(true);
  };

  const filtered = appointments.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || (a.patient_name || '').toLowerCase().includes(q) || (a.doctor_name || '').toLowerCase().includes(q);
    const matchDate = !filterDate || a.appointment_date === filterDate;
    const matchBranch = !filterBranch || String(a.branch_id) === filterBranch;
    const matchType = !filterType || a.appointment_type === filterType;
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchDate && matchBranch && matchType && matchStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await appointmentService.create(form);
      setSuccessMsg(`Appointment #${created.appointment_id} booked for ${created.patient_name} with ${created.doctor_name} on ${created.appointment_date} at ${created.start_time}.`);
      setShowModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to book appointment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (appt: Appointment) => {
    if (!confirm(`Cancel appointment #${appt.appointment_id} for ${appt.patient_name}?`)) return;
    try {
      await appointmentService.cancel(appt.appointment_id);
      setSuccessMsg(`Appointment #${appt.appointment_id} was cancelled.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      alert(apiErrorMessage(err, 'Cancellation failed.'));
    }
  };

  const selectedDoctor = doctors.find(d => d.doctor_id === form.doctor_id);
  const today = localDate(0);
  const todayCount = appointments.filter(a => a.appointment_date === today && a.status !== 'Cancelled').length;

  return (
    <div className="animate-[fade-in_0.3s_ease]">
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {listError && <div className="alert alert-error">{listError}</div>}

      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: "Today's", value: todayCount, color: 'text-primary' },
          { label: 'Scheduled', value: appointments.filter(a => a.status === 'Scheduled').length, color: 'text-primary-light' },
          { label: 'Completed', value: appointments.filter(a => a.status === 'Completed').length, color: 'text-primary-dark' },
          { label: 'Cancelled', value: appointments.filter(a => a.status === 'Cancelled').length, color: 'text-danger' },
          { label: 'Emergency / Walk-in', value: appointments.filter(a => a.appointment_type === 'Emergency' || a.appointment_type === 'Walk-in').length, color: 'text-warning' },
        ].map(s => (
          <div className="bg-white rounded-[8px] py-3.5 px-5 border border-gray-100 flex-1 min-w-30 shadow-sm" key={s.label}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <div>
          <h2 className="text-gray-900 m-0">Appointments</h2>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {appointments.length} records</p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <input placeholder="Search patient or doctor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <input type="date" className="form-control w-auto" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          <select className="form-control w-auto py-2 px-3" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option>Scheduled</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          <select className="form-control w-auto py-2 px-3" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
          </select>
          <select className="form-control w-auto py-2 px-3" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option>Consultation</option>
            <option>Follow-up</option>
            <option>Emergency</option>
            <option>Walk-in</option>
          </select>
          <button className="btn btn-danger" onClick={() => openModal(true)}>Walk-in</button>
          <button className="btn btn-primary" onClick={() => openModal(false)}>
            Book Appointment
          </button>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-13 mb-2 rounded-md" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No appointments found</p>
            <button className="btn btn-primary" onClick={() => openModal(false)}>Book Appointment</button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(appt => (
                  <tr className="cursor-pointer" key={appt.appointment_id} onClick={() => navigate(`/appointments/${appt.appointment_id}`)}>
                    <td className="text-gray-400 text-xs">#{appt.appointment_id}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar text-2xs size-7">
                          {(appt.patient_name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{appt.patient_name}</span>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">{appt.doctor_name}</td>
                    <td>
                      <div className="text-sm font-medium">{appt.appointment_date}</div>
                      <div className="text-xs text-gray-400">{appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}</div>
                    </td>
                    <td>{typeBadge(appt.appointment_type)}</td>
                    <td>{statusBadge(appt.status)}</td>
                    <td><span className="tag">{appt.branch_name}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/appointments/${appt.appointment_id}`)}>View</button>
                        {appt.status === 'Scheduled' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(appt)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{walkIn ? 'Register Emergency / Walk-in' : 'Book New Appointment'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {walkIn && (
                  <div className="alert alert-info">Walk-ins are created directly by staff for today, without prior booking. The doctor must be free at the chosen time.</div>
                )}
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Patient *</label>
                    <select className="form-control" required value={form.patient_id || ''} onChange={e => setForm({ ...form, patient_id: Number(e.target.value) || undefined })}>
                      <option value="">Select patient...</option>
                      {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name} (#{p.patient_id})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor *</label>
                    <select className="form-control" required value={form.doctor_id || ''} onChange={e => setForm({ ...form, doctor_id: Number(e.target.value) || undefined })}>
                      <option value="">Select doctor...</option>
                      {doctors.map(d => (
                        <option key={d.doctor_id} value={d.doctor_id}>
                          {d.doctor_name} — {d.specialties?.map(s => s.specialty_name).join(', ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" required min={today} disabled={walkIn}
                      value={form.appointment_date || ''} onChange={e => setForm({ ...form, appointment_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch</label>
                    <input className="form-control" disabled value={selectedDoctor?.branch_name || 'Set by the selected doctor'} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input type="time" className="form-control" required value={form.start_time || ''} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input type="time" className="form-control" required value={form.end_time || ''} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Appointment Type *</label>
                    <select className="form-control" value={form.appointment_type || 'Consultation'} onChange={e => setForm({ ...form, appointment_type: e.target.value })}>
                      {walkIn ? (
                        <>
                          <option>Walk-in</option>
                          <option>Emergency</option>
                        </>
                      ) : (
                        <>
                          <option>Consultation</option>
                          <option>Follow-up</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service</label>
                    <select className="form-control" value={form.treatment_id || ''} onChange={e => setForm({ ...form, treatment_id: Number(e.target.value) || undefined })}>
                      <option value="">Select service...</option>
                      {treatments.map(t => <option key={t.treatment_id} value={t.treatment_id}>{t.treatment_name} (Rs. {Number(t.standard_price).toLocaleString()})</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner border-2 size-3.5" /> Saving...</> : walkIn ? 'Register Walk-in' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
