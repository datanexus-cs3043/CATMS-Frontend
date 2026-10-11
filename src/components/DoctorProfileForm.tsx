import React, { useEffect, useRef, useState } from 'react';
import { apiErrorMessage, doctorService, Doctor } from '../services/api';

interface Props {
  doctor?: Doctor;
  onSaved: (doctor: Doctor) => void;
  onCancel: () => void;
}

export default function DoctorProfileForm({ doctor, onSaved, onCancel }: Props) {
  const [staffId, setStaffId] = useState('');
  const [name, setName] = useState(doctor?.doctor_name || '');
  const [license, setLicense] = useState(doctor?.doctor_license_number || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    const data = { doctor_name: name.trim(), doctor_license_number: license.trim() };
    if (!data.doctor_name || !data.doctor_license_number ||
        (!doctor && (!Number.isSafeInteger(Number(staffId)) || Number(staffId) <= 0))) {
      setError('Enter a name, license number and valid existing staff ID.');
      return;
    }
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const saved = doctor
        ? await doctorService.update(doctor.doctor_id, data)
        : await doctorService.create({ ...data, staff_id: Number(staffId) });
      if (mounted.current) onSaved(saved);
    } catch (err) {
      if (mounted.current) setError(apiErrorMessage(err, 'Could not save the doctor profile. Please try again.'));
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!doctor && <div className="form-group">
        <label className="form-label" htmlFor="doctor-staff-id">Existing staff ID</label>
        <input id="doctor-staff-id" className="form-control" type="number" min="1" step="1"
          required disabled={saving} value={staffId} onChange={e => setStaffId(e.target.value)} />
        <p className="text-sm text-gray-500">This registers a doctor profile only, not a new staff record or login account.</p>
      </div>}
      <div className="form-group">
        <label className="form-label" htmlFor="doctor-name">Doctor name</label>
        <input id="doctor-name" className="form-control" required maxLength={150} disabled={saving}
          value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="doctor-license">License number</label>
        <input id="doctor-license" className="form-control" required maxLength={100} disabled={saving}
          value={license} onChange={e => setLicense(e.target.value)} />
      </div>
      <div className="page-actions">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : doctor ? 'Save profile' : 'Register doctor'}
        </button>
      </div>
    </form>
  );
}
