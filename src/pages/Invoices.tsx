import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoiceService, appointmentService, apiErrorMessage, Invoice, Appointment } from '../services/api';
import { useAuth } from '../auth/AuthContext';

export const invoiceStatusBadge = (status: string) => {
  if (status === 'Paid') return <span className="badge badge-success">{status}</span>;
  if (status === 'Partially Paid') return <span className="badge badge-warning">{status}</span>;
  if (status === 'Unpaid') return <span className="badge badge-danger">{status}</span>;
  return <span className="badge badge-gray">{status}</span>;
};

const money = (n?: number) => `Rs. ${Number(n ?? 0).toLocaleString()}`;

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canBill = user?.role === 'admin' || user?.role === 'receptionist_cashier';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billable, setBillable] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [patientFilter, setPatientFilter] = useState<number | null>(searchParams.get('patient_id') ? Number(searchParams.get('patient_id')) : null);
  const [successMsg, setSuccessMsg] = useState('');

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const [showGenerate, setShowGenerate] = useState(false);
  const [generateId, setGenerateId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    loadData();
    if (searchParams.get('new') === '1') {
      setShowGenerate(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invs, completed] = await Promise.all([
        invoiceService.getAll(),
        appointmentService.getAll({ status: 'Completed' }),
      ]);
      setInvoices(invs);
      setBillable(completed.filter(a => !a.invoice_id));
    } catch {
      /* the page shows an empty state */
    } finally { setIsLoading(false); }
  };

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !search || `inv-${inv.invoice_id}`.includes(q) || String(inv.invoice_id) === q ||
      (inv.patient_name || '').toLowerCase().includes(q) || (inv.doctor_name || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || inv.status === filterStatus;
    const matchPatient = !patientFilter || inv.patient_id === patientFilter;
    return matchSearch && matchStatus && matchPatient;
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total_amount ?? 0), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
  const totalInsurance = invoices.reduce((sum, inv) => sum + Number(inv.insurance_covered ?? 0), 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

  const openPay = (inv: Invoice) => {
    setSelectedInv(inv);
    setPayAmount('');
    setPayMethod('Cash');
    setPayError('');
    setShowPayModal(true);
  };

  const handlePayment = async () => {
    if (!selectedInv || !payAmount) return;
    setPaying(true);
    setPayError('');
    try {
      const updated = await invoiceService.makePayment(selectedInv.invoice_id, { amount: Number(payAmount), method: payMethod });
      setShowPayModal(false);
      setSuccessMsg(`Payment of ${money(Number(payAmount))} recorded for INV-${updated.invoice_id}. Remaining balance: ${money(updated.balance)}.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      loadData();
    } catch (err) {
      setPayError(apiErrorMessage(err, 'Payment failed'));
    } finally { setPaying(false); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateError('');
    try {
      const inv = await invoiceService.generate(Number(generateId));
      setShowGenerate(false);
      setGenerateId('');
      navigate(`/invoices/${inv.invoice_id}`);
    } catch (err) {
      setGenerateError(apiErrorMessage(err, 'Could not generate the invoice.'));
    } finally { setGenerating(false); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Billed', value: money(totalBilled), color: '#3f89cc' },
          { label: 'Collected from Patients', value: money(totalCollected), color: '#1d6fb8' },
          { label: 'Covered by Insurance', value: money(totalInsurance), color: '#155a96' },
          { label: 'Outstanding Balances', value: money(totalBalance), color: '#c2372f' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>Invoices & Billing</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {filtered.length} of {invoices.length} invoices
            {patientFilter && (
              <> · filtered to one patient <button className="btn btn-ghost btn-sm" onClick={() => setPatientFilter(null)}>Show all</button></>
            )}
          </p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <input placeholder="Search invoice, patient, doctor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto', padding: '8px 12px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option>Paid</option>
            <option>Partially Paid</option>
            <option>Unpaid</option>
          </select>
          {canBill && (
            <button className="btn btn-primary" onClick={() => { setGenerateError(''); setShowGenerate(true); }}>
              Create Invoice {billable.length > 0 && <span className="badge" style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>{billable.length}</span>}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No invoices found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Insurance</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.invoice_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.invoice_id}`)}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>INV-{inv.invoice_id}</td>
                    <td style={{ fontWeight: 500 }}>{inv.patient_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{inv.doctor_name}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{inv.invoice_date}</td>
                    <td style={{ fontWeight: 600 }}>{money(inv.total_amount)}</td>
                    <td style={{ color: '#155a96' }}>
                      {inv.insurance_covered ? money(inv.insurance_covered) : '—'}
                      {!!inv.insurance_pending && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{money(inv.insurance_pending)} pending</div>}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{money(inv.amount_paid)}</td>
                    <td style={{ color: Number(inv.balance) > 0 ? 'var(--danger)' : 'var(--gray-400)', fontWeight: 600 }}>{money(inv.balance)}</td>
                    <td>{invoiceStatusBadge(inv.status)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/invoices/${inv.invoice_id}`)}>View</button>
                        {canBill && Number(inv.balance) > 0 && (
                          <button className="btn btn-primary btn-sm" onClick={() => openPay(inv)}>Pay</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPayModal && selectedInv && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment – INV-{selectedInv.invoice_id}</h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}></button>
            </div>
            <div className="modal-body">
              {payError && <div className="alert alert-error">{payError}</div>}
              <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Outstanding Balance</span>
                  <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 18 }}>{money(selectedInv.balance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Patient</span>
                  <span style={{ fontWeight: 500 }}>{selectedInv.patient_name}</span>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Amount (Rs.) *</label>
                  <input type="number" className="form-control" min="1" max={selectedInv.balance} step="0.01"
                    placeholder={`Max: ${Number(selectedInv.balance).toLocaleString()}`}
                    value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Method</label>
                  <select className="form-control" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPayAmount(String(selectedInv.balance))}>Pay full balance</button>
                <span style={{ fontSize: 12, color: 'var(--gray-400)', alignSelf: 'center' }}>Partial or full payment accepted.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePayment} disabled={paying || !payAmount || Number(payAmount) <= 0}>
                {paying ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing...</> : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerate && (
        <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Invoice</h3>
              <button className="modal-close" onClick={() => setShowGenerate(false)}></button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="modal-body">
                <div className="alert alert-info">
                  Invoices are generated from the treatments recorded on a completed appointment. If the patient has an active policy, an insurance claim for covered treatments is created automatically.
                </div>
                {generateError && <div className="alert alert-error">{generateError}</div>}
                {billable.length === 0 ? (
                  <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>All completed appointments already have invoices. Mark an appointment as completed first.</p>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Completed appointment *</label>
                    <select className="form-control" required value={generateId} onChange={e => setGenerateId(e.target.value)}>
                      <option value="">Select appointment...</option>
                      {billable.map(a => (
                        <option key={a.appointment_id} value={a.appointment_id}>
                          #{a.appointment_id} · {a.appointment_date} · {a.patient_name} with {a.doctor_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowGenerate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={generating || !generateId}>
                  {generating ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}  
