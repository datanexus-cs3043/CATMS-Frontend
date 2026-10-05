import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { invoiceService, Invoice } from '../services/api';

export default function MyBills() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (user?.patient_id) {
      // The API only returns invoices for the signed-in patient.
      invoiceService.getAll()
        .then(setInvoices)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const filtered = filter
    ? invoices.filter(i => i.status === filter)
    : invoices;

  const totalBilled = invoices.reduce((sum, i) => sum + Number(i.total_amount ?? i.amount_paid + i.balance), 0);
  const totalInsurance = invoices.reduce((sum, i) => sum + Number(i.insurance_covered || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + Number(i.amount_paid), 0);
  const totalDue = invoices.reduce((sum, i) => sum + Number(i.balance), 0);

  const statusColor: Record<string, { bg: string; color: string }> = {
    Paid:           { bg: '#eef8f3', color: '#1c7c54' },
    'Partially Paid': { bg: '#fdf6ea', color: '#b86e0c' },
    Unpaid:         { bg: '#fdf1f0', color: '#c2372f' },
    Cancelled:      { bg: '#eef2f7', color: '#5f7188' },
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>My Bills</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
            Your billing history at MedSync — {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="page-actions">
          <select className="form-control" style={{ width: 'auto', padding: '8px 12px' }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option>Paid</option>
            <option>Partially Paid</option>
            <option>Unpaid</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Billed', value: `Rs. ${totalBilled.toLocaleString()}`, color: '#1d6fb8', bg: '#f3f8fd' },
          { label: 'Covered by Insurance', value: `Rs. ${totalInsurance.toLocaleString()}`, color: '#155a96', bg: '#f3f8fd' },
          { label: 'Total Paid', value: `Rs. ${totalPaid.toLocaleString()}`, color: '#1c7c54', bg: '#eef8f3' },
          { label: 'Outstanding', value: `Rs. ${totalDue.toLocaleString()}`, color: totalDue > 0 ? '#c2372f' : '#1c7c54', bg: totalDue > 0 ? '#fdf1f0' : '#eef8f3' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {totalDue > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          You have an outstanding balance of <strong>Rs. {totalDue.toLocaleString()}</strong>. Please visit the clinic or contact us to clear your dues.
        </div>
      )}

      {/* Invoices List */}
      <div className="card">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <p className="empty-state-title">No invoices found</p>
            <p className="empty-state-desc">Your billing records will appear here after your appointments.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Total Amount</th>
                  <th>Insurance</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const total = Number(inv.total_amount ?? inv.amount_paid + inv.balance);
                  const sc = statusColor[inv.status] || { bg: '#eef2f7', color: '#5f7188' };
                  return (
                    <tr key={inv.invoice_id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          INV-{String(inv.invoice_id).padStart(4, '0')}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{inv.invoice_date}</td>
                      <td style={{ fontWeight: 500 }}>{inv.doctor_name || '—'}</td>
                      <td style={{ fontWeight: 600 }}>Rs. {total.toLocaleString()}</td>
                      <td style={{ color: '#155a96' }}>
                        {inv.insurance_covered ? `Rs. ${Number(inv.insurance_covered).toLocaleString()}` : '—'}
                        {!!inv.insurance_pending && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Rs. {Number(inv.insurance_pending).toLocaleString()} pending</div>}
                      </td>
                      <td style={{ color: '#1c7c54', fontWeight: 600 }}>Rs. {inv.amount_paid.toLocaleString()}</td>
                      <td>
                        {inv.balance > 0 ? (
                          <span style={{ color: '#c2372f', fontWeight: 700 }}>Rs. {inv.balance.toLocaleString()}</span>
                        ) : (
                          <span style={{ color: '#1c7c54', fontWeight: 600 }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/invoices/${inv.invoice_id}`)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
