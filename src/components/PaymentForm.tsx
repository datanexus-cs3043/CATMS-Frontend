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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3>Payment Recording Form</h3>
      <div>
        <label className="form-label">Invoice ID</label>
        <input className="form-control" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required />
      </div>
      <div>
        <label className="form-label">Amount</label>
        <input className="form-control" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div>
        <label className="form-label">Method</label>
        <select className="form-control" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="insurance">Insurance</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">Record Payment</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
};