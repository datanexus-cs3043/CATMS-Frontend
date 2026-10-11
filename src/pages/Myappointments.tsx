import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  appointmentService, doctorService, treatmentService, specialtyService, apiErrorMessage,
  Appointment, Doctor, Treatment, Specialty,
} from '../services/api';
import { localDate } from '../utils/date';

const statusColor: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: '#f3f8fd', color: '#1d6fb8' },
  Completed: { bg: '#eef8f3', color: '#1c7c54' },
  Cancelled: { bg: '#fdf1f0', color: '#c2372f' },
};

const paymentColor: Record<string, { bg: string; color: string; label: string }> = {
  Paid: { bg: '#eef8f3', color: '#1c7c54', label: 'Paid' },
  'Partially Paid': { bg: '#fdf6ea', color: '#b86e0c', label: 'Partially Paid' },
  Unpaid: { bg: '#fdf1f0', color: '#c2372f', label: 'Unpaid' },
  'Not invoiced': { bg: '#eef2f7', color: '#5f7188', label: 'Awaiting bill' },
};

const emptyBooking = (doctorId = '') => ({
  doctor_id: doctorId, treatment_id: '',
  appointment_date: '', start_time: '09:00', end_time: '09:30',
  appointment_type: 'Consultation',
});

export default function MyAppointments() {
  const { user, isDoctor, isPatient } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [bookForm, setBookForm] = useState(emptyBooking());
  const [submitting, setSubmitting] = useState(false);
  const [bookError, setBookError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    load();
    if (isPatient && (searchParams.get('book') === '1' || searchParams.get('doctor_id'))) {
      openBooking(searchParams.get('doctor_id') || '');
      setSearchParams({}, { replace: true });
    }
  }, [user?.user_id]);

  const load = async () => {
    setIsLoading(true);
    try {
      // The API only returns this user's own appointments.
      const [appts, docs, treats, specs] = await Promise.allSettled([
        appointmentService.getAll(),
        isPatient ? doctorService.getAll() : Promise.resolve([]),
        isPatient ? treatmentService.getAll() : Promise.resolve([]),
        isPatient ? specialtyService.getAll() : Promise.resolve([]),
      ]);
      if (appts.status === 'fulfilled') setAppointments(appts.value);
      if (docs.status === 'fulfilled') setDoctors(docs.value);
      if (treats.status === 'fulfilled') setTreatments(treats.value);
      if (specs.status === 'fulfilled') setSpecialties(specs.value);
    } finally { setIsLoading(false); }
  };

  const openBooking = (doctorId = '') => {
    setBookForm(emptyBooking(doctorId));
    setDoctorSearch('');
    setDoctorSpecialty('');
    setBookError('');
    setShowBookModal(true);
  };

  const filtered = appointments.filter(a =>
    (!filterStatus || a.status === filterStatus) && (!filterDate || a.appointment_date === filterDate));

  const today = localDate(0);
  const tomorrow = localDate(1);
  const upcoming = appointments.filter(a => a.appointment_date >= today && a.status === 'Scheduled').length;
  const completed = appointments.filter(a => a.status === 'Completed').length;
  const cancelled = appointments.filter(a => a.status === 'Cancelled').length;

  const doctorOptions = doctors.filter(d => {
    const q = doctorSearch.trim().toLowerCase();
    const matchSearch = !q || d.doctor_name.toLowerCase().includes(q) ||
      (d.specialties || []).some(s => s.specialty_name.toLowerCase().includes(q));
    const matchSpec = !doctorSpecialty || (d.specialties || []).some(s => String(s.specialty_id) === doctorSpecialty);
    return (matchSearch && matchSpec) || String(d.doctor_id) === bookForm.doctor_id;
  });
  const selectedDoctor = doctors.find(d => String(d.doctor_id) === bookForm.doctor_id);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setBookError('');
    try {
      const created = await appointmentService.create({
        doctor_id: Number(bookForm.doctor_id),
        treatment_id: bookForm.treatment_id ? Number(bookForm.treatment_id) : undefined,
        appointment_date: bookForm.appointment_date,
        start_time: bookForm.start_time,
        end_time: bookForm.end_time,
        appointment_type: bookForm.appointment_type,
      });
      setSuccessMsg(`Appointment booked with ${created.doctor_name} on ${created.appointment_date} at ${created.start_time} (${created.branch_name}).`);
      setShowBookModal(false);
      setTimeout(() => setSuccessMsg(''), 5000);
      load();
    } catch (err) {
      setBookError(apiErrorMessage(err, 'Booking failed. Please try again.'));
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (appt: Appointment) => {
    if (!confirm(`Cancel your appointment on ${appt.appointment_date} at ${appt.start_time}?`)) return;
    try {
      await appointmentService.cancel(appt.appointment_id);
      setSuccessMsg('Appointment cancelled.');
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
    } catch (err) {
      alert(apiErrorMessage(err, 'Cancellation failed.'));
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
            {isDoctor ? 'My Appointments' : 'My Appointments'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
            {isDoctor
              ? `Your consultation schedule — ${appointments.length} total`
              : `Your appointment history — ${appointments.length} total`}
          </p>
        </div>
        <div className="page-actions">
          <input type="date" className="form-control" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} title="Filter by date" />
          <select className="form-control" style={{ width: 'auto', padding: '8px 12px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option>Scheduled</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          {(filterDate || filterStatus) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDate(''); setFilterStatus(''); }}>Clear</button>
          )}
          {isPatient && (
            <button className="btn btn-primary" onClick={() => openBooking()}>
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{successMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Upcoming', value: upcoming, color: '#1d6fb8', status: 'Scheduled' },
          { label: 'Completed', value: completed, color: '#1c7c54', status: 'Completed' },
          { label: 'Cancelled', value: cancelled, color: '#c2372f', status: 'Cancelled' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setFilterStatus(s.status)}>
            <div style={{ fontSize: 26, fontWeight: 600, color: s.color, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <p className="empty-state-title">No appointments found</p>
            <p className="empty-state-desc">
              {isPatient ? 'Book your first appointment using the button above.' : 'No appointments match the current filters.'}
            </p>
            {isPatient && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => openBooking()}>Book Appointment</button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {isPatient && <th>Doctor</th>}
                  {isDoctor && <th>Patient</th>}
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  {isPatient && <th>Payment</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(appt => {
                  const sc = statusColor[appt.status] || { bg: '#eef2f7', color: '#5f7188' };
                  const pc = appt.payment_status ? paymentColor[appt.payment_status] : undefined;
                  return (
                    <tr key={appt.appointment_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gray-400)', fontSize: 12 }}>#{appt.appointment_id}</td>
                      {isPatient && (
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{appt.doctor_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{appt.branch_name}</div>
                        </td>
                      )}
                      {isDoctor && (
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{appt.patient_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{appt.treatment_name || appt.appointment_type}</div>
                        </td>
                      )}
                      <td>
                        <div style={{ fontWeight: 500 }}>{appt.appointment_date}</div>
                        {appt.appointment_date === today && <div style={{ fontSize: 11, color: '#1d6fb8', fontWeight: 700 }}>Today</div>}
                        {appt.appointment_date === tomorrow && <div style={{ fontSize: 11, color: '#b86e0c', fontWeight: 700 }}>Tomorrow</div>}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}</td>
                      <td><span className="tag">{appt.appointment_type || 'Consultation'}</span></td>
                      <td>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>{appt.status}</span>
                      </td>
                      {isPatient && (
                        <td>
                          {pc ? (
                            <span
                              style={{ background: pc.bg, color: pc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, cursor: appt.invoice_id ? 'pointer' : 'default' }}
                              title={appt.invoice_balance ? `Balance due: Rs. ${Number(appt.invoice_balance).toLocaleString()}` : undefined}
                              onClick={() => appt.invoice_id && navigate(`/invoices/${appt.invoice_id}`)}
                            >
                              {pc.label}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{appt.status === 'Cancelled' ? '—' : 'Pay after visit'}</span>
                          )}
                          {!!appt.invoice_balance && appt.invoice_balance > 0 && (
                            <div style={{ fontSize: 11, color: '#c2372f', marginTop: 3 }}>Due Rs. {Number(appt.invoice_balance).toLocaleString()}</div>
                          )}
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/appointments/${appt.appointment_id}`)}>View</button>
                          {isPatient && appt.status === 'Scheduled' && appt.appointment_date >= today && (
                            <button className="btn btn-sm" style={{ background: '#fdf1f0', color: '#c2372f', border: '1px solid #f2d0cd' }} onClick={() => handleCancel(appt)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showBookModal && isPatient && (
        <div className="modal-overlay" onClick={() => setShowBookModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Book an Appointment</h3>
              <button className="modal-close" onClick={() => setShowBookModal(false)}></button>
            </div>
            <form onSubmit={handleBook}>
              <div className="modal-body">
                {bookError && <div className="alert alert-error">{bookError}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Find a doctor</label>
                    <input className="form-control" placeholder="Search by name or specialty (e.g. ENT)" value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialty</label>
                    <select className="form-control" value={doctorSpecialty} onChange={e => setDoctorSpecialty(e.target.value)}>
                      <option value="">All specialties</option>
                      {specialties.map(s => <option key={s.specialty_id} value={s.specialty_id}>{s.specialty_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor * <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>({doctorOptions.length} match)</span></label>
                  <select className="form-control" required value={bookForm.doctor_id} onChange={e => setBookForm({ ...bookForm, doctor_id: e.target.value })}>
                    <option value="">Select a doctor...</option>
                    {doctorOptions.map(d => (
                      <option key={d.doctor_id} value={d.doctor_id}>
                        {d.doctor_name} — {d.specialties?.map(s => s.specialty_name).join(', ')} ({d.branch_name})
                      </option>
                    ))}
                  </select>
                  {selectedDoctor && (
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                      {selectedDoctor.branch_name} · {selectedDoctor.contact_details || selectedDoctor.email}
                    </p>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Service</label>
                    <select className="form-control" value={bookForm.treatment_id} onChange={e => setBookForm({ ...bookForm, treatment_id: e.target.value })}>
                      <option value="">Select service...</option>
                      {treatments.filter(t => t.category_id === 1).map(t => <option key={t.treatment_id} value={t.treatment_id}>{t.treatment_name} — Rs. {Number(t.standard_price).toLocaleString()}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Appointment Type</label>
                    <select className="form-control" value={bookForm.appointment_type} onChange={e => setBookForm({ ...bookForm, appointment_type: e.target.value })}>
                      <option>Consultation</option>
                      <option>Follow-up</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" required min={today} value={bookForm.appointment_date} onChange={e => setBookForm({ ...bookForm, appointment_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input type="time" className="form-control" required value={bookForm.start_time} onChange={e => setBookForm({ ...bookForm, start_time: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input type="time" className="form-control" required value={bookForm.end_time} onChange={e => setBookForm({ ...bookForm, end_time: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBookModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
