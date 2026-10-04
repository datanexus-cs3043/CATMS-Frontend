import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  invoiceService, insuranceService, patientService, apiErrorMessage,
  Invoice, InvoiceItem, InsuranceClaim, InsurancePolicy, Payment,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { localDate } from '../services/mockData';
import { invoiceStatusBadge } from './Invoices';

const money = (n?: number) => `Rs. ${Number(n ?? 0).toLocaleString()}`;
const th: React.CSSProperties = { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' };

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isCashier, isPatient } = useAuth();
  const canEdit = isAdmin || isCashier;
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadError, setLoadError] = useState('');
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

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({ policy_id: '', claim_amount: '', claim_date: localDate(0) }); 

  const load = async () => {
    setIsLoading(true);
    try {
      const inv = await invoiceService.getById(invoiceId);
      setInvoice(inv);
      const [its, cls, pays, pols] = await Promise.allSettled([
        invoiceService.getItems(invoiceId),
        insuranceService.getClaims({ invoice_id: invoiceId }),
        invoiceService.getPayments(invoiceId),
        canEdit && inv.patient_id ? patientService.getInsurancePolicies(inv.patient_id) : Promise.resolve([]),
      ]);
      if (its.status === 'fulfilled') setItems(its.value);
      if (cls.status === 'fulfilled') setClaims(cls.value);
      if (pays.status === 'fulfilled') setPayments(pays.value);
      if (pols.status === 'fulfilled') setPolicies(pols.value);
    } catch (err) {
      setInvoice(null);
      setLoadError(apiErrorMessage(err, 'Invoice not found.'));
    } finally { setIsLoading(false); }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 5000);
  };

  const handlePayment = async () => {
    if (!invoice || !payAmount) return;
    setPaying(true);
    setModalError('');
    try {
      await invoiceService.makePayment(invoice.invoice_id, { amount: Number(payAmount), method: payMethod });
      setShowPayModal(false);
      flash('success', `Payment of ${money(Number(payAmount))} recorded.`);
      await load();
    } catch (err) {
      setModalError(apiErrorMessage(err, 'Payment failed'));
    } finally { setPaying(false); }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setModalError('');
    try {
      await insuranceService.createClaim({
        invoice_id: invoice.invoice_id,
        policy_id: Number(claimForm.policy_id),
        claim_amount: Number(claimForm.claim_amount),
        claim_date: claimForm.claim_date,
      });
      setShowClaimModal(false);
      flash('success', 'Insurance claim filed. It will reduce the balance once approved.');
      await load();
    } catch (err) {
      setModalError(apiErrorMessage(err, 'Claim failed'));
    }
  };

  const settleClaim = async (claim: InsuranceClaim, status: 'Approved' | 'Rejected') => {
    let approved: number | undefined;
    if (status === 'Approved') {
      const input = prompt(`Approved amount for CLM-${claim.claim_id} (max ${money(claim.claim_amount)}):`, String(claim.claim_amount));
      if (input === null) return;
      approved = Number(input);
      if (!(approved >= 0)) { flash('error', 'Enter a valid amount.'); return; }
    }
    try {
      await insuranceService.updateClaim(claim.claim_id, { status, approved_amount: approved });
      flash('success', `Claim ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      flash('error', apiErrorMessage(err));
    }
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

  const activePolicies = policies.filter(p => p.status === 'Active');

  

}