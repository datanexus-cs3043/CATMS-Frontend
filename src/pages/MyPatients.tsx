import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { appointmentService, patientService, Appointment, Patient } from '../services/api';

export default function MyPatients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.doctor_id) { setIsLoading(false); return; }
    // Load appointments for this doctor, then get unique patient IDs
    appointmentService.getAll({ doctor_id: user.doctor_id })
      .then(async (appts: Appointment[]) => {
        const uniquePatientIds = [...new Set(appts.map(a => a.patient_id))];
        // Fetch each unique patient
        const patientData = await Promise.allSettled(
          uniquePatientIds.map(pid => patientService.getById(pid))
        );
        const loaded = patientData
          .filter(r => r.status === 'fulfilled')
          .map(r => (r as PromiseFulfilledResult<Patient>).value);
        setPatients(loaded);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const filtered = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.contact_details?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q);
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>My Patients</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
            Patients who have had appointments with you — {patients.length} total
          </p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <input
              className="search-box-input"
              placeholder="Search patients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <p className="empty-state-title">{search ? 'No patients match your search' : 'No patients yet'}</p>
            <p className="empty-state-desc">Patients who book appointments with you will appear here.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.patient_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: '#eef8f3', color: '#1d6fb8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>ID #{p.patient_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.date_of_birth || '—'}</td>
                    <td>
                      <span className="tag">{p.gender || '—'}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.contact_details || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{p.email || '—'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/patients/${p.patient_id}`)}
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
