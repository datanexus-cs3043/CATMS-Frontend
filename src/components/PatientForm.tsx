import React, { useState } from 'react';

interface PatientFormProps {
  onSubmit?: (data: { firstName: string; lastName: string; contact: string; email: string }) => void;
  onCancel?: () => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ onSubmit, onCancel }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ firstName, lastName, contact, email });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3>Patient Registration Form</h3>
      <div>
        <label>First Name: </label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </div>
      <div>
        <label>Last Name: </label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div>
        <label>Contact: </label>
        <input value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      <div>
        <label>Email: </label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit">Save Patient</button>
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
};