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
