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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3>Appointment Form</h3>
      <div>
        <label>Patient ID: </label>
        <input value={patientId} onChange={(e) => setPatientId(e.target.value)} required />
      </div>
      <div>
        <label>Doctor ID: </label>
        <input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required />
      </div>
      <div>
        <label>Date & Time: </label>
        <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit">Save Appointment</button>
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
};