import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, DoctorPayment, Invoice, Payment } from '../services/api';

export default function Payments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoice' | 'doctor'>('transactions');


  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Collected', value: `Rs. ${totalCollected.toLocaleString()}`, color: '#1d6fb8' },
          { label: 'Outstanding', value: `Rs. ${totalPending.toLocaleString()}`, color: '#c2372f' },
          { label: 'Doctor Payments', value: `Rs. ${totalDoctorPaid.toLocaleString()}`, color: '#3f89cc' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color, fontSize: 22 }}>
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
          Payment Transactions ({transactions.length})
        </button>
        <button className={`tab-btn ${activeTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveTab('invoice')}>
          Invoice Balances ({invoices.length})
        </button>
        <button className={`tab-btn ${activeTab === 'doctor' ? 'active' : ''}`} onClick={() => setActiveTab('doctor')}>
          Doctor Payments ({doctorPayments.length})
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : activeTab === 'transactions' ? (
        <div className="card">
          {transactions.length === 0 ? (
            <div className="empty-state"><p className="empty-state-title">No payments recorded</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Payment #</th><th>Date</th><th>Invoice</th><th>Patient</th><th>Method</th><th>Received By</th><th>Amount</th></tr></thead>
                <tbody>
                  {transactions.map(p => (
                    <tr key={p.payment_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${p.invoice_id}`)}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>PAY-{p.payment_id}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{p.payment_date}</td>
                      <td>INV-{p.invoice_id}</td>
                      <td>{p.patient_name}</td>
                      <td>{p.method}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{p.received_by}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>Rs. {Number(p.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) }
    </div>
  );
}
