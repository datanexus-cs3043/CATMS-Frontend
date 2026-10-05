import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  doctorService, patientService, specialtyService, apiErrorMessage,
  Doctor, Patient, Specialty, EmergencyContact, InsurancePolicy,
} from '../services/api';


const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
};


export default function MyProfile() {
  const { user, isDoctor, isPatient, updateUser } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [contactForm, setContactForm] = useState({ contact_name: '', relationship: '', phone: '' });

  useEffect(() => { loadProfile(); }, [user?.user_id]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      if (isDoctor && user?.doctor_id) {
        const [d, s] = await Promise.all([doctorService.getById(user.doctor_id), specialtyService.getAll()]);
        setDoctor(d);
        setSpecialties(s);
      } else if (isPatient && user?.patient_id) {
        const [p, ec, pol] = await Promise.all([
          patientService.getById(user.patient_id),
          patientService.getEmergencyContacts(user.patient_id),
          patientService.getInsurancePolicies(user.patient_id),
        ]);
        setPatient(p);
        setContacts(ec);
        setPolicies(pol);
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load your profile.'));
    } finally { setIsLoading(false); }
  };

  const startEditing = () => {
    setError(''); setSuccessMsg('');
    if (doctor) {
      setForm({
        first_name: doctor.first_name || '', last_name: doctor.last_name || '',
        email: doctor.email || '', contact_details: doctor.contact_details || '',
        bio: doctor.bio || '', specialty_ids: (doctor.specialties || []).map(s => s.specialty_id),
      });
    } else if (patient) {
      setForm({ email: patient.email || '', contact_details: patient.contact_details || '', address: patient.address || '' });
    }
    setEditing(true);
  };

  const toggleSpecialty = (sid: number) => {
    const current: number[] = form.specialty_ids || [];
    setForm({ ...form, specialty_ids: current.includes(sid) ? current.filter(x => x !== sid) : [...current, sid] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccessMsg('');
    try {
      if (isDoctor && user?.doctor_id) {
        const updated = await doctorService.update(user.doctor_id, form);
        setDoctor(updated);
        updateUser({ first_name: updated.first_name, last_name: updated.last_name, email: updated.email });
        setSuccessMsg('Profile updated. Patients and staff now see your new details in the doctor directory, bookings and invoices.');
      } else if (isPatient && user?.patient_id) {
        const updated = await patientService.update(user.patient_id, form);
        setPatient(updated);
        updateUser({ email: updated.email });
        setSuccessMsg('Your contact details have been updated.');
      }
      setEditing(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save changes.'));
    } finally { setSaving(false); }
  };

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.patient_id) return;
    try {
      await patientService.addEmergencyContact(user.patient_id, contactForm);
      setContactForm({ contact_name: '', relationship: '', phone: '' });
      setContacts(await patientService.getEmergencyContacts(user.patient_id));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const removeContact = async (c: EmergencyContact) => {
    if (!user?.patient_id || !confirm(`Remove ${c.contact_name} from your emergency contacts?`)) return;
    try {
      await patientService.deleteEmergencyContact(c.emergency_contact_id);
      setContacts(await patientService.getEmergencyContacts(user.patient_id));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>;
  }

  const roleColor = isDoctor ? '#1d6fb8' : '#0f4575';
  const displayName = doctor ? doctor.doctor_name : patient ? `${patient.first_name} ${patient.last_name}` : `${user?.first_name} ${user?.last_name}`;
  const initials = displayName.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  
  const viewFields = doctor
    ? [
        { label: 'Email Address', value: doctor.email },
        { label: 'Phone / Contact', value: doctor.contact_details },
        { label: 'Branch', value: doctor.branch_name },
        { label: 'License Number', value: doctor.doctor_license_number },
      ]
    : [
        { label: 'Email Address', value: patient?.email },
        { label: 'Phone / Contact', value: patient?.contact_details },
        { label: 'Date of Birth', value: patient?.date_of_birth },
        { label: 'Gender', value: patient?.gender },
        { label: 'Registered Branch', value: patient?.branch_name },
        { label: 'Patient ID', value: `#${patient?.patient_id}` },
        { label: 'Address', value: patient?.address, wide: true },
      ];


  return (
    <div style={{ maxWidth: 760, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>My Profile</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
          {isDoctor
            ? 'Manage your professional profile. Changes are shown to patients and staff across the whole system.'
            : 'Manage your contact details, emergency contacts and view your insurance.'}
        </p>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{successMsg}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: `${roleColor}20`, color: roleColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{displayName}</h3>
              <span style={{ background: `${roleColor}15`, color: roleColor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                {isDoctor ? 'Doctor Profile' : 'Patient Profile'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>@{user?.username}</p>
          </div>
          {!editing && <button className="btn btn-primary" onClick={startEditing}>Edit Profile</button>}
        </div>

        {doctor && !editing && (
          <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--gray-100)' }}>
            <p style={labelStyle}>Specialties</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {(doctor.specialties || []).map(s => (
                <span key={s.specialty_id} style={{ background: '#eef8f3', color: '#1d6fb8', fontWeight: 600, fontSize: 13, padding: '5px 14px', borderRadius: 99, border: '1px solid #e4eff9' }}>
                  {s.specialty_name}
                </span>
              ))}
            </div>
            {doctor.bio && (
              <>
                <p style={{ ...labelStyle, marginTop: 16 }}>About</p>
                <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6 }}>{doctor.bio}</p>
              </>
            )}
          </div>
        )}

        <div style={{ padding: '20px 28px' }}>
          {!editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {viewFields.map(f => (
                <div key={f.label} style={{ gridColumn: (f as any).wide ? '1 / -1' : undefined }}>
                  <p style={labelStyle}>{f.label}</p>
                  <p style={{ fontSize: 14, color: 'var(--gray-800)', fontWeight: 500 }}>
                    {f.value || <span style={{ color: 'var(--gray-300)', fontStyle: 'italic' }}>Not provided</span>}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {isDoctor && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-control" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone / Contact</label>
                  <input className="form-control" value={form.contact_details} onChange={e => setForm({ ...form, contact_details: e.target.value })} placeholder="07X-XXX-XXXX" />
                </div>
              </div>
              {isPatient && (
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your home address" />
                </div>
              )}
              {isDoctor && (
                <>
                  <div className="form-group">
                    <label className="form-label">Specialties * <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(select all you practise)</span></label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {specialties.map(s => {
                        const on = (form.specialty_ids || []).includes(s.specialty_id);
                        return (
                          <button type="button" key={s.specialty_id} onClick={() => toggleSpecialty(s.specialty_id)}
                            style={{
                              padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                              border: `1.5px solid ${on ? '#1d6fb8' : 'var(--gray-200)'}`,
                              background: on ? '#eef8f3' : 'white', color: on ? '#1d6fb8' : 'var(--gray-600)',
                            }}>
                            {on ? '' : ''}{s.specialty_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">About / Qualifications</label>
                    <textarea className="form-control" rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Qualifications, experience, areas of interest" />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving || (isDoctor && !(form.specialty_ids || []).length)}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {isDoctor && (
        <div className="alert" style={{ background: '#f3f8fd', border: '1px solid #c6ddf2', color: '#155a96' }}>
          Your license number and branch can only be changed by an administrator.
        </div>
      )}

      {isPatient && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Emergency Contacts</h3>
              <span className="badge badge-gray">{contacts.length}</span>
            </div>
            <div className="card-body">
              {contacts.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', fontSize: 13, marginBottom: 12 }}>No emergency contacts yet. Please add at least one.</p>
              ) : (
                <div className="table-container" style={{ marginBottom: 16 }}>
                  <table>
                    <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th></th></tr></thead>
                    <tbody>
                      {contacts.map(c => (
                        <tr key={c.emergency_contact_id}>
                          <td style={{ fontWeight: 500 }}>{c.contact_name}</td>
                          <td>{c.relationship}</td>
                          <td>{c.phone}</td>
                          <td><button className="btn btn-ghost btn-sm" onClick={() => removeContact(c)}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form onSubmit={addContact} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                  <label className="form-label">Name *</label>
                  <input className="form-control" required value={contactForm.contact_name} onChange={e => setContactForm({ ...contactForm, contact_name: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                  <label className="form-label">Relationship</label>
                  <input className="form-control" value={contactForm.relationship} onChange={e => setContactForm({ ...contactForm, relationship: e.target.value })} placeholder="e.g. Spouse" />
                </div>
                <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                  <label className="form-label">Phone *</label>
                  <input className="form-control" required value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-secondary">+ Add</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Health Insurance</h3>
            </div>
            {policies.length === 0 ? (
              <div className="card-body">
                <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>No insurance policy on file. Visit the reception to register your insurance.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Provider</th><th>Policy #</th><th>Valid</th><th>Status</th></tr></thead>
                  <tbody>
                    {policies.map(p => (
                      <tr key={p.policy_id}>
                        <td style={{ fontWeight: 500 }}>{p.provider_name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{p.policy_number}</td>
                        <td style={{ fontSize: 13 }}>{p.start_date} to {p.end_date}</td>
                        <td><span className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

//Tharushi