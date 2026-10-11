import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  invoiceService, insuranceService, patientService, apiErrorMessage, PaymentOutcomeError,
  Invoice, InvoiceItem, InsuranceClaim, InsurancePolicy, Payment,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { localDate } from '../utils/date';
import { invoiceStatusBadge } from './Invoices';
import { useDialog } from '../components/DialogProvider';

const money = (n?: number) => `Rs. ${Number(n ?? 0).toLocaleString()}`;
const th: React.CSSProperties = { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' };

export default function InvoiceDetails() {
  const { requestInput, confirmAction } = useDialog();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isCashier, isManager, isPatient } = useAuth();
  const canEdit = isAdmin || isCashier || isManager;
  const canViewPayments = canEdit || isPatient;
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const loadVersion = useRef(0);
  const mutationPending = useRef(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [paying, setPaying] = useState(false);
  const [modalError, setModalError] = useState('');
  const [paymentNeedsReview, setPaymentNeedsReview] = useState(false);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [updatingClaim, setUpdatingClaim] = useState<number | null>(null);
  const [claimForm, setClaimForm] = useState({ policy_id: '', claim_amount: '', claim_date: localDate(0) }); 

  const load = useCallback(async (background = false) => {
    const version = ++loadVersion.current;
    if (!background) setIsLoading(true);
    setLoadError('');
    try {
      if (!Number.isInteger(invoiceId) || invoiceId <= 0) throw new Error('Invalid invoice number.');
      const inv = await invoiceService.getById(invoiceId);
      if (version !== loadVersion.current) return;
      setInvoice(inv);
      const [its, cls, pays, pols] = await Promise.allSettled([
        invoiceService.getItems(invoiceId),
        insuranceService.getClaims({ invoice_id: invoiceId }),
        canViewPayments ? invoiceService.getPayments(invoiceId) : Promise.resolve([]),
        canEdit && inv.patient_id ? patientService.getInsurancePolicies(inv.patient_id) : Promise.resolve([]),
      ]);
      if (version !== loadVersion.current) return;
      setItems(its.status === 'fulfilled' ? its.value : []);
      setClaims(cls.status === 'fulfilled' ? cls.value : []);
      setPayments(pays.status === 'fulfilled' ? pays.value : []);
      setPolicies(pols.status === 'fulfilled' ? pols.value : []);
      const errors: Record<string, string> = {};
      for (const [name, result] of [['Treatment items', its], ['Insurance claims', cls], ['Payment history', pays], ['Insurance policies', pols]] as const) {
        if (result.status === 'rejected') errors[name] = apiErrorMessage(result.reason, `${name} could not be loaded.`);
      }
      setSectionErrors(errors);
    } catch (err) {
      if (version !== loadVersion.current) return;
      if (!background) setInvoice(null);
      setLoadError(apiErrorMessage(err, 'Invoice not found.'));
    } finally { if (version === loadVersion.current) setIsLoading(false); }
  }, [invoiceId, canEdit, canViewPayments]);

  useEffect(() => { void load(); return () => { loadVersion.current++; }; }, [load]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 5000);
  };

  const handlePayment = async () => {
    if (!invoice || mutationPending.current || loadError || paymentNeedsReview) return;
    const amount = Number(payAmount);
    if (!payAmount.trim() || !Number.isFinite(amount) || amount <= 0 || amount > Number(invoice.balance)) {
      setModalError('Enter a positive payment no greater than the outstanding balance.');
      return;
    }
    mutationPending.current = true;
    setPaying(true);
    setModalError('');
    try {
      await invoiceService.makePayment(invoice.invoice_id, { amount: Number(payAmount), method: payMethod });
      setShowPayModal(false);
      flash('success', `Payment of ${money(Number(payAmount))} recorded.`);
      await load(true);
    } catch (err) {
      if (err instanceof PaymentOutcomeError) setPaymentNeedsReview(true);
      setModalError(apiErrorMessage(err, 'Payment failed'));
    } finally { mutationPending.current = false; setPaying(false); }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || mutationPending.current || loadError) return;
    setModalError('');
    const amount = Number(claimForm.claim_amount);
    if (!claimForm.claim_amount.trim() || !Number.isFinite(amount) || amount <= 0 || amount > remainingClaimAmount) {
      setModalError('Enter a positive claim within the unclaimed billed amount.');
      return;
    }
    mutationPending.current = true;
    setClaiming(true);
    try {
      await insuranceService.createClaim({
        invoice_id: invoice.invoice_id,
        policy_id: Number(claimForm.policy_id),
        claim_amount: Number(claimForm.claim_amount),
        claim_date: claimForm.claim_date,
        status: 'Pending',
        approved_amount: 0,
      });
      setShowClaimModal(false);
      flash('success', 'Insurance claim filed as pending. Approval does not record a payment or reduce the invoice balance.');
      await load(true);
    } catch (err) {
      setModalError(apiErrorMessage(err, 'Claim failed'));
    } finally { mutationPending.current = false; setClaiming(false); }
  };

  const settleClaim = async (claim: InsuranceClaim, status: 'Approved' | 'Rejected') => {
    if (mutationPending.current || loadError) return;
    mutationPending.current = true;
    setUpdatingClaim(claim.claim_id);
    try {
      let approved = 0;
      if (status === 'Approved') {
        const input = await requestInput(`Approved amount for CLM-${claim.claim_id} (max ${money(claim.claim_amount)}):`, String(claim.claim_amount), {
          title: 'Approve insurance claim', inputLabel: 'Approved amount (Rs.)', confirmLabel: 'Approve claim',
          validate: value => value.trim() && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= Number(claim.claim_amount) ? null : 'Enter an amount between zero and the claimed amount.',
        });
        if (input === null) return;
        approved = Number(input);
      } else if (!await confirmAction(`Reject claim CLM-${claim.claim_id}?`, { title: 'Reject insurance claim', confirmLabel: 'Reject claim', danger: true })) {
        return;
      }
      await insuranceService.updateClaim(claim.claim_id, { status, approved_amount: approved ?? 0 });
      flash('success', `Claim ${status.toLowerCase()}. This does not record a payment or change the invoice balance.`);
      await load(true);
    } catch (err) {
      flash('error', apiErrorMessage(err));
    } finally { mutationPending.current = false; setUpdatingClaim(null); }
  };

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );

  if (!invoice) return (
    <div className="empty-state">
      <p className="empty-state-title">{loadError.includes('only access') ? 'Access denied' : 'Invoice not found'}</p>
      <p className="empty-state-desc">{loadError}</p>
      <button className="btn btn-secondary" onClick={() => navigate(isPatient ? '/my-bills' : '/invoices')}>Go Back</button>
    </div>
  );

  const activePolicies = policies.filter(p => p.status === 'Active' && p.start_date <= invoice.invoice_date && p.end_date >= invoice.invoice_date);
  const remainingClaimAmount = Math.max(0, Number(invoice.total_amount ?? 0) - claims.reduce((sum, claim) =>
    sum + (claim.status === 'Pending' ? Number(claim.claim_amount) : claim.status === 'Approved' ? Number(claim.approved_amount) : 0), 0));
  const mutationsDisabled = !!loadError || paying || claiming || updatingClaim !== null;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(isPatient ? '/my-bills' : '/invoices')}>
        {isPatient ? 'Back to My Bills' : 'Back to Invoices'}
      </button>

      {message && <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>{message.text}</div>}
      {(loadError || Object.keys(sectionErrors).length > 0) && <div className="alert alert-error" role="alert">
        {loadError || Object.entries(sectionErrors).map(([name, error]) => `${name}: ${error}`).join(' ')}
        <button className="btn btn-secondary btn-sm" onClick={() => void load(true)}>Retry loading</button>
      </div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: '2 1 520px', minWidth: 0 }}>
          <div className="card">
            <div className="card-body" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Invoice</div>
                  <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--gray-900)', fontFamily: 'monospace' }}>INV-{invoice.invoice_id}</div>
                  <div style={{ marginTop: 8 }}>{invoiceStatusBadge(invoice.status)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Invoice Date</div>
                  <div style={{ fontWeight: 600 }}>{invoice.invoice_date}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10, marginBottom: 4 }}>Patient</div>
                  <div style={{ fontWeight: 600 }}>{invoice.patient_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10, marginBottom: 4 }}>Doctor</div>
                  <div style={{ fontWeight: 600 }}>{invoice.doctor_name || '—'}</div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--gray-100)', margin: '24px 0' }} />

              <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--gray-800)' }}>Treatment Items</h4>
              {items.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>{sectionErrors['Treatment items'] ? 'Treatment items are unavailable.' : 'No items added.'}</p>
              ) : (
                <div className="table-container">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--gray-50)' }}>
                      <tr>
                        <th style={{ ...th, textAlign: 'left' }}>Treatment</th>
                        <th style={{ ...th, textAlign: 'center' }}>Qty</th>
                        <th style={{ ...th, textAlign: 'right' }}>Unit Price</th>
                        <th style={{ ...th, textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.invoice_item_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 500 }}>{item.treatment_name}</div>
                            {item.description && <div style={{ fontSize: 12, color: 'var(--gray-400)', fontFamily: 'monospace' }}>{item.description}</div>}
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 14px' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '12px 14px' }}>{money(item.unitprice)}</td>
                          <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 600 }}>{money(Number(item.unitprice) * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: 'var(--primary-50)' }}>
                      <tr>
                        <td colSpan={3} style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>Total</td>
                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>{money(invoice.total_amount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ padding: '8px 14px', textAlign: 'right', color: '#155a96', fontWeight: 600 }}>Insurance Approved (not a payment)</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: '#155a96', fontWeight: 600 }}>{money(invoice.insurance_covered)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>Net Recorded Receipts / Adjustments</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>– {money(invoice.amount_paid)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: Number(invoice.balance) > 0 ? 'var(--danger)' : 'var(--gray-500)' }}>Outstanding Balance</td>
                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, fontSize: 16, color: Number(invoice.balance) > 0 ? 'var(--danger)' : 'var(--success)' }}>{money(invoice.balance)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {!!invoice.insurance_pending && (
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 10 }}>
                  {money(invoice.insurance_pending)} is awaiting insurance approval. Approval is not settlement; the balance changes only through the payment ledger.
                </p>
              )}
            </div>
          </div>

          {claims.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Insurance Claims</h3></div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Claim</th><th>Provider</th><th>Date</th><th>Claimed</th><th>Approved</th><th>Status</th>{canEdit && <th>Action</th>}</tr></thead>
                  <tbody>
                    {claims.map(claim => (
                      <tr key={claim.claim_id}>
                        <td style={{ fontFamily: 'monospace' }}>CLM-{claim.claim_id}</td>
                        <td>{claim.provider_name || '—'}<div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Policy {claim.policy_number ?? `#${claim.policy_id}`}</div></td>
                        <td>{claim.claim_date}</td>
                        <td>{money(claim.claim_amount)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{money(claim.approved_amount)}</td>
                        <td><span className={`badge ${claim.status === 'Approved' ? 'badge-success' : claim.status === 'Pending' ? 'badge-warning' : 'badge-danger'}`}>{claim.status}</span></td>
                        {canEdit && (
                          <td>
                            {claim.status === 'Pending' && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-primary btn-sm" disabled={mutationsDisabled} onClick={() => settleClaim(claim, 'Approved')}>{updatingClaim === claim.claim_id ? 'Updating...' : 'Approve'}</button>
                                <button className="btn btn-danger btn-sm" disabled={mutationsDisabled} onClick={() => settleClaim(claim, 'Rejected')}>Reject</button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {canViewPayments && <div className="card">
            <div className="card-header">
              <h3 className="card-title">Payment History</h3>
              <span className="badge badge-gray">{payments.length}</span>
            </div>
            {payments.length === 0 ? (
              <div className="card-body"><p style={{ color: 'var(--gray-400)', fontSize: 13 }}>{sectionErrors['Payment history'] ? 'Payment history is unavailable.' : 'No payments recorded yet.'}</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.payment_id}>
                        <td>{p.payment_date}</td>
                        <td>{p.payment_type}</td>
                        <td style={{ fontWeight: 600, color: Number(p.amount) < 0 ? 'var(--danger)' : 'var(--success)' }}>{money(p.amount)}</td>
                        <td>{p.payment_method}</td>
                        <td style={{ color: 'var(--gray-500)' }}>{p.received_by_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 280px', minWidth: 0 }}>
          {canEdit && Number(invoice.balance) > 0 && (
            <div className="card">
              <div className="card-body">
                <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--gray-800)' }}>Record Payment</h4>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                  Outstanding: <strong style={{ color: 'var(--danger)' }}>{money(invoice.balance)}</strong>
                </p>
                <button className="btn btn-primary w-full" disabled={mutationsDisabled} onClick={() => { setPayAmount(''); setModalError(''); setPaymentNeedsReview(false); setShowPayModal(true); }}>Make Payment</button>
              </div>
            </div>
          )}

          {canEdit && Number(invoice.balance) > 0 && (
            <div className="card">
              <div className="card-body">
                <h4 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--gray-800)' }}>Insurance Claim</h4>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
                  {activePolicies.length ? `${activePolicies.length} polic${activePolicies.length > 1 ? 'ies' : 'y'} active on the invoice date.` : 'No policy is active on the invoice date.'}
                </p>
                <button className="btn btn-secondary w-full" disabled={mutationsDisabled || !activePolicies.length || remainingClaimAmount <= 0 || !!sectionErrors['Insurance claims'] || !!sectionErrors['Insurance policies']}
                  onClick={() => { setClaimForm({ policy_id: String(activePolicies[0]?.policy_id || ''), claim_amount: '', claim_date: localDate(0) }); setModalError(''); setShowClaimModal(true); }}>
                  File Claim
                </button>
              </div>
            </div>
          )}

          {isPatient && Number(invoice.balance) > 0 && (
            <div className="alert alert-warning">Please settle the balance of <strong>{money(invoice.balance)}</strong> at any MedSync branch reception.</div>
          )}

          <div className="card">
            <div className="card-body">
              <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--gray-800)' }}>Summary</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Appointment</span>
                  <span style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/appointments/${invoice.appointment_id}`)}>
                    #{invoice.appointment_id} ({invoice.appointment_date})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Insurance claims</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{claims.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Recorded net payments</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{money(invoice.amount_paid)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment</h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}></button>
            </div>
            <div className="modal-body">
              {modalError && <div className="alert alert-error">{modalError}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (Rs.) *</label>
                  <input type="number" className="form-control" min="0.01" max={invoice.balance} step="0.01"
                    placeholder={`Max: ${money(invoice.balance)}`} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
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
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPayAmount(String(invoice.balance))}>Pay full balance</button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePayment} disabled={paymentNeedsReview || mutationsDisabled || !payAmount || !Number.isFinite(Number(payAmount)) || Number(payAmount) <= 0 || Number(payAmount) > Number(invoice.balance)}>
                {paying ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing...</> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">File Insurance Claim</h3>
              <button className="modal-close" onClick={() => setShowClaimModal(false)}></button>
            </div>
            <form onSubmit={handleClaim}>
              <div className="modal-body">
                {modalError && <div className="alert alert-error">{modalError}</div>}
                <div className="form-group">
                  <label className="form-label">Policy *</label>
                  <select className="form-control" required value={claimForm.policy_id} onChange={e => setClaimForm({ ...claimForm, policy_id: e.target.value })}>
                    {activePolicies.map(p => <option key={p.policy_id} value={p.policy_id}>{p.provider_name} · #{p.policy_number}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Claim Amount (Rs.) *</label>
                  <input type="number" className="form-control" required min="0.01" step="0.01" max={remainingClaimAmount} value={claimForm.claim_amount}
                    onChange={e => setClaimForm({ ...claimForm, claim_amount: e.target.value })} placeholder={`Up to ${money(remainingClaimAmount)} unclaimed`} />
                </div>
                <div className="form-group">
                  <label className="form-label">Claim Date *</label>
                  <input type="date" className="form-control" required value={claimForm.claim_date} onChange={e => setClaimForm({ ...claimForm, claim_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowClaimModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={mutationsDisabled}>{claiming ? 'Submitting...' : 'Submit Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}
