import React, { useState } from 'react';

interface PaymentFormProps {
  onSubmit?: (data: { invoiceId: string; amount: number; method: string }) => void;
  onCancel?: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmit, onCancel }) => {
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ invoiceId, amount: parseFloat(amount), method });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3>Payment Recording Form</h3>
      <div>
        <label>Invoice ID: </label>
        <input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required />
      </div>
      <div>
        <label>Amount: </label>
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div>
        <label>Method: </label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="insurance">Insurance</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit">Record Payment</button>
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
};