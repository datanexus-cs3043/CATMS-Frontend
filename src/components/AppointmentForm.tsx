import React, { useState } from 'react';

interface AppointmentFormProps {
  onSubmit?: (data: { patientId: string; doctorId: string; dateTime: string }) => void;
  onCancel?: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, onCancel }) => {
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [dateTime, setDateTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ patientId, doctorId, dateTime });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3>Appointment Form</h3>
      <div>
        <label className="form-label">Patient ID</label>
        <input className="form-control" value={patientId} onChange={(e) => setPatientId(e.target.value)} required />
      </div>
      <div>
        <label className="form-label">Doctor ID</label>
        <input className="form-control" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required />
      </div>
      <div>
        <label className="form-label">Date & Time</label>
        <input className="form-control" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">Save Appointment</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
};