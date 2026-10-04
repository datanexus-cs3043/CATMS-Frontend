import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoiceService, appointmentService, apiErrorMessage, Invoice, Appointment } from '../services/api';

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

  

}  
