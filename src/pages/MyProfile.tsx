import React, { useState, useEffect, useRef } from 'react';
import { useDialog } from '../components/DialogProvider';
import { useAuth } from '../auth/AuthContext';
import { KeyRound } from 'lucide-react';
import {
  doctorService, patientService, userService, apiErrorMessage,
  Doctor, Patient, EmergencyContact, InsurancePolicy,
} from '../services/api';

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
};
const emptyContact = { contact_name: '', relationship: '', phone: '' };

export default function MyProfile() {
  const { confirmAction } = useDialog();
  const { user, isDoctor, isPatient } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [insuranceError, setInsuranceError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const loadVersion = useRef(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: '', contact_details: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [contactForm, setContactForm] = useState(emptyContact);
  const [contactSaving, setContactSaving] = useState(false);
  const contactPending = useRef(false);
  const profilePending = useRef(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const passwordPending = useRef(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const version = ++loadVersion.current;
    setDoctor(null); setPatient(null); setContacts([]); setPolicies([]);
    setLoadError(''); setInsuranceError(''); setError(''); setSuccessMsg('');
    setEditing(false); setIsLoading(true);
    const load = async () => {
      try {
        if (isDoctor && user?.doctor_id) {
          const profile = await doctorService.getById(user.doctor_id);
          if (loadVersion.current === version) setDoctor(profile);
        } else if (isPatient && user?.patient_id) {
          const [profile, insurance] = await Promise.allSettled([
            patientService.getById(user.patient_id),
            patientService.getInsurancePolicies(user.patient_id),
          ]);
          if (loadVersion.current !== version) return;
          if (profile.status === 'rejected') throw profile.reason;
          setPatient(profile.value);
          // The detail response already includes emergency contacts.
          const detail: Patient & { emergency_contacts?: EmergencyContact[] } = profile.value;
          setContacts(detail.emergency_contacts || []);
          if (insurance.status === 'fulfilled') setPolicies(insurance.value);
          else setInsuranceError(apiErrorMessage(insurance.reason, 'Could not load your insurance policies.'));
        } else if (isDoctor || isPatient || !user) {
          throw new Error('No linked profile');
        }
      } catch (err) {
        if (loadVersion.current === version) setLoadError(apiErrorMessage(err, 'Could not load your profile. Contact clinic reception if your account has no linked profile.'));
      } finally {
        if (loadVersion.current === version) setIsLoading(false);
      }
    };
    void load();
    return () => { loadVersion.current += 1; };
  }, [user?.user_id, user?.doctor_id, user?.patient_id, isDoctor, isPatient, reload]);

  const startEditing = () => {
    if (!isPatient || !patient) return;
    setError(''); setSuccessMsg('');
    setForm({ email: patient.email || '', contact_details: patient.contact_details || '', address: patient.address || '' });
    setEditing(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPatient || !user?.patient_id || profilePending.current) return;
    profilePending.current = true;
    const version = loadVersion.current;
    setSaving(true); setError(''); setSuccessMsg('');
    try {
      const updated = await patientService.update(user.patient_id, {
        email: form.email.trim(),
        contact_details: form.contact_details.trim(),
        address: form.address.trim(),
      });
      if (loadVersion.current !== version) return;
      // PUT returns the base profile, without branch/emergency-contact joins.
      setPatient(current => current ? { ...current, ...updated } : updated);
      setSuccessMsg('Your patient contact details have been updated.');
      setEditing(false);
    } catch (err) {
      if (loadVersion.current === version) setError(apiErrorMessage(err, 'Failed to save your contact details.'));
    } finally { profilePending.current = false; setSaving(false); }
  };

  const addContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPatient || !user?.patient_id || contactPending.current) return;
    const payload = {
      contact_name: contactForm.contact_name.trim(),
      relationship: contactForm.relationship.trim(),
      phone: contactForm.phone.trim(),
    };
    if (!payload.contact_name || !payload.relationship || !payload.phone) {
      setError('Enter the contact name, relationship and phone number.');
      return;
    }
    contactPending.current = true; setContactSaving(true); setError(''); setSuccessMsg('');
    const version = loadVersion.current;
    try {
      const created = await patientService.addEmergencyContact(user.patient_id, payload);
      if (loadVersion.current !== version) return;
      setContacts(current => [...current, created]);
      setContactForm(emptyContact);
      setSuccessMsg('Emergency contact added.');
    } catch (err) {
      if (loadVersion.current === version) setError(apiErrorMessage(err, 'Could not add the emergency contact.'));
    } finally { contactPending.current = false; setContactSaving(false); }
  };

  const removeContact = async (contact: EmergencyContact) => {
    if (!isPatient || !user?.patient_id || contactPending.current) return;
    const patientId = user.patient_id;
    const version = loadVersion.current;
    contactPending.current = true; setContactSaving(true);
    try {
      if (!await confirmAction(`Remove ${contact.contact_name} from your emergency contacts?`, {
        title: 'Remove emergency contact', confirmLabel: 'Remove contact', danger: true,
      })) return;
      if (loadVersion.current !== version) return;
      setError(''); setSuccessMsg('');
      await patientService.deleteEmergencyContact(patientId, contact.emergency_contact_id);
      if (loadVersion.current !== version) return;
      setContacts(current => current.filter(item => item.emergency_contact_id !== contact.emergency_contact_id));
      setSuccessMsg('Emergency contact removed.');
    } catch (err) {
      if (loadVersion.current === version) setError(apiErrorMessage(err, 'Could not remove the emergency contact.'));
    } finally { contactPending.current = false; setContactSaving(false); }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordPending.current) return;
    setPasswordError(''); setPasswordSuccess('');
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }
    passwordPending.current = true; setPasswordSaving(true);
    try {
      const response = await userService.changePassword({
        current_password: passwordForm.current_password, new_password: passwordForm.new_password,
      });
      setPasswordSuccess(response.message);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Unable to change your password.'));
    } finally { passwordPending.current = false; setPasswordSaving(false); }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }} aria-label="Loading profile"><div className="spinner spinner-lg" /></div>;

  const accountName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username;
  const displayName = doctor?.doctor_name || (patient ? `${patient.first_name} ${patient.last_name}` : accountName) || 'My Profile';
  const initials = displayName.replace('Dr. ', '').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  const viewFields = doctor ? [
    { label: 'Email Address', value: doctor.email },
    { label: 'Phone / Contact', value: doctor.contact_details },
    { label: 'Branch', value: doctor.branch_name },
    { label: 'License Number', value: doctor.doctor_license_number },
  ] : patient ? [
    { label: 'Patient Contact Email', value: patient?.email },
    { label: 'Phone / Contact', value: patient?.contact_details },
    { label: 'Date of Birth', value: patient?.date_of_birth },
    { label: 'Gender', value: patient?.gender },
    { label: 'Registered Branch', value: patient?.branch_name },
    { label: 'Patient ID', value: patient ? `#${patient.patient_id}` : undefined },
    { label: 'Address', value: patient?.address },
  ] : [
    { label: 'Account Email', value: user?.email },
    { label: 'Role', value: user?.role?.replace(/_/g, ' ') },
    { label: 'Staff ID', value: user?.staff_id ? `#${user.staff_id}` : undefined },
    { label: 'Branch ID', value: user?.branch_id ? `#${user.branch_id}` : undefined },
  ];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>My Profile</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
          {isDoctor ? 'View your professional profile. Clinic administration manages professional details.' :
            isPatient ? 'Manage your contact details, emergency contacts and view your insurance.' :
              'View your account details and update your password. Clinic administration manages staff records.'}
        </p>
      </div>
      {loadError && <div className="alert alert-error" role="alert">{loadError} <button className="btn btn-ghost btn-sm" onClick={() => setReload(n => n + 1)}>Try again</button></div>}
      {successMsg && <div className="alert alert-success" role="status" style={{ marginBottom: 20 }}>{successMsg}</div>}
      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>{error}</div>}
      {(doctor || patient || (!isDoctor && !isPatient && user)) && <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e4eff9', color: '#1d6fb8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{displayName}</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>@{user?.username} · {isDoctor ? 'Doctor' : isPatient ? 'Patient' : 'Staff Account'}</p>
          </div>
          {!editing && isPatient && <button className="btn btn-primary" onClick={startEditing}>Edit Contact Details</button>}
        </div>
        {doctor && <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--gray-100)' }}>
          <p style={labelStyle}>Specialties</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {(doctor.specialties || []).map(s => <span className="tag" key={s.specialty_id}>{s.specialty_name}</span>)}
          </div>
        </div>}
        <div style={{ padding: '20px 28px' }}>
          {!editing ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {viewFields.map(field => <div key={field.label}><p style={labelStyle}>{field.label}</p><p>{field.value || 'Not provided'}</p></div>)}
          </div> : <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group"><label className="form-label" htmlFor="profile-email">Patient Contact Email</label>
                <input id="profile-email" type="email" maxLength={255} className="form-control" disabled={saving} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="form-group"><label className="form-label" htmlFor="profile-phone">Phone / Contact</label>
                <input id="profile-phone" maxLength={255} className="form-control" disabled={saving} value={form.contact_details} onChange={e => setForm({ ...form, contact_details: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label" htmlFor="profile-address">Address</label>
              <input id="profile-address" maxLength={500} className="form-control" disabled={saving} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>Changing the patient contact email does not change your account's sign-in email. Contact clinic administration for account changes.</p>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>{' '}
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
          </form>}
        </div>
      </div>}
      {isDoctor && doctor && <div className="alert alert-info">Contact clinic administration to update your name, contact details, specialties, license or branch.</div>}
      {isPatient && patient && <>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Emergency Contacts</h3><span className="badge badge-gray">{contacts.length}</span></div>
          <div className="card-body">
            {contacts.length === 0 ? <p style={{ marginBottom: 12 }}>No emergency contacts yet. Please add at least one.</p> :
              <div className="table-container" style={{ marginBottom: 16 }}><table>
                <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Actions</th></tr></thead>
                <tbody>{contacts.map(contact => <tr key={contact.emergency_contact_id}>
                  <td>{contact.contact_name}</td><td>{contact.relationship}</td><td>{contact.phone}</td>
                  <td><button className="btn btn-ghost btn-sm" disabled={contactSaving} onClick={() => removeContact(contact)}>Remove</button></td>
                </tr>)}</tbody>
              </table></div>}
            <form onSubmit={addContact} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {([
                ['contact_name', 'Name', 150], ['relationship', 'Relationship', 100], ['phone', 'Phone', 50],
              ] as const).map(([field, label, maxLength]) => <div className="form-group" key={field} style={{ flex: '1 1 140px', marginBottom: 0 }}>
                <label className="form-label" htmlFor={`contact-${field}`}>{label} *</label>
                <input id={`contact-${field}`} className="form-control" required maxLength={maxLength} disabled={contactSaving}
                  value={contactForm[field]} onChange={e => setContactForm({ ...contactForm, [field]: e.target.value })} />
              </div>)}
              <button type="submit" className="btn btn-secondary" disabled={contactSaving}>{contactSaving ? 'Please wait...' : '+ Add'}</button>
            </form>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Health Insurance</h3></div>
          {insuranceError ? <div className="card-body"><div className="alert alert-error" role="alert">{insuranceError}</div><button className="btn btn-ghost btn-sm" onClick={() => setReload(n => n + 1)}>Try again</button></div> :
            policies.length === 0 ? <div className="card-body">No insurance policy on file. Visit reception to register your insurance.</div> :
              <div className="table-container"><table>
                <thead><tr><th>Provider</th><th>Policy #</th><th>Valid</th><th>Status</th><th>Treatment Coverage</th></tr></thead>
                <tbody>{policies.map(policy => <tr key={policy.policy_id}>
                  <td>{policy.provider_name || '—'}</td><td>{policy.policy_number}</td><td>{policy.start_date} to {policy.end_date}</td>
                  <td><span className={`badge ${policy.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>{policy.status}</span></td>
                  <td><details>
                    <summary>{policy.coverages?.length || 0} coverage rules</summary>
                    {policy.coverages?.length ? <ul>{policy.coverages.map(coverage => <li key={coverage.coverage_id}>
                      {coverage.treatment_name || `Treatment #${coverage.treatment_id}`}: {coverage.coverage_percentage}% · Maximum LKR {Number(coverage.maximum_amount).toFixed(2)} per invoice
                    </li>)}</ul> : <p>No treatment coverage is recorded for this policy.</p>}
                    <p>Policy dates, status and treatment rules determine eligibility. Coverage does not confirm an approved claim or payment.</p>
                  </details></td>
                </tr>)}</tbody>
              </table></div>}
        </div>
      </>}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <KeyRound size={18} color="var(--primary)" aria-hidden="true" /><h3 className="card-title">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange}>
          <div className="card-body">
            {passwordSuccess && <div className="alert alert-success" role="status">{passwordSuccess}</div>}
            {passwordError && <div className="alert alert-error" role="alert">{passwordError}</div>}
            {([
              ['current_password', 'Current password', 'current-password'],
              ['new_password', 'New password', 'new-password'],
              ['confirm_password', 'Confirm new password', 'new-password'],
            ] as const).map(([field, label, autocomplete]) => <div className="form-group" key={field}>
              <label className="form-label" htmlFor={`profile-${field}`}>{label}</label>
              <input id={`profile-${field}`} className="form-control" type="password" required disabled={passwordSaving}
                minLength={field === 'current_password' ? undefined : 6} autoComplete={autocomplete} value={passwordForm[field]}
                onChange={e => setPasswordForm({ ...passwordForm, [field]: e.target.value })} />
            </div>)}
            <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>The new password must be at least 6 characters.</p>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={passwordSaving}>{passwordSaving ? 'Changing...' : 'Change Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
