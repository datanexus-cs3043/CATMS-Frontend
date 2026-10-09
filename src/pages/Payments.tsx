import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, DoctorPayment, Invoice, Payment } from '../services/api';


export default function Payments() {
  const [doctorPayments, setDoctorPayments] = useState<DoctorPayment[]>([]);
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoice' | 'doctor'>('transactions');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [dp, inv, tx] = await Promise.allSettled([
          invoiceService.getDoctorPayments(),
          invoiceService.getAll(),
          invoiceService.getAllPayments(),
        ]);
        if (dp.status === 'fulfilled') setDoctorPayments(dp.value);
        if (inv.status === 'fulfilled') setInvoices(inv.value);
        if (tx.status === 'fulfilled' && tx.value.length > 0) {
          setTransactions(tx.value);
        } else if (inv.status === 'fulfilled') {
          // Gracefully synthesize transaction rows from invoices with payments recorded
          const derived: Payment[] = inv.value
            .filter(i => Number(i.amount_paid) > 0)
            .map((i, idx) => ({
              payment_id: idx + 1,
              invoice_id: i.invoice_id,
              amount: Number(i.amount_paid),
              payment_date: i.invoice_date,
              patient_name: i.patient_name,
              method: 'Cash/Card',
              received_by: 'Branch Cashier',
            }));
          setTransactions(derived);
        }
      } catch {} finally { setIsLoading(false); }
    };
    load();
  }, []);

  
  const totalCollected = invoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const totalPending = invoices.reduce((s, i) => s + Number(i.balance), 0);
  const totalDoctorPaid = doctorPayments.reduce((s, d) => s + Number(d.doctor_payment), 0);


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
      ) : activeTab === 'invoice' ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Invoice</th><th>Patient</th><th>Date</th><th>Total</th><th>Insurance</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.invoice_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.invoice_id}`)}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>INV-{inv.invoice_id}</td>
                    <td>{inv.patient_name || `Appt #${inv.appointment_id}`}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{inv.invoice_date}</td>
                    <td>Rs. {Number(inv.total_amount ?? 0).toLocaleString()}</td>
                    <td style={{ color: '#155a96' }}>Rs. {Number(inv.insurance_covered ?? 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>Rs. {Number(inv.amount_paid).toLocaleString()}</td>
                    <td style={{ color: Number(inv.balance) > 0 ? 'var(--danger)' : 'var(--gray-400)', fontWeight: 600 }}>
                      Rs. {Number(inv.balance).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Partially Paid' ? 'badge-warning' : 'badge-danger'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          {doctorPayments.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No doctor payments recorded</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Doctor</th><th>Appointment</th><th>Date</th><th>Time</th><th>Amount</th></tr></thead>
                <tbody>
                  {doctorPayments.map(dp => (
                    <tr key={dp.doctor_payment_id}>
                      <td style={{ fontWeight: 500 }}>{dp.doctor_name || `Dr. #${dp.doctor_id}`}</td>
                      <td>#{dp.appointment_id}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{dp.date}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{dp.time?.slice(0,5)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>Rs. {Number(dp.doctor_payment).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

//Tharushi
