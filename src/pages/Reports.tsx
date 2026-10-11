import React, { useState, useEffect, useMemo } from 'react';
import {
  reportsService,
  BranchAppointmentSummary,
  DoctorRevenueReport,
  OutstandingPatient,
  TreatmentCountReport,
  InsuranceSummary,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import {
  Download,
  RefreshCw,
  Calendar,
  FileText,
  CheckCircle2,
  DollarSign,
  Building2,
  Shield,
  Search,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Award,
} from 'lucide-react';

type ReportType = 'branch' | 'doctor_revenue' | 'outstanding' | 'treatment' | 'insurance';

export default function Reports() {
  const { user, hasRole } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>('branch');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Live Database States
  const [branchData, setBranchData] = useState<BranchAppointmentSummary[]>([]);
  const [doctorRevData, setDoctorRevData] = useState<DoctorRevenueReport[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingPatient[]>([]);
  const [treatmentData, setTreatmentData] = useState<TreatmentCountReport[]>([]);
  const [insuranceData, setInsuranceData] = useState<InsuranceSummary | null>(null);

  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: '',
    date: '',
  });

  const isAuthorized = hasRole(['admin', 'branch_manager']);

  const loadReport = async (type: ReportType, filter = dateFilter) => {
    setIsLoading(true);
    setError('');

    try {
      switch (type) {
        case 'branch': {
          const res = await reportsService.getBranchAppointmentSummary({
            date: filter.date || undefined,
            from_date: filter.from || undefined,
            to_date: filter.to || undefined,
          });
          setBranchData(res || []);
          break;
        }
        case 'doctor_revenue': {
          const res = await reportsService.getDoctorRevenue({
            from_date: filter.from || undefined,
            to_date: filter.to || undefined,
          });
          setDoctorRevData(res || []);
          break;
        }
        case 'outstanding': {
          const res = await reportsService.getOutstandingPatients();
          setOutstandingData(res || []);
          break;
        }
        case 'treatment': {
          const res = await reportsService.getTreatmentCounts({
            from_date: filter.from || undefined,
            to_date: filter.to || undefined,
          });
          setTreatmentData(res || []);
          break;
        }
        case 'insurance': {
          const res = await reportsService.getInsuranceSummary();
          setInsuranceData(res || null);
          break;
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not retrieve report from the database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadReport(activeReport);
    }
  }, [activeReport]);

  // Instant Search Filters
  const filteredBranch = useMemo(() => {
    if (!searchTerm) return branchData;
    return branchData.filter(r => r.branch_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [branchData, searchTerm]);

  const filteredDoctor = useMemo(() => {
    if (!searchTerm) return doctorRevData;
    return doctorRevData.filter(d =>
      d.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.branch_name && d.branch_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [doctorRevData, searchTerm]);

  const filteredOutstanding = useMemo(() => {
    if (!searchTerm) return outstandingData;
    return outstandingData.filter(p =>
      p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.contact_details && p.contact_details.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [outstandingData, searchTerm]);

  const filteredTreatment = useMemo(() => {
    if (!searchTerm) return treatmentData;
    return treatmentData.filter(t =>
      t.treatment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [treatmentData, searchTerm]);

  const formatLKR = (amount: number | string | undefined | null) => {
    return 'Rs. ' + Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const reportsConfig = [
    { key: 'branch' as const, label: '1. Branch Appointment Summary', desc: 'Daily throughput per branch categorized by status' },
    { key: 'doctor_revenue' as const, label: '2. Doctor Revenue Report', desc: 'Consultation revenue, billings, and collection efficiency' },
    { key: 'outstanding' as const, label: '3. Outstanding Balances', desc: 'Aging report of unpaid patient invoices and overdue receivables' },
    { key: 'treatment' as const, label: '4. Treatments by Category', desc: 'Clinical procedure demand volume and departmental revenue' },
    { key: 'insurance' as const, label: '5. Insurance vs Out-of-Pocket', desc: 'Claim settlement ratios vs direct patient cash settlements' },
  ];