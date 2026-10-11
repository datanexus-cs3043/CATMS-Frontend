import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { appointmentService, apiErrorMessage, Appointment } from '../services/api';
import { localDate } from '../utils/date';

const statusColor: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: '#f3f8fd', color: '#1d6fb8' },
  Completed: { bg: '#eef8f3', color: '#1c7c54' },
  Cancelled: { bg: '#fdf1f0', color: '#c2372f' },
};

export default function MyAppointments() {
  const { user, isDoctor, isPatient } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [reload, setReload] = useState(0);
  const loadVersion = useRef(0);

  useEffect(() => {
    // Old directory/dashboard links may still request patient booking. Scheduling
    // stays with clinic staff; do not reopen an unsupported patient mutation.
    if (isPatient && (searchParams.has('book') || searchParams.has('doctor_id'))) {
      const next = new URLSearchParams(searchParams);
      next.delete('book');
      next.delete('doctor_id');
      setSearchParams(next, { replace: true });
    }
  }, [isPatient, searchParams, setSearchParams]);

  useEffect(() => {
    const version = ++loadVersion.current;
    setAppointments([]);
    setError('');
    setIsLoading(true);
    if (!user || (!isPatient && !isDoctor)) {
      setError('This appointment history is available to patients and doctors.');
      setIsLoading(false);
      return;
    }
    // The server enforces patient ownership / doctor assignment.
    appointmentService.getAll()
      .then(rows => { if (loadVersion.current === version) setAppointments(rows); })
      .catch(err => {
        if (loadVersion.current === version) setError(apiErrorMessage(err, 'Could not load your appointments. Please try again.'));
      })
      .finally(() => { if (loadVersion.current === version) setIsLoading(false); });
    return () => { loadVersion.current += 1; };
  }, [user?.user_id, isPatient, isDoctor, reload]);

  const filtered = appointments.filter(a =>
    (!filterStatus || a.status === filterStatus) && (!filterDate || a.appointment_date === filterDate));
  const today = localDate(0);
  const tomorrow = localDate(1);
  const summaries = [
    { label: 'Upcoming', count: appointments.filter(a => a.appointment_date >= today && a.status === 'Scheduled').length, status: 'Scheduled', color: '#1d6fb8' },
    { label: 'Completed', count: appointments.filter(a => a.status === 'Completed').length, status: 'Completed', color: '#1c7c54' },
    { label: 'Cancelled', count: appointments.filter(a => a.status === 'Cancelled').length, status: 'Cancelled', color: '#c2372f' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>My Appointments</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
            {isDoctor ? 'Your consultation schedule' : 'Your appointment history'}
            {!isLoading && !error && ` — ${appointments.length} total`}
          </p>
        </div>
        <div className="page-actions">
          <input type="date" className="form-control" style={{ width: 'auto' }} value={filterDate}
            onChange={e => setFilterDate(e.target.value)} aria-label="Filter appointments by date" />
          <select className="form-control" style={{ width: 'auto' }} value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)} aria-label="Filter appointments by status">
            <option value="">All Statuses</option>
            <option>Scheduled</option><option>Completed</option><option>Cancelled</option>
          </select>
          {(filterDate || filterStatus) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDate(''); setFilterStatus(''); }}>Clear</button>
          )}
          <button className="btn btn-ghost btn-sm" disabled={isLoading} onClick={() => setReload(n => n + 1)}>Refresh</button>
        </div>
      </div>

      {isPatient && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          To book, cancel or reschedule an appointment, contact your clinic reception.
          Clinic staff manage appointment scheduling; you can view your visits and bills here.
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">
        {error} <button className="btn btn-ghost btn-sm" onClick={() => setReload(n => n + 1)}>Try again</button>
      </div>}

      {!error && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {summaries.map(s => (
          <button key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => setFilterStatus(s.status)} aria-pressed={filterStatus === s.status} disabled={isLoading}>
            <div style={{ fontSize: 26, fontWeight: 600, color: s.color }}>{isLoading ? '—' : s.count}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.label}</div>
          </button>
        ))}
      </div>}

      <div className="card" aria-busy={isLoading}>
        {isLoading ? (
          <div style={{ padding: 24 }} aria-label="Loading appointments">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : error ? null : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No appointments found</p>
            <p className="empty-state-desc">
              {filterDate || filterStatus ? 'No appointments match these filters. Try clearing them.' :
                isPatient ? 'Reception can help arrange your next visit.' : 'You have no assigned appointments yet.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr>
                <th>#</th><th>{isPatient ? 'Doctor' : 'Patient'}</th><th>Branch</th>
                <th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>{filtered.map(appt => {
                const sc = statusColor[appt.status] || { bg: '#eef2f7', color: '#5f7188' };
                return <tr key={appt.appointment_id}>
                  <td style={{ fontFamily: 'monospace' }}>#{appt.appointment_id}</td>
                  <td>{(isPatient ? appt.doctor_name : appt.patient_name) || '—'}</td>
                  <td>{appt.branch_name || '—'}</td>
                  <td>
                    {appt.appointment_date}
                    {appt.appointment_date === today && <div style={{ fontSize: 11, color: '#1d6fb8' }}>Today</div>}
                    {appt.appointment_date === tomorrow && <div style={{ fontSize: 11, color: '#b86e0c' }}>Tomorrow</div>}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}</td>
                  <td>{appt.appointment_type || 'Consultation'}</td>
                  <td><span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>{appt.status}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/appointments/${appt.appointment_id}`)}>View</button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
