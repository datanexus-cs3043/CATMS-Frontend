import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  patientService, appointmentService,
  apiErrorMessage, Patient, Appointment, EmergencyContact, InsurancePolicy
} from '../services/api';
import { statusBadge } from './Appointments';
import { useAuth } from '../auth/AuthContext';


export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isManager, isCashier, isDoctor } = useAuth();
  const canEdit = isAdmin || isManager || isCashier;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'insurance' | 'emergency'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [failureTitle, setFailureTitle] = useState('Patient details unavailable');
  const [appointmentsError, setAppointmentsError] = useState('');
  const [insuranceError, setInsuranceError] = useState('');
  const loadVersion = useRef(0);
  const [contactForm, setContactForm] = useState({ contact_name: '', relationship: '', phone: '' });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');
  const contactPending = useRef(false);
  const backPath = isDoctor ? '/my-patients' : '/patients';
  const canManageContacts = canEdit && !!patient && (isAdmin || patient.branch_id === user?.branch_id);

  useEffect(() => {
    setActiveTab('overview');
    void loadAll();
    return () => { loadVersion.current += 1; };
  }, [id, user?.user_id]);

  const loadAll = async () => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setPatient(null); setAppointments([]); setEmergencyContacts([]); setPolicies([]);
    setLoadError(''); setAppointmentsError(''); setInsuranceError('');
    setContactError(''); setContactSuccess('');
    setContactForm({ contact_name: '', relationship: '', phone: '' });
    const patientId = Number(id);
    if (!Number.isSafeInteger(patientId) || patientId <= 0) {
      setFailureTitle('Invalid patient link');
      setLoadError('Select a patient from the patient directory.');
      setIsLoading(false);
      return;
    }
    try {
      const [p, appts, pol] = await Promise.allSettled([
        patientService.getById(patientId),
        appointmentService.getAll({ patient_id: patientId }),
        patientService.getInsurancePolicies(patientId),
      ]);
      if (loadVersion.current !== version) return;
      if (p.status === 'rejected') throw p.reason;
      setPatient(p.value);
      // The patient detail endpoint already returns all emergency contacts.
      const detail: Patient & { emergency_contacts?: EmergencyContact[] } = p.value;
      setEmergencyContacts(detail.emergency_contacts || []);
      if (appts.status === 'fulfilled') setAppointments(appts.value);
      else setAppointmentsError(apiErrorMessage(appts.reason, 'Appointment history is unavailable. Please retry.'));
      if (pol.status === 'fulfilled') setPolicies(pol.value);
      else setInsuranceError(apiErrorMessage(pol.reason, 'Insurance policies are unavailable. Please retry.'));
    } catch (err) {
      if (loadVersion.current !== version) return;
      const responseStatus = axios.isAxiosError(err) ? err.response?.status : undefined;
      setFailureTitle(responseStatus === 403 ? 'Access denied' : responseStatus === 404 ? 'Patient not found' : 'Patient details unavailable');
      setLoadError(apiErrorMessage(err, 'Could not load patient details. Please try again.'));
    } finally { if (loadVersion.current === version) setIsLoading(false); }
  };

  const addContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageContacts || !patient || contactPending.current) return;
    const payload = {
      contact_name: contactForm.contact_name.trim(),
      relationship: contactForm.relationship.trim(),
      phone: contactForm.phone.trim(),
    };
    setContactError(''); setContactSuccess('');
    if (!payload.contact_name || !payload.relationship || !payload.phone) {
      setContactError('Enter the contact name, relationship and phone number.');
      return;
    }
    const version = loadVersion.current;
    contactPending.current = true; setContactSaving(true);
    try {
      const created = await patientService.addEmergencyContact(patient.patient_id, payload);
      if (loadVersion.current !== version) return;
      setEmergencyContacts(current => [...current, created]);
      setContactForm({ contact_name: '', relationship: '', phone: '' });
      setContactSuccess('Emergency contact added.');
    } catch (err) {
      if (loadVersion.current === version) setContactError(apiErrorMessage(err, 'Could not add the emergency contact.'));
    } finally { contactPending.current = false; setContactSaving(false); }
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
      <p className="empty-state-title">{failureTitle}</p>
      <p className="empty-state-desc" role="alert">{loadError}</p>
      <button className="btn btn-ghost" onClick={() => void loadAll()}>Try again</button>
      <button className="btn btn-secondary" onClick={() => navigate(backPath)}>Back</button>
    </div>
  );

  const initials = `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();
  const hasInsurance = !insuranceError && policies.length > 0;

  
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(backPath)}>
          Back
        </button>
        <button className="btn btn-ghost btn-sm" disabled={contactSaving} onClick={() => void loadAll()}>Refresh</button>
      </div>

      {(appointmentsError || insuranceError) && <div className="alert alert-warning" role="alert" style={{ marginBottom: 20 }}>
        Some patient information could not be loaded. The unavailable sections are marked below.
        <button className="btn btn-ghost btn-sm" disabled={contactSaving} onClick={() => void loadAll()}>Retry loading</button>
      </div>}

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
                    {hasInsurance && <span className="badge badge-success">Insurance on file</span>}
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
      {canEdit && patient.branch_id !== user?.branch_id && !isAdmin && <div className="alert alert-info">
        This shared record was registered at another branch. You can book a visit at your branch and read personal, emergency-contact and insurance details. Contact the registered branch to change patient or emergency-contact details.
      </div>}
      <div className="tabs">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'appointments', label: `Appointments (${appointmentsError ? 'Unavailable' : appointments.length})` },
          { key: 'insurance', label: `Insurance (${insuranceError ? 'Unavailable' : policies.length})` },
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
                { label: 'Visible Appointments', value: appointmentsError ? 'Unavailable' : appointments.length },
                { label: 'Insurance Policies', value: insuranceError ? 'Unavailable' : policies.length },
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
          {appointmentsError ? <div className="card-body"><div className="alert alert-error" role="alert">{appointmentsError}</div></div> : appointments.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No appointments</p>
              <p className="empty-state-desc">No appointments are visible for this patient in your permitted scope.</p>
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
          {insuranceError ? <div className="card-body"><div className="alert alert-error" role="alert">{insuranceError}</div></div> : policies.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No insurance policies</p>
              <p className="empty-state-desc">No insurance policies are on file for this patient.</p>
              {(isAdmin || isCashier) && <button className="btn btn-primary" onClick={() => navigate('/insurance')}>Add Policy</button>}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Provider</th><th>Policy #</th><th>Valid From</th><th>Valid To</th><th>Status</th><th>Treatment Coverage</th></tr></thead>
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
                      <td>
                        <details>
                          <summary>{pol.coverages?.length || 0} coverage rules</summary>
                          {pol.coverages?.length ? <ul>{pol.coverages.map(coverage => <li key={coverage.coverage_id}>
                            {coverage.treatment_name || `Treatment #${coverage.treatment_id}`}: {coverage.coverage_percentage}% · Maximum LKR {Number(coverage.maximum_amount).toFixed(2)} per invoice
                          </li>)}</ul> : <p>No treatment coverage is recorded for this policy.</p>}
                          <p>Policy dates, status and treatment rules determine eligibility. Coverage does not confirm an approved claim or payment.</p>
                        </details>
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
          {contactError && <div className="alert alert-error" role="alert">{contactError}</div>}
          {contactSuccess && <div className="alert alert-success" role="status">{contactSuccess}</div>}
          {canManageContacts && (
            <form
              className="card-body"
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '1px solid var(--gray-100)' }}
              onSubmit={addContact}
            >
              <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                <label className="form-label">Name *</label>
                <input className="form-control" required maxLength={150} disabled={contactSaving} value={contactForm.contact_name} onChange={e => setContactForm({ ...contactForm, contact_name: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                <label className="form-label">Relationship *</label>
                <input className="form-control" required maxLength={100} disabled={contactSaving} value={contactForm.relationship} onChange={e => setContactForm({ ...contactForm, relationship: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                <label className="form-label">Phone *</label>
                <input className="form-control" required maxLength={50} disabled={contactSaving} value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={contactSaving}>{contactSaving ? 'Adding...' : '+ Add Contact'}</button>
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

//Tharushi
