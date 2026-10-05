import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  patientService, appointmentService, insuranceService,
  apiErrorMessage, Patient, Appointment, EmergencyContact, InsurancePolicy
} from '../services/api';
import { statusBadge } from './Appointments';
import { useAuth } from '../auth/AuthContext';


export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isCashier, isDoctor } = useAuth();
  const canEdit = isAdmin || isCashier;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'insurance' | 'emergency'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [contactForm, setContactForm] = useState({ contact_name: '', relationship: '', phone: '' });
  const backPath = isDoctor ? '/my-patients' : '/patients';

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [p, appts, ec, pol] = await Promise.allSettled([
        patientService.getById(Number(id)),
        appointmentService.getAll({ patient_id: Number(id) }),
        patientService.getEmergencyContacts(Number(id)),
        patientService.getInsurancePolicies(Number(id)),
      ]);
      if (p.status === 'fulfilled') setPatient(p.value);
      else setLoadError(apiErrorMessage(p.reason, 'Patient not found.'));
      if (appts.status === 'fulfilled') setAppointments(appts.value);
      if (ec.status === 'fulfilled') setEmergencyContacts(ec.value);
      if (pol.status === 'fulfilled') setPolicies(pol.value);
    } catch {}
    finally { setIsLoading(false); }
  };

  const calcAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
      <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );

  if (!patient) return (
    <div className="empty-state">
      <div className="empty-state-icon"></div>
      <p className="empty-state-title">{loadError.includes('only access') ? 'Access denied' : 'Patient not found'}</p>
      <p className="empty-state-desc">{loadError}</p>
      <button className="btn btn-secondary" onClick={() => navigate(backPath)}>Back</button>
    </div>
  );

  const initials = `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();
  const hasInsurance = policies.length > 0;

  
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(backPath)}>
          Back
        </button>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="avatar avatar-xl">{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                    {patient.first_name} {patient.last_name}
                  </h2>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{patient.patient_type || 'Regular'}</span>
                    <span className="badge badge-gray">#{patient.patient_id}</span>
                    {hasInsurance && <span className="badge badge-success">Insured</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {canEdit && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/appointments?patient_id=${patient.patient_id}`)}>
                        Book Appointment
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/invoices?patient_id=${patient.patient_id}`)}>
                        Invoices
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="info-grid" style={{ marginTop: 20 }}>
                <div className="info-item">
                  <span className="info-label">Date of Birth</span>
                  <span className="info-value">{patient.date_of_birth} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>({calcAge(patient.date_of_birth)} yrs)</span></span>
                </div>
                <div className="info-item">
                  <span className="info-label">Gender</span>
                  <span className="info-value">{patient.gender}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Contact</span>
                  <span className="info-value">{patient.contact_details || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{patient.email || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Address</span>
                  <span className="info-value">{patient.address || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Registered Branch</span>
                  <span className="info-value">{patient.branch_name || `Branch #${patient.branch_id}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'appointments', label: `Appointments (${appointments.length})` },
          { key: 'insurance', label: `Insurance (${policies.length})` },
          { key: 'emergency', label: `Emergency Contacts (${emergencyContacts.length})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-body">
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              {[
                { label: 'Total Appointments', value: appointments.length },
                { label: 'Insurance Policies', value: policies.length },
                { label: 'Emergency Contacts', value: emergencyContacts.length },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)' }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="card">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No appointments</p>
              <p className="empty-state-desc">This patient has no appointment history.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Type</th><th>Status</th><th>Branch</th><th>Action</th></tr></thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.appointment_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/appointments/${a.appointment_id}`)}>
                      <td>{a.appointment_date}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{a.start_time?.slice(0,5)} – {a.end_time?.slice(0,5)}</td>
                      <td>{a.doctor_name || `Dr. #${a.doctor_id}`}</td>
                      <td><span className="badge badge-info">{a.appointment_type}</span></td>
                      <td>{statusBadge(a.status)}</td>
                      <td>{a.branch_name || `Branch #${a.branch_id}`}</td>
                      <td><button className="btn btn-secondary btn-sm">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'insurance' && (
        <div className="card">
          {policies.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No insurance policies</p>
              <p className="empty-state-desc">Patient has no active insurance policies.</p>
              {canEdit && <button className="btn btn-primary" onClick={() => navigate('/insurance')}>Add Policy</button>}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Provider</th><th>Policy #</th><th>Valid From</th><th>Valid To</th><th>Status</th></tr></thead>
                <tbody>
                  {policies.map(pol => (
                    <tr key={pol.policy_id}>
                      <td style={{ fontWeight: 500 }}>{pol.provider_name || `Provider #${pol.provider_id}`}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{pol.policy_number}</td>
                      <td>{pol.start_date}</td>
                      <td>{pol.end_date}</td>
                      <td>
                        <span className={`badge ${pol.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>{pol.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="card">
          {canEdit && (
            <form
              className="card-body"
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '1px solid var(--gray-100)' }}
              onSubmit={async e => {
                e.preventDefault();
                try {
                  await patientService.addEmergencyContact(Number(id), contactForm);
                  setContactForm({ contact_name: '', relationship: '', phone: '' });
                  setEmergencyContacts(await patientService.getEmergencyContacts(Number(id)));
                } catch (err) { alert(apiErrorMessage(err)); }
              }}
            >
              <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                <label className="form-label">Name *</label>
                <input className="form-control" required value={contactForm.contact_name} onChange={e => setContactForm({ ...contactForm, contact_name: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                <label className="form-label">Relationship</label>
                <input className="form-control" value={contactForm.relationship} onChange={e => setContactForm({ ...contactForm, relationship: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                <label className="form-label">Phone *</label>
                <input className="form-control" required value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-secondary">+ Add Contact</button>
            </form>
          )}
          {emergencyContacts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No emergency contacts</p>
              <p className="empty-state-desc">No emergency contacts on file.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th></tr></thead>
                <tbody>
                  {emergencyContacts.map(ec => (
                    <tr key={ec.emergency_contact_id}>
                      <td style={{ fontWeight: 500 }}>{ec.contact_name}</td>
                      <td>{ec.relationship}</td>
                      <td>
                        <a href={`tel:${ec.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                          {ec.phone}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
