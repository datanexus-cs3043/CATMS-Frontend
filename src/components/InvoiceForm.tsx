import React, { useState } from 'react';

interface InvoiceFormProps {
  onSubmit?: (data: { patientId: string; amount: number }) => void;
  onCancel?: () => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onCancel }) => {
  const [patientId, setPatientId] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ patientId, amount: parseFloat(amount) });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3>Invoice Generation Form</h3>
      <div>
        <label>Patient ID: </label>
        <input value={patientId} onChange={(e) => setPatientId(e.target.value)} required />
      </div>
      <div>
        <label>Total Amount: </label>
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit">Generate Invoice</button>
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
};