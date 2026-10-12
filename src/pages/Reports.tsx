import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  reportsService,
  branchService,
  Branch,
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
  Activity,
  Award,
} from 'lucide-react';

type ReportType = 'branch' | 'doctor_revenue' | 'outstanding' | 'treatment' | 'insurance';
type ReportFilter = { from: string; to: string; date: string; branch_id: string };
type DoctorRevenueRow = DoctorRevenueReport & { branch_id: number };
type TreatmentRow = TreatmentCountReport & { category_id: number; treatment_id: number };

const validAmount = (value: unknown) =>
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));

const requireRows = (rows: unknown, textFields: string[], amountFields: string[], countFields: string[]) => {
  if (!Array.isArray(rows) || rows.some(row => !row ||
    textFields.some(key => typeof row[key] !== 'string') ||
    amountFields.some(key => !validAmount(row[key])) ||
    countFields.some(key => !validAmount(row[key]) || !Number.isSafeInteger(Number(row[key])) || Number(row[key]) < 0))) {
    throw new Error('Incomplete report data.');
  }
};

const describePeriod = (type: ReportType, filter: ReportFilter) => {
  if (type === 'branch' && filter.date) return `Appointment date: ${filter.date}`;
  const basis = type === 'branch' ? 'Appointment' : type === 'treatment' ? 'Completed visit' : 'Invoice';
  return filter.from || filter.to
    ? `${basis} period: ${filter.from || 'Start'} to ${filter.to || 'No upper bound'}`
    : `All ${basis.toLowerCase()} dates`;
};

// React escapes screen text; the separate print document needs the same protection.
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

export default function Reports() {
  const { user, hasRole } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>('branch');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState('');
  const [printError, setPrintError] = useState('');
  const [loadedReport, setLoadedReport] = useState<{ type: ReportType; filter: ReportFilter; owner: string; scope: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchError, setBranchError] = useState('');

  // Live Database States
  const [branchData, setBranchData] = useState<BranchAppointmentSummary[]>([]);
  const [doctorRevData, setDoctorRevData] = useState<DoctorRevenueRow[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingPatient[]>([]);
  const [treatmentData, setTreatmentData] = useState<TreatmentRow[]>([]);
  const [insuranceData, setInsuranceData] = useState<InsuranceSummary | null>(null);

  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: '',
    date: '',
    branch_id: '',
  });

  const isAuthorized = hasRole(['admin', 'branch_manager']);
  const isAdmin = hasRole(['admin']);
  const reportOwner = `${user?.user_id}:${user?.role}:${user?.branch_id}`;
  const requestVersion = useRef(0);

  useEffect(() => {
    let current = true;
    setBranches([]);
    setBranchError('');
    if (isAdmin) {
      branchService.getAll().then(rows => {
        requireRows(rows, ['branch_name'], [], ['branch_id']);
        if (current) setBranches(rows);
      }).catch(() => {
        if (current) setBranchError('Branch names could not be loaded. You can still select a branch by its ID.');
      });
    }
    return () => { current = false; };
  }, [isAdmin, user?.user_id]);

  const loadReport = async (type: ReportType, filter = dateFilter) => {
    if (!isAuthorized) return;
    const version = ++requestVersion.current;
    const isCurrent = () => requestVersion.current === version;
    const singleDay = type === 'branch' && !!filter.date;
    const appliedFilter = {
      from: singleDay ? '' : filter.from, to: singleDay ? '' : filter.to,
      date: singleDay ? filter.date : '', branch_id: isAdmin ? filter.branch_id : '',
    };
    setLoadedReport(null);
    setPrintError('');
    if (appliedFilter.from && appliedFilter.to && appliedFilter.from > appliedFilter.to) {
      setError('From date must not be after to date.');
      setIsLoading(false);
      return;
    }
    if (appliedFilter.branch_id && (!Number.isSafeInteger(Number(appliedFilter.branch_id)) || Number(appliedFilter.branch_id) <= 0)) {
      setError('Branch ID must be a positive whole number.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const period = {
        from_date: appliedFilter.from || undefined, to_date: appliedFilter.to || undefined,
        branch_id: appliedFilter.branch_id ? Number(appliedFilter.branch_id) : undefined,
      };
      switch (type) {
        case 'branch': {
          const res = await reportsService.getBranchAppointmentSummary({
            ...period, date: appliedFilter.date || undefined,
          });
          requireRows(res, ['branch_name', 'appointment_date'], [], ['branch_id', 'scheduled', 'completed', 'cancelled', 'total']);
          if (res.some(row => Number(row.total) !== Number(row.scheduled) + Number(row.completed) + Number(row.cancelled))) throw new Error('Unreconciled appointment statuses.');
          if (isCurrent()) setBranchData(res);
          break;
        }
        case 'doctor_revenue': {
          const res = await reportsService.getDoctorRevenue(period);
          requireRows(res, ['doctor_name', 'branch_name'], ['total_revenue', 'collected', 'avg_revenue'], ['doctor_id', 'branch_id', 'appointment_count']);
          if (isCurrent()) setDoctorRevData(res as DoctorRevenueRow[]);
          break;
        }
        case 'outstanding': {
          const res = await reportsService.getOutstandingPatients(period);
          requireRows(res, ['patient_name'], ['total_outstanding'], ['patient_id', 'invoice_count']);
          if (isCurrent()) setOutstandingData(res);
          break;
        }
        case 'treatment': {
          const res = await reportsService.getTreatmentCounts(period);
          requireRows(res, ['category_name', 'treatment_name'], ['total_revenue'], ['category_id', 'treatment_id', 'count']);
          if (isCurrent()) setTreatmentData(res as TreatmentRow[]);
          break;
        }
        case 'insurance': {
          const res = await reportsService.getInsuranceSummary(period);
          if (!res || ['invoiced_amount', 'insurance_approved_amount', 'patient_paid_amount', 'out_of_pocket_amount', 'outstanding_amount']
            .some(key => !validAmount(res[key as keyof InsuranceSummary]))) {
            throw new Error('Missing insurance summary.');
          }
          if (isCurrent()) setInsuranceData(res);
          break;
        }
      }
      const branch = branches.find(item => String(item.branch_id) === appliedFilter.branch_id);
      const scope = !isAdmin ? `Assigned branch #${user?.branch_id}` : appliedFilter.branch_id
        ? `Branch #${appliedFilter.branch_id}${branch ? ` (${branch.branch_name})` : ''}` : 'All branches';
      if (isCurrent()) setLoadedReport({ type, filter: appliedFilter, owner: reportOwner, scope });
    } catch (err: any) {
      if (isCurrent()) {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Could not retrieve report from the database.');
      }
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadReport(activeReport);
    }
    return () => { requestVersion.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport, isAuthorized, reportOwner]);

  const hasLoadedReport = loadedReport?.type === activeReport && loadedReport.owner === reportOwner;
  const canPrint = isAuthorized && !isLoading && !error && hasLoadedReport;

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

  const treatmentCategories = useMemo(() => {
    const categories = new Map<number, { category_id: number; category_name: string; count: number; total_revenue: number }>();
    for (const treatment of filteredTreatment) {
      const category = categories.get(treatment.category_id) || {
        category_id: treatment.category_id, category_name: treatment.category_name, count: 0, total_revenue: 0,
      };
      category.count += Number(treatment.count);
      category.total_revenue += Number(treatment.total_revenue);
      categories.set(treatment.category_id, category);
    }
    return [...categories.values()];
  }, [filteredTreatment]);

  const formatLKR = (amount: number | string | undefined | null) => {
    if (amount == null || amount === '' || !Number.isFinite(Number(amount))) return 'Unavailable';
    return 'Rs. ' + Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // This presentation-only estimate is not the API's legacy net-payment alias.
  const estimatedPatientExposure = insuranceData
    ? Number(insuranceData.invoiced_amount) - Number(insuranceData.insurance_approved_amount)
    : null;

  const reportsConfig = [
    { key: 'branch' as const, label: '1. Branch Appointment Summary', desc: 'Daily throughput per branch categorized by status' },
    { key: 'doctor_revenue' as const, label: '2. Doctor Revenue Report', desc: 'Invoiced service revenue and current net patient payments per doctor' },
    { key: 'outstanding' as const, label: '3. Outstanding Balances', desc: 'Unpaid invoice balances by patient, filtered by invoice date' },
    { key: 'treatment' as const, label: '4. Treatments by Category', desc: 'Completed treatment units, category totals and recorded service value' },
    { key: 'insurance' as const, label: '5. Insurance vs Out-of-Pocket', desc: 'Billed amounts, claim approvals, net patient payments and estimated exposure' },
  ];

  // ── Executive SVG Donut Helper ───────────────────────────────────────────────
  const renderSvgDonut = (segments: { label: string; value: number; color: string }[], centerLabel: string, centerVal: string) => {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return null;

    let accumulatedPct = 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.8" />
            {segments.map((seg, i) => {
              const pct = (seg.value / total) * 100;
              const strokeDasharray = `${pct} ${100 - pct}`;
              const strokeDashoffset = -accumulatedPct;
              accumulatedPct += pct;
              return (
                <circle
                  key={i}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="3.8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              );
            })}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.1 }}>{centerVal}</span>
            <span style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>{centerLabel}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 160 }}>
          {segments.map((seg, i) => {
            const pct = ((seg.value / total) * 100).toFixed(1);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{seg.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{seg.value}</span>
                  <span style={{ color: 'var(--gray-400)', fontSize: 11, width: 36, textAlign: 'right' }}>({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Native printing retains the executive layout; saving as PDF is a browser choice.
  const downloadReportAsPDF = () => {
    if (!canPrint || !loadedReport || isGeneratingPdf) return;
    const appliedFilter = loadedReport.filter;
    const periodDescription = describePeriod(activeReport, appliedFilter);
    setPrintError('');
    setIsGeneratingPdf(true);
    const dateStamp = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const reportRefId = `MDS-REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const officerName = user?.username ? user.username.toUpperCase() : 'MANAGEMENT ADMINISTRATOR';
    const roleTitle = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'ADMINISTRATOR';

    let title = '';
    let filterDescription = '';
    let kpiHtml = '';
    let chartHtml = '';
    let tableHtml = '';

    if (activeReport === 'branch') {
      title = 'BRANCH-WISE APPOINTMENT THROUGHPUT & STATUS AUDIT';
      filterDescription = periodDescription;
      const grandTotal = filteredBranch.reduce((acc, r) => acc + Number(r.total || 0), 0);
      const totCompleted = filteredBranch.reduce((acc, r) => acc + Number(r.completed || 0), 0);
      const totScheduled = filteredBranch.reduce((acc, r) => acc + Number(r.scheduled || 0), 0);
      const totCancelled = filteredBranch.reduce((acc, r) => acc + Number(r.cancelled || 0), 0);
      const compRate = grandTotal > 0 ? ((totCompleted / grandTotal) * 100).toFixed(1) : '0.0';

      kpiHtml = `
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-val">${grandTotal}</div><div class="kpi-lbl">Total Appointments</div></div>
          <div class="kpi-card kpi-success"><div class="kpi-val">${totCompleted}</div><div class="kpi-lbl">Completed (${compRate}%)</div></div>
          <div class="kpi-card kpi-primary"><div class="kpi-val">${totScheduled}</div><div class="kpi-lbl">Scheduled</div></div>
          <div class="kpi-card kpi-danger"><div class="kpi-val">${totCancelled}</div><div class="kpi-lbl">Cancelled</div></div>
        </div>
      `;

      chartHtml = `
        <div class="chart-panel">
          <div class="chart-header">Facility Throughput & Status Distribution</div>
          ${filteredBranch.map(b => {
            const tot = Number(b.total) || 1;
            const cPct = ((Number(b.completed) / tot) * 100).toFixed(1);
            const sPct = ((Number(b.scheduled) / tot) * 100).toFixed(1);
            const xPct = ((Number(b.cancelled) / tot) * 100).toFixed(1);
            return `
              <div style="margin-bottom: 9px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; font-weight: 600;">
                  <span>${escapeHtml(b.branch_name)} (${escapeHtml(b.total)} visits) • ${escapeHtml(b.appointment_date)}</span>
                  <span style="color: #1c7c54;">${cPct}% Completed</span>
                </div>
                <div style="display: flex; height: 9px; border-radius: 4px; overflow: hidden; background: #e2e8f0;">
                  <div style="width: ${cPct}%; background: #1c7c54;"></div>
                  <div style="width: ${sPct}%; background: #1d6fb8;"></div>
                  <div style="width: ${xPct}%; background: #c2372f;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Branch Facility</th>
              <th>Date</th>
              <th class="text-center">Scheduled</th>
              <th class="text-center">Completed</th>
              <th class="text-center">Cancelled</th>
              <th class="text-right">Total Visits</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBranch.map(r => `
              <tr>
                <td style="font-weight: 600; color: #0f2e4f;">${escapeHtml(r.branch_name)}</td>
                <td>${escapeHtml(r.appointment_date)}</td>
                <td class="text-center" style="color: #155a96; font-weight: 600;">${escapeHtml(r.scheduled)}</td>
                <td class="text-center" style="color: #1c7c54; font-weight: 700;">${escapeHtml(r.completed)}</td>
                <td class="text-center" style="color: #c2372f;">${escapeHtml(r.cancelled)}</td>
                <td class="text-right font-bold">${escapeHtml(r.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="2">Consolidated Totals</td>
              <td class="text-center" style="color: #155a96;">${totScheduled}</td>
              <td class="text-center" style="color: #1c7c54;">${totCompleted}</td>
              <td class="text-center" style="color: #c2372f;">${totCancelled}</td>
              <td class="text-right font-bold">${grandTotal}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (activeReport === 'doctor_revenue') {
      title = 'PHYSICIAN CLINICAL REVENUE & PRODUCTIVITY AUDIT';
      filterDescription = periodDescription;
      const grandTotalBilled = filteredDoctor.reduce((acc, d) => acc + Number(d.total_revenue || 0), 0);
      const grandCollected = filteredDoctor.reduce((acc, d) => acc + Number(d.collected ?? NaN), 0);
      const grandVisits = filteredDoctor.reduce((acc, d) => acc + Number(d.appointment_count || 0), 0);
      const overallAvg = grandVisits > 0 ? grandTotalBilled / grandVisits : 0;
      const maxDoctorBilled = Math.max(...filteredDoctor.map(d => Number(d.total_revenue) || 0), 1);

      kpiHtml = `
        <div class="kpi-grid">
          <div class="kpi-card kpi-primary"><div class="kpi-val">${formatLKR(grandTotalBilled)}</div><div class="kpi-lbl">Total Billed Revenue</div></div>
          <div class="kpi-card kpi-success"><div class="kpi-val">${formatLKR(grandCollected)}</div><div class="kpi-lbl">Net Patient Payments</div></div>
          <div class="kpi-card"><div class="kpi-val">${grandVisits}</div><div class="kpi-lbl">Invoiced Patient Visits</div></div>
          <div class="kpi-card"><div class="kpi-val">${formatLKR(overallAvg)}</div><div class="kpi-lbl">Avg Revenue / Visit</div></div>
        </div>
      `;

      chartHtml = `
        <div class="chart-panel">
          <div class="chart-header">Physician Revenue Contribution Distribution</div>
          ${filteredDoctor.map((d, i) => {
            const barW = ((Number(d.total_revenue) / maxDoctorBilled) * 100).toFixed(1);
            const share = grandTotalBilled > 0 ? ((Number(d.total_revenue) / grandTotalBilled) * 100).toFixed(1) : '0';
            return `
              <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; font-weight: 600;">
                  <span>#${i + 1} ${escapeHtml(d.doctor_name)} (${escapeHtml(d.branch_name)} • #${escapeHtml(d.branch_id)})</span>
                  <span style="color: #1c7c54;">${formatLKR(d.total_revenue)} (${share}% share)</span>
                </div>
                <div style="height: 10px; border-radius: 4px; background: #e2e8f0; overflow: hidden;">
                  <div style="width: ${barW}%; height: 100%; background: #155a96;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Physician</th>
              <th>Visit Branch</th>
              <th class="text-center">Visits</th>
              <th class="text-right">Total Billed</th>
              <th class="text-right">Net Patient Payments</th>
              <th class="text-right">Avg / Visit</th>
            </tr>
          </thead>
          <tbody>
            ${filteredDoctor.map(d => `
              <tr>
                <td style="font-weight: 600; color: #0f2e4f;">${escapeHtml(d.doctor_name)}</td>
                <td>${escapeHtml(d.branch_name)} • #${escapeHtml(d.branch_id)}</td>
                <td class="text-center">${escapeHtml(d.appointment_count)}</td>
                <td class="text-right font-bold text-success">${formatLKR(d.total_revenue)}</td>
                <td class="text-right">${formatLKR(d.collected)}</td>
                <td class="text-right">${formatLKR(d.avg_revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="2">Consolidated Totals</td>
              <td class="text-center font-bold">${grandVisits}</td>
              <td class="text-right font-bold text-success">${formatLKR(grandTotalBilled)}</td>
              <td class="text-right font-bold">${formatLKR(grandCollected)}</td>
              <td class="text-right font-bold">${formatLKR(overallAvg)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (activeReport === 'outstanding') {
      title = 'PATIENT OUTSTANDING INVOICE BALANCES';
      filterDescription = periodDescription;
      const grandOutstanding = filteredOutstanding.reduce((acc, p) => acc + Number(p.total_outstanding || 0), 0);
      const grandInvoices = filteredOutstanding.reduce((acc, p) => acc + Number(p.invoice_count || 0), 0);

      kpiHtml = `
        <div class="kpi-grid">
          <div class="kpi-card kpi-danger"><div class="kpi-val">${formatLKR(grandOutstanding)}</div><div class="kpi-lbl">Total Outstanding</div></div>
          <div class="kpi-card"><div class="kpi-val">${filteredOutstanding.length}</div><div class="kpi-lbl">Accounts With Balances</div></div>
          <div class="kpi-card"><div class="kpi-val">${grandInvoices}</div><div class="kpi-lbl">Unsettled Invoices</div></div>
          <div class="kpi-card"><div class="kpi-val">${formatLKR(filteredOutstanding.length ? grandOutstanding / filteredOutstanding.length : 0)}</div><div class="kpi-lbl">Avg Outstanding / Account</div></div>
        </div>
      `;

      chartHtml = `
        <div class="chart-panel">
          <div class="chart-header">Top Debtor Concentration Risk</div>
          ${filteredOutstanding.slice(0, 5).map(p => {
            const share = grandOutstanding > 0 ? ((Number(p.total_outstanding) / grandOutstanding) * 100).toFixed(1) : '0';
            return `
              <div style="margin-bottom: 7px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; font-weight: 600;">
                  <span>${escapeHtml(p.patient_name)}</span>
                  <span style="color: #c2372f;">${formatLKR(p.total_outstanding)} (${share}% of debt)</span>
                </div>
                <div style="height: 8px; border-radius: 3px; background: #fee2e2; overflow: hidden;">
                  <div style="width: ${share}%; height: 100%; background: #c2372f;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Contact Details</th>
              <th class="text-center">Unpaid Invoices</th>
              <th class="text-right">Outstanding Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOutstanding.map(p => `
              <tr>
                <td style="font-weight: 600; color: #0f2e4f;">${escapeHtml(p.patient_name)}</td>
                <td>${escapeHtml(p.contact_details || '—')}</td>
                <td class="text-center"><span class="badge badge-danger">${escapeHtml(p.invoice_count)} invoice(s)</span></td>
                <td class="text-right font-bold text-danger">${formatLKR(p.total_outstanding)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="2">Total Receivables Portfolio</td>
              <td class="text-center font-bold">${grandInvoices}</td>
              <td class="text-right font-bold text-danger">${formatLKR(grandOutstanding)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (activeReport === 'treatment') {
      title = 'TREATMENT UNITS BY CATEGORY & RECORDED SERVICE VALUE';
      filterDescription = periodDescription;
      const grandProcedures = filteredTreatment.reduce((acc, t) => acc + Number(t.count || 0), 0);
      const grandRevenue = filteredTreatment.reduce((acc, t) => acc + Number(t.total_revenue || 0), 0);
      const maxCount = Math.max(...filteredTreatment.map(t => Number(t.count) || 0), 1);

      kpiHtml = `
        <div class="kpi-grid">
          <div class="kpi-card kpi-primary"><div class="kpi-val">${grandProcedures}</div><div class="kpi-lbl">Total Procedures Performed</div></div>
          <div class="kpi-card kpi-success"><div class="kpi-val">${formatLKR(grandRevenue)}</div><div class="kpi-lbl">Recorded Service Value</div></div>
          <div class="kpi-card"><div class="kpi-val">${treatmentCategories.length}</div><div class="kpi-lbl">Treatment Categories</div></div>
          <div class="kpi-card"><div class="kpi-val">${formatLKR(grandProcedures > 0 ? grandRevenue / grandProcedures : 0)}</div><div class="kpi-lbl">Avg Service Value / Unit</div></div>
        </div>
      `;

      chartHtml = `
        <div class="chart-panel">
          <div class="chart-header">Clinical Demand & Frequency Distribution</div>
          ${filteredTreatment.slice(0, 6).map(t => {
            const barW = ((Number(t.count) / maxCount) * 100).toFixed(1);
            return `
              <div style="margin-bottom: 7px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; font-weight: 600;">
                  <span>${escapeHtml(t.treatment_name)} <small style="color: #64748b;">(${escapeHtml(t.category_name)})</small></span>
                  <span>${escapeHtml(t.count)} units • ${formatLKR(t.total_revenue)}</span>
                </div>
                <div style="height: 8px; border-radius: 3px; background: #e2e8f0; overflow: hidden;">
                  <div style="width: ${barW}%; height: 100%; background: #0f4575;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      tableHtml = `
        <h3>Category totals for matching procedures</h3>
        <table>
          <thead><tr><th>Treatment Category</th><th class="text-center">Units Performed</th><th class="text-right">Recorded Service Value</th></tr></thead>
          <tbody>${treatmentCategories.map(category => `
            <tr><td>${escapeHtml(category.category_name)} • #${escapeHtml(category.category_id)}</td><td class="text-center">${category.count}</td><td class="text-right">${formatLKR(category.total_revenue)}</td></tr>
          `).join('')}</tbody>
        </table>
        <h3>Procedure detail</h3>
        <table>
          <thead>
            <tr>
              <th>Treatment Category</th>
              <th>Clinical Procedure</th>
              <th class="text-center">Units Performed</th>
              <th class="text-right">Recorded Service Value</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTreatment.map(t => `
              <tr>
                <td><span class="badge badge-info">${escapeHtml(t.category_name)} • #${escapeHtml(t.category_id)}</span></td>
                <td style="font-weight: 600; color: #0f2e4f;">${escapeHtml(t.treatment_name)}</td>
                <td class="text-center font-bold">${escapeHtml(t.count)}</td>
                <td class="text-right font-bold text-success">${formatLKR(t.total_revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="2">Consolidated Clinical Totals</td>
              <td class="text-center font-bold">${grandProcedures}</td>
              <td class="text-right font-bold text-success">${formatLKR(grandRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (activeReport === 'insurance') {
      title = 'INSURANCE APPROVALS, PATIENT PAYMENTS & ESTIMATED EXPOSURE';
      filterDescription = periodDescription;
      if (!insuranceData) { setIsGeneratingPdf(false); return; }
      const ins = insuranceData;

      kpiHtml = `
        <div class="kpi-grid">
          <div class="kpi-card kpi-primary"><div class="kpi-val">${formatLKR(ins.invoiced_amount)}</div><div class="kpi-lbl">Total Invoiced Amount</div></div>
          <div class="kpi-card kpi-success"><div class="kpi-val">${formatLKR(ins.insurance_approved_amount)}</div><div class="kpi-lbl">Insurance Approved (not cash)</div></div>
          <div class="kpi-card"><div class="kpi-val">${formatLKR(ins.patient_paid_amount)}</div><div class="kpi-lbl">Patient Payments (net)</div></div>
          <div class="kpi-card"><div class="kpi-val">${formatLKR(estimatedPatientExposure)}</div><div class="kpi-lbl">Estimated Patient Exposure</div></div>
          <div class="kpi-card kpi-danger"><div class="kpi-val">${formatLKR(ins.outstanding_amount)}</div><div class="kpi-lbl">Uncollected Outstanding</div></div>
        </div>
      `;

      chartHtml = `
        <div class="chart-panel">
          <div class="chart-header">Separate financial measures — not a settlement split</div>
          <p>Claim approval is not a received payment and does not automatically reduce invoice balances.
          Estimated patient exposure = invoiced amount minus approved claims. It is not money already collected
          or the current outstanding balance, and does not establish who will ultimately settle the bill.
          Net patient payments include recorded refunds and adjustments; balances reflect current ledger values.</p>
        </div>
      `;

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Financial Component</th>
              <th>Category Details</th>
              <th class="text-center">Status</th>
              <th class="text-right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 700; color: #0f2e4f;">Insurance Approved (not cash)</td>
              <td>Approved claim amounts; insurer receipt is not established</td>
              <td class="text-center"><span class="badge badge-success">Approved</span></td>
              <td class="text-right font-bold text-success">${formatLKR(ins.insurance_approved_amount)}</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #0f2e4f;">Estimated Patient Exposure</td>
              <td>Invoiced amount minus approved claims; not payments or current balance</td>
              <td class="text-center"><span class="badge badge-info">Estimate</span></td>
              <td class="text-right font-bold">${formatLKR(estimatedPatientExposure)}</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #0f2e4f;">Patient Payments (net)</td>
              <td>Recorded payments, refunds and adjustments</td>
              <td class="text-center"><span class="badge badge-info">Recorded</span></td>
              <td class="text-right font-bold">${formatLKR(ins.patient_paid_amount)}</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #0f2e4f;">Pending Invoices / Uncollected</td>
              <td>Outstanding dues pending patient or insurer settlement</td>
              <td class="text-center"><span class="badge badge-danger">Uncollected</span></td>
              <td class="text-right font-bold text-danger">${formatLKR(ins.outstanding_amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="3">Total Invoiced Portfolio</td>
              <td class="text-right font-bold text-primary">${formatLKR(ins.invoiced_amount)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    const printableDocument = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title} - MedSync Executive Audit</title>
        <style>
          @page { size: A4 landscape; margin: 11mm 14mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 14px; font-size: 12px; line-height: 1.4; }
          .header-banner { border-bottom: 2.5px solid #0f2e4f; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
          .logo-group { display: flex; align-items: center; gap: 12px; }
          .logo-icon { width: 34px; height: 34px; background: #0f2e4f; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; }
          .logo-title { font-size: 20px; font-weight: 800; color: #0f2e4f; letter-spacing: -0.02em; }
          .logo-sub { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .header-meta { text-align: right; font-size: 10.5px; color: #475569; line-height: 1.5; }
          .report-bar { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #155a96; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; }
          .report-bar h2 { font-size: 13.5px; color: #0f2e4f; font-weight: 800; text-transform: uppercase; }
          .report-bar span { font-size: 11px; color: #64748b; font-weight: 600; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
          .kpi-val { font-size: 17px; font-weight: 800; color: #0f172a; }
          .kpi-lbl { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.03em; }
          .kpi-primary .kpi-val { color: #155a96; }
          .kpi-success .kpi-val { color: #1c7c54; }
          .kpi-danger .kpi-val { color: #c2372f; }
          .chart-panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
          .chart-header { font-size: 11px; font-weight: 700; color: #0f2e4f; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
          th { background: #0f2e4f; color: #ffffff; text-align: left; padding: 7px 9px; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.02em; border: 1px solid #0f2e4f; }
          td { padding: 6px 9px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; color: #334155; }
          tbody tr:nth-child(even) { background-color: #f8fafc; }
          .totals-row td { background-color: #f1f5f9; font-weight: 700; border-top: 2px solid #0f2e4f; border-bottom: 2px solid #0f2e4f; color: #0f172a; font-size: 12px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .footer-section { margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9.5px; color: #64748b; }
          .sig-box { display: flex; gap: 40px; }
          .sig-line { width: 160px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; font-weight: 600; color: #334155; }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="logo-group">
            <div class="logo-icon">+</div>
            <div>
              <div class="logo-title">MEDSYNC HEALTHCARE SYSTEMS</div>
              <div class="logo-sub">Central Clinical Intelligence • Board Audit Suite</div>
            </div>
          </div>
          <div class="header-meta">
            <div><strong>Ref ID:</strong> ${reportRefId}</div>
            <div><strong>Executive:</strong> ${escapeHtml(officerName)} (${escapeHtml(roleTitle)})</div>
            <div><strong>Generated:</strong> ${dateStamp}</div>
            <div><strong>Status:</strong> Official Confidential Record</div>
          </div>
        </div>

        <div class="report-bar">
          <h2>${title}</h2>
          <span>${escapeHtml(filterDescription)} • ${escapeHtml(loadedReport.scope)}${activeReport !== 'insurance' && searchTerm ? ` • Record filter: ${escapeHtml(searchTerm)}` : ''}</span>
        </div>

        ${kpiHtml}
        ${chartHtml}
        ${tableHtml}
        <p>${activeReport === 'doctor_revenue' || activeReport === 'outstanding' || activeReport === 'insurance'
          ? 'Invoice issue dates select the invoices; payments, approvals and balances are current values, not a historical period-end snapshot. Net payments include refunds and adjustments.'
          : activeReport === 'treatment' ? 'Counts are treatment units on completed appointment dates. Recorded service value uses captured treatment-line prices and does not establish invoicing or payment.' : 'Counts reflect the current appointment status for each appointment day.'}</p>

        <div class="footer-section">
          <div>
            <p><strong>MedSync CATMS Enterprise Clinical System</strong> • Proprietary Management Intelligence</p>
            <p>CONFIDENTIAL: Authorized Board of Directors and Clinical Administration review only.</p>
          </div>
          <div class="sig-box">
            <div class="sig-line">Chief Medical Officer (CMO)</div>
            <div class="sig-line">Director of Finance & Operations</div>
          </div>
        </div>
      </body>
      </html>
    `;

    let printWin: Window | null;
    try { printWin = window.open('', '_blank', 'width=1100,height=850'); }
    catch {
      setPrintError('Could not open the print window. Choose Print / Save as PDF again.');
      setIsGeneratingPdf(false);
      return;
    }
    if (printWin) {
      try {
      printWin.document.open();
      printWin.document.write(printableDocument);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        try {
          if (printWin.closed) throw new Error('Print window closed.');
          printWin.print();
        } catch {
          setPrintError('Could not open the print dialog. Choose Print / Save as PDF again.');
        } finally { setIsGeneratingPdf(false); }
      }, 350);
      } catch {
        setPrintError('Could not prepare the print window. Choose Print / Save as PDF again.');
        setIsGeneratingPdf(false);
      }
    } else {
      setPrintError('The print window was blocked. Allow pop-ups for this site, then choose Print / Save as PDF again.');
      setIsGeneratingPdf(false);
    }
  };

  // Access Control Screen
  if (!isAuthorized) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '40px 32px' }}>
          <div style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: 'var(--danger-light)', color: 'var(--danger)', marginBottom: 16 }}>
            <ShieldAlert size={40} />
          </div>
          <h2 style={{ fontSize: 22, color: 'var(--gray-900)', marginBottom: 8 }}>Access Restricted</h2>
          <p style={{ color: 'var(--gray-600)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Executive management reports contain sensitive hospital revenue, patient dues, and doctor performance analytics.
            Access is restricted to <strong>Administrator</strong> and <strong>Branch Manager</strong> personnel only.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--gray-100)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gray-700)' }}>
            <Shield size={16} /> Current Role: <strong>{user?.role ? user.role.replace('_', ' ') : 'Unauthorized'}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* ── Executive Header Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b2e4f 0%, #155a96 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          color: '#ffffff',
          marginBottom: 20,
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              +
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Executive Management Intelligence
            </h1>
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Board Access
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85, maxWidth: 650 }}>
            Live clinical database telemetry, financial collection metrics, branch throughput, and receivables risk monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.9 }}>
            <div>Signed in as: <strong>{user?.username}</strong></div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Role: {user?.role ? user.role.replace('_', ' ').toUpperCase() : 'MANAGEMENT'}</div>
          </div>
          <button
            onClick={downloadReportAsPDF}
            disabled={isGeneratingPdf || !canPrint}
            style={{
              background: '#ffffff',
              color: '#0b2e4f',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'var(--transition)',
            }}
          >
            <Download size={15} />
            {isGeneratingPdf ? 'Opening print dialog...' : 'Print / Save as PDF'}
          </button>
        </div>
      </div>

      <div className="report-layout">
        {/* Navigation Sidebar */}
        <nav className="card report-menu" aria-label="Management Reports Navigation">
          <div className="card-header" style={{ padding: '14px 18px' }}>
            <h3 className="card-title" style={{ fontSize: 14 }}>Clinical Reports Dossier</h3>
          </div>
          {reportsConfig.map((r, i) => (
            <button
              key={r.key}
              className={`report-menu-item${activeReport === r.key ? ' active' : ''}`}
              onClick={() => {
                setActiveReport(r.key);
                setSearchTerm('');
              }}
              aria-current={activeReport === r.key}
            >
              <span className="report-menu-num">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="report-menu-label">{r.label.replace(/^\d+\.\s*/, '')}</span>
                <span className="report-menu-desc">{r.desc}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* Content Pane */}
        <div style={{ minWidth: 0 }}>
          {/* Filter & Toolbar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} style={{ color: 'var(--primary)' }} /> Audit Window:
                  </span>

                  {isAdmin ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      Branch
                      {branchError ? (
                        <input type="number" min="1" step="1" aria-label="Branch ID (blank for all branches)"
                          className="form-control" style={{ width: 150 }} placeholder="All branches"
                          value={dateFilter.branch_id} onChange={e => setDateFilter({ ...dateFilter, branch_id: e.target.value })} />
                      ) : (
                        <select aria-label="Report branch" className="form-control" style={{ width: 'auto', maxWidth: 220 }}
                          value={dateFilter.branch_id} onChange={e => setDateFilter({ ...dateFilter, branch_id: e.target.value })}>
                          <option value="">All branches</option>
                          {dateFilter.branch_id && !branches.some(branch => String(branch.branch_id) === dateFilter.branch_id) &&
                            <option value={dateFilter.branch_id}>Branch #{dateFilter.branch_id}</option>}
                          {branches.map(branch => <option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name} • #{branch.branch_id}</option>)}
                        </select>
                      )}
                    </label>
                  ) : <span style={{ fontSize: 12 }}>Assigned branch #{user?.branch_id ?? 'unassigned'}</span>}

                  {activeReport === 'branch' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    One day (overrides range)
                    <input
                      aria-label="Appointment day"
                      type="date"
                      className="form-control"
                      style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
                      value={dateFilter.date}
                      onChange={e => setDateFilter({ ...dateFilter, date: e.target.value })}
                    />
                    </label>
                  )}
                  {(
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>From</span>
                        <input
                          aria-label="Report from date"
                          type="date"
                          className="form-control"
                          style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
                          value={dateFilter.from}
                          disabled={activeReport === 'branch' && !!dateFilter.date}
                          onChange={e => setDateFilter({ ...dateFilter, from: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>To</span>
                        <input
                          aria-label="Report to date"
                          type="date"
                          className="form-control"
                          style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
                          value={dateFilter.to}
                          disabled={activeReport === 'branch' && !!dateFilter.date}
                          onChange={e => setDateFilter({ ...dateFilter, to: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <button className="btn btn-primary btn-sm" onClick={() => loadReport(activeReport)}>
                    <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
                    Run Query
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const cleared = { from: '', to: '', date: '', branch_id: '' };
                      setDateFilter(cleared);
                      loadReport(activeReport, cleared);
                    }}
                  >
                    Clear Filter
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--gray-400)' }} />
                    <input
                      type="text"
                      placeholder="Filter records..."
                      className="form-control"
                      style={{ width: 220, fontSize: 13, padding: '6px 10px 6px 30px' }}
                      value={searchTerm}
                      disabled={activeReport === 'insurance'}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--gray-600)' }}>
                {activeReport === 'branch' ? 'Dates refer to appointment days.' : activeReport === 'treatment' ? 'Dates refer to completed appointment days.' : 'Dates refer to invoice issue dates; payments and balances reflect their current recorded values.'}
              </p>
              {branchError && isAdmin && <p role="status" style={{ marginTop: 8, fontSize: 13 }}>{branchError}</p>}
              {hasLoadedReport && loadedReport && <p role="status" style={{ marginTop: 8, fontSize: 13 }}>
                Loaded: {describePeriod(loadedReport.type, loadedReport.filter)} • {loadedReport.scope}.
                {' '}Changing controls takes effect when you choose Run Query.
              </p>}
            </div>
          </div>

          {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
          {printError && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{printError}</div>}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: 68, borderRadius: 'var(--radius)' }} />
              ))}
            </div>
          ) : !error && hasLoadedReport && (
            <>
              {/* ───────────────────────────────────────────────────────────
                  1. BRANCH APPOINTMENT SUMMARY
                  ─────────────────────────────────────────────────────────── */}
              {activeReport === 'branch' && (
                <div className="card" style={{ border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                        Branch Operational Throughput
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '3px 0 0' }}>
                        Daily consultation volumes, completion efficiencies, and status distributions across network facilities.
                      </p>
                    </div>

                    {(() => {
                      const grandTotal = filteredBranch.reduce((acc, r) => acc + Number(r.total || 0), 0);
                      const grandCompleted = filteredBranch.reduce((acc, r) => acc + Number(r.completed || 0), 0);
                      const avgRate = grandTotal > 0 ? ((grandCompleted / grandTotal) * 100).toFixed(1) : '0.0';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--success-light)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(28, 124, 84, 0.2)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--success)' }}>
                            Network Completion Rate: {avgRate}%
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--gray-200)', borderBottom: '1px solid var(--gray-200)' }}>
                    <div style={{ background: '#ffffff', padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Appointments</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-900)', marginTop: 2 }}>
                        {filteredBranch.reduce((acc, r) => acc + Number(r.total || 0), 0)}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completed Visits</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
                        {filteredBranch.reduce((acc, r) => acc + Number(r.completed || 0), 0)}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scheduled</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                        {filteredBranch.reduce((acc, r) => acc + Number(r.scheduled || 0), 0)}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cancelled</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)', marginTop: 2 }}>
                        {filteredBranch.reduce((acc, r) => acc + Number(r.cancelled || 0), 0)}
                      </div>
                    </div>
                  </div>

                  {filteredBranch.length > 0 && (
                    <div style={{ padding: '20px 24px', background: '#ffffff', borderBottom: '1px solid var(--gray-200)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Facility Performance Breakdown
                        </span>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 500, color: 'var(--gray-600)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--success)' }} /> Completed
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--primary)' }} /> Scheduled
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--danger)' }} /> Cancelled
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filteredBranch.map(b => {
                          const tot = Number(b.total) || 1;
                          const cPct = (Number(b.completed) / tot) * 100;
                          const sPct = (Number(b.scheduled) / tot) * 100;
                          const xPct = (Number(b.cancelled) / tot) * 100;
                          return (
                            <div key={`${b.appointment_date}-${b.branch_id}`} style={{ background: 'var(--off-white)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Building2 size={16} style={{ color: 'var(--primary)' }} />
                                  <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{b.branch_name}</span>
                                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>• {b.appointment_date}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                                    <strong>{b.total}</strong> visits
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', background: '#ffffff', padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(28, 124, 84, 0.2)' }}>
                                    {cPct.toFixed(0)}% completion
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--gray-200)' }}>
                                <div style={{ width: `${cPct}%`, background: 'var(--success)', transition: 'width 0.4s ease' }} title={`Completed: ${b.completed}`} />
                                <div style={{ width: `${sPct}%`, background: 'var(--primary)', transition: 'width 0.4s ease' }} title={`Scheduled: ${b.scheduled}`} />
                                <div style={{ width: `${xPct}%`, background: 'var(--danger)', transition: 'width 0.4s ease' }} title={`Cancelled: ${b.cancelled}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredBranch.length === 0 ? (
                    <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
                      <Building2 size={36} style={{ color: 'var(--gray-300)', marginBottom: 8 }} />
                      <p className="empty-state-title" style={{ fontSize: 15, fontWeight: 600 }}>No appointments recorded</p>
                      <p className="empty-state-desc" style={{ fontSize: 13 }}>No appointment activity logged for the selected date window.</p>
                    </div>
                  ) : (
                    <div className="table-container" style={{ margin: 0, border: 'none' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px 20px' }}>Branch Facility</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'center' }}>Scheduled</th>
                            <th style={{ textAlign: 'center' }}>Completed</th>
                            <th style={{ textAlign: 'center' }}>Cancelled</th>
                            <th style={{ textAlign: 'right', paddingRight: 20 }}>Total Bookings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBranch.map(row => (
                            <tr key={`${row.appointment_date}-${row.branch_id}`}>
                              <td style={{ fontWeight: 600, color: 'var(--gray-900)', padding: '14px 20px' }}>
                                {row.branch_name}
                              </td>
                              <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>
                                {row.appointment_date}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--primary)' }}>
                                {row.scheduled}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                                {row.completed}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 500, color: row.cancelled > 0 ? 'var(--danger)' : 'var(--gray-400)' }}>
                                {row.cancelled}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--gray-900)', fontSize: 14, paddingRight: 20 }}>
                                {row.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--gray-50)', borderTop: '2px solid var(--gray-300)' }}>
                            <td colSpan={2} style={{ fontWeight: 700, color: 'var(--gray-900)', padding: '12px 20px' }}>
                              Consolidated Totals
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                              {filteredBranch.reduce((acc, r) => acc + Number(r.scheduled || 0), 0)}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--success)' }}>
                              {filteredBranch.reduce((acc, r) => acc + Number(r.completed || 0), 0)}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--danger)' }}>
                              {filteredBranch.reduce((acc, r) => acc + Number(r.cancelled || 0), 0)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--gray-900)', fontSize: 14, paddingRight: 20 }}>
                              {filteredBranch.reduce((acc, r) => acc + Number(r.total || 0), 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────
                  2. DOCTOR REVENUE REPORT
                  ─────────────────────────────────────────────────────────── */}
              {activeReport === 'doctor_revenue' && (
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-200)', padding: '16px 20px' }}>
                    <div>
                      <h3 className="card-title" style={{ fontSize: 16, color: 'var(--gray-900)' }}>Physician Revenue & Billing Productivity</h3>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Invoiced service totals and current net patient payments, including refunds and adjustments</p>
                    </div>
                    <span className="badge badge-primary">{filteredDoctor.length} practitioners</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, padding: '18px 20px', background: 'var(--off-white)', borderBottom: '1px solid var(--gray-200)' }}>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Billed</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginTop: 2 }}>
                        {formatLKR(filteredDoctor.reduce((acc, d) => acc + Number(d.total_revenue || 0), 0))}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderLeft: '4px solid var(--success)' }}>
                      <div style={{ fontSize: 11, color: 'var(--success)', textTransform: 'uppercase', fontWeight: 700 }}>Net Patient Payments</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
                        {formatLKR(filteredDoctor.reduce((acc, d) => acc + Number(d.collected ?? NaN), 0))}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Invoiced Visits</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginTop: 2 }}>
                        {filteredDoctor.reduce((acc, d) => acc + Number(d.appointment_count || 0), 0)}
                      </div>
                    </div>
                  </div>

                  {filteredDoctor.length > 0 && (() => {
                    const maxBilled = Math.max(...filteredDoctor.map(d => Number(d.total_revenue) || 0), 1);
                    const grandTotal = filteredDoctor.reduce((acc, d) => acc + Number(d.total_revenue || 0), 0);
                    return (
                      <div style={{ padding: '20px', borderBottom: '1px solid var(--gray-200)', background: '#ffffff' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Award size={15} style={{ color: 'var(--primary)' }} /> Clinical Revenue Contribution Leaderboard
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {filteredDoctor.map((d, i) => {
                            const barW = ((Number(d.total_revenue) / maxBilled) * 100);
                            const share = grandTotal > 0 ? ((Number(d.total_revenue) / grandTotal) * 100).toFixed(1) : '0';
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#fef3c7' : 'var(--gray-100)', color: i === 0 ? '#b45309' : 'var(--gray-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                  #{i + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{d.doctor_name} <small style={{ color: 'var(--gray-500)', fontWeight: 400 }}>({d.branch_name} • #{d.branch_id})</small></span>
                                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatLKR(d.total_revenue)} <small style={{ color: 'var(--gray-500)', fontWeight: 400 }}>({share}%)</small></span>
                                  </div>
                                  <div style={{ height: 8, borderRadius: 4, background: 'var(--gray-100)', overflow: 'hidden' }}>
                                    <div style={{ width: `${barW}%`, height: '100%', background: 'linear-gradient(90deg, #155a96 0%, #3f89cc 100%)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {filteredDoctor.length === 0 ? (
                    <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
                      <DollarSign size={36} style={{ color: 'var(--gray-300)', marginBottom: 8 }} />
                      <p className="empty-state-title">No doctor revenue data recorded</p>
                      <p className="empty-state-desc">No invoices linked to doctors match the specified audit window.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Physician Name</th>
                            <th>Branch Location</th>
                            <th style={{ textAlign: 'center' }}>Visits</th>
                            <th style={{ textAlign: 'right' }}>Total Billed</th>
                            <th style={{ textAlign: 'right' }}>Net Patient Payments</th>
                            <th style={{ textAlign: 'right' }}>Avg / Visit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDoctor.map(d => (
                            <tr key={`${d.doctor_id}-${d.branch_id}`}>
                              <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{d.doctor_name}</td>
                              <td style={{ color: 'var(--gray-600)' }}>{d.branch_name} • #{d.branch_id}</td>
                              <td style={{ textAlign: 'center' }}>{d.appointment_count}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatLKR(d.total_revenue)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatLKR(d.collected)}</td>
                              <td style={{ textAlign: 'right', color: 'var(--gray-600)' }}>{formatLKR(d.avg_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────
                  3. OUTSTANDING BALANCES
                  ─────────────────────────────────────────────────────────── */}
              {activeReport === 'outstanding' && (
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-200)', padding: '16px 20px' }}>
                    <div>
                      <h3 className="card-title" style={{ fontSize: 16, color: 'var(--gray-900)' }}>Outstanding Invoice Balances</h3>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Current balances on invoices issued within the selected period; not a due-date aging report</p>
                    </div>
                    <span className="badge badge-danger">{filteredOutstanding.length} accounts with balances</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, padding: '18px 20px', background: 'var(--off-white)', borderBottom: '1px solid var(--gray-200)' }}>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderLeft: '4px solid var(--danger)' }}>
                      <div style={{ fontSize: 11, color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 700 }}>Total Outstanding</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)', marginTop: 2 }}>
                        {formatLKR(filteredOutstanding.reduce((acc, p) => acc + Number(p.total_outstanding || 0), 0))}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Affected Patients</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginTop: 2 }}>
                        {filteredOutstanding.length}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Invoices</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginTop: 2 }}>
                        {filteredOutstanding.reduce((acc, p) => acc + Number(p.invoice_count || 0), 0)}
                      </div>
                    </div>
                  </div>

                  {filteredOutstanding.length > 0 && (() => {
                    const totalDebt = filteredOutstanding.reduce((acc, p) => acc + Number(p.total_outstanding || 0), 0);
                    return (
                      <div style={{ padding: '20px', borderBottom: '1px solid var(--gray-200)', background: '#ffffff' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Activity size={15} /> Receivables Concentration & Exposure Breakdown
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {filteredOutstanding.slice(0, 5).map((p, idx) => {
                            const debtPct = totalDebt > 0 ? ((Number(p.total_outstanding) / totalDebt) * 100).toFixed(1) : '0';
                            return (
                              <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.patient_name} <small style={{ color: 'var(--gray-500)' }}>({p.invoice_count} invoices)</small></span>
                                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatLKR(p.total_outstanding)} <small style={{ color: 'var(--gray-500)', fontWeight: 400 }}>({debtPct}% of portfolio)</small></span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: '#fee2e2', overflow: 'hidden' }}>
                                  <div style={{ width: `${debtPct}%`, height: '100%', background: 'var(--danger)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {filteredOutstanding.length === 0 ? (
                    <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
                      <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: 8 }} />
                      <p className="empty-state-title" style={{ color: 'var(--success)' }}>No matching outstanding balances</p>
                      <p className="empty-state-desc">No balances match the loaded invoice period and current record filter. This does not establish that every patient bill is settled.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Patient Name</th>
                            <th>Contact / Location</th>
                            <th style={{ textAlign: 'center' }}>Pending Invoices</th>
                            <th style={{ textAlign: 'right' }}>Outstanding Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOutstanding.map(p => (
                            <tr key={p.patient_id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                                    {p.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.patient_name}</span>
                                </div>
                              </td>
                              <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{p.contact_details || '—'}</td>
                              <td style={{ textAlign: 'center' }}><span className="badge badge-danger">{p.invoice_count} invoice(s)</span></td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>{formatLKR(p.total_outstanding)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────
                  4. TREATMENTS BY CATEGORY
                  ─────────────────────────────────────────────────────────── */}
              {activeReport === 'treatment' && (
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-200)', padding: '16px 20px' }}>
                    <div>
                      <h3 className="card-title" style={{ fontSize: 16, color: 'var(--gray-900)' }}>Treatment Units by Category & Recorded Service Value</h3>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Treatment units on completed visits, grouped by catalogue category. Service value uses captured line prices; it does not establish invoicing or payment.</p>
                    </div>
                    <span className="badge badge-primary">{filteredTreatment.length} procedure types</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, padding: '18px 20px', background: 'var(--off-white)', borderBottom: '1px solid var(--gray-200)' }}>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Treatment Units Performed</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                        {filteredTreatment.reduce((acc, t) => acc + Number(t.count || 0), 0)}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderLeft: '4px solid var(--success)' }}>
                      <div style={{ fontSize: 11, color: 'var(--success)', textTransform: 'uppercase', fontWeight: 700 }}>Recorded Service Value</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
                        {formatLKR(filteredTreatment.reduce((acc, t) => acc + Number(t.total_revenue || 0), 0))}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Treatment Categories</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginTop: 2 }}>
                        {treatmentCategories.length}
                      </div>
                    </div>
                  </div>

                  {treatmentCategories.length > 0 && (
                    <div className="table-container">
                      <table>
                        <caption style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 700 }}>Category totals for matching procedures</caption>
                        <thead><tr><th>Treatment Category</th><th style={{ textAlign: 'center' }}>Units Performed</th><th style={{ textAlign: 'right' }}>Recorded Service Value</th></tr></thead>
                        <tbody>{treatmentCategories.map(category => (
                          <tr key={category.category_id}>
                            <td>{category.category_name} • #{category.category_id}</td>
                            <td style={{ textAlign: 'center' }}>{category.count}</td>
                            <td style={{ textAlign: 'right' }}>{formatLKR(category.total_revenue)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}

                  {filteredTreatment.length > 0 && (() => {
                    const maxCount = Math.max(...filteredTreatment.map(t => Number(t.count) || 0), 1);
                    return (
                      <div style={{ padding: '20px', borderBottom: '1px solid var(--gray-200)', background: '#ffffff' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BarChart3 size={15} style={{ color: 'var(--primary)' }} /> Procedure Frequency & Patient Demand Ranking
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {filteredTreatment.slice(0, 6).map((t, idx) => {
                            const barW = ((Number(t.count) / maxCount) * 100);
                            return (
                              <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{t.treatment_name} <small style={{ color: 'var(--gray-500)' }}>({t.category_name})</small></span>
                                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{t.count} units • {formatLKR(t.total_revenue)}</span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: 'var(--gray-100)', overflow: 'hidden' }}>
                                  <div style={{ width: `${barW}%`, height: '100%', background: '#0f4575', borderRadius: 4, transition: 'width 0.4s ease' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {filteredTreatment.length === 0 ? (
                    <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
                      <FileText size={36} style={{ color: 'var(--gray-300)', marginBottom: 8 }} />
                      <p className="empty-state-title">No treatment procedures recorded</p>
                      <p className="empty-state-desc">Procedures will appear once completed visits with treatments exist in the database.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Treatment Category</th>
                            <th>Procedure Name</th>
                            <th style={{ textAlign: 'center' }}>Units Performed</th>
                            <th style={{ textAlign: 'right' }}>Recorded Service Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTreatment.map(t => (
                            <tr key={`${t.category_id}-${t.treatment_id}`}>
                              <td><span className="badge badge-info">{t.category_name} • #{t.category_id}</span></td>
                              <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{t.treatment_name}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{t.count}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{formatLKR(t.total_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────
                  5. INSURANCE COVERAGE VS OUT-OF-POCKET
                  ─────────────────────────────────────────────────────────── */}
              {activeReport === 'insurance' && (
                <div>
                  {!insuranceData ? (
                    <div className="card">
                      <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
                        <Shield size={36} style={{ color: 'var(--gray-300)', marginBottom: 8 }} />
                        <p className="empty-state-title">No insurance claim data available</p>
                        <p className="empty-state-desc">No insurance claims or invoices found in the database.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="stats-grid" style={{ marginBottom: 20 }}>
                        {[
                          { label: 'Total Billed', value: `Rs. ${Number(insuranceData.invoiced_amount).toLocaleString()}`, color: '#3f89cc' },
                          { label: 'Insurance Approved (not cash)', value: `Rs. ${Number(insuranceData.insurance_approved_amount).toLocaleString()}`, color: '#1d6fb8' },
                          { label: 'Patient Payments (net)', value: `Rs. ${Number(insuranceData.patient_paid_amount).toLocaleString()}`, color: '#155a96' },
                          { label: 'Estimated Patient Exposure', value: formatLKR(estimatedPatientExposure), color: '#b86e0c' },
                          { label: 'Outstanding Balance', value: `Rs. ${Number(insuranceData.outstanding_amount).toLocaleString()}`, color: '#c2372f' },
                        ].map(s => (
                          <div key={s.label} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)' }}>
                          <h3 className="card-title" style={{ fontSize: 15, color: 'var(--gray-900)' }}>Billed Value: Approved Claims & Estimated Patient Exposure</h3>
                        </div>
                        <div className="card-body" style={{ padding: '20px' }}>
                          {(() => {
                            const billed = Number(insuranceData.invoiced_amount);
                            const approved = Number(insuranceData.insurance_approved_amount);
                            const exposure = estimatedPatientExposure!;
                            // A billed-value partition, never a claim-settlement or payment-method ratio.
                            if (![billed, approved, exposure].every(Number.isFinite) || billed <= 0 || approved < 0 || approved > billed) {
                              return <p style={{ color: 'var(--gray-600)', margin: 0 }}>No reconciled billed-value breakdown is available. The separate amounts above are not a settlement ratio.</p>;
                            }
                            const insurancePct = (approved / billed) * 100;
                            const patientPct = (exposure / billed) * 100;

                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
                                <div>
                                  {renderSvgDonut(
                                    [
                                      { label: 'Approved Claims (not cash)', value: approved, color: '#1d6fb8' },
                                      { label: 'Estimated Patient Exposure', value: exposure, color: '#b86e0c' },
                                    ],
                                    'Billed Value',
                                    formatLKR(billed)
                                  )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  <div style={{ background: 'var(--primary-50)', padding: '12px 16px', borderRadius: 'var(--radius)', borderLeft: '4px solid #1d6fb8' }}>
                                    <div style={{ fontSize: 11, color: '#155a96', fontWeight: 700, textTransform: 'uppercase' }}>Institutional Insurer Share</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f2e4f', marginTop: 2 }}>
                                      {insurancePct.toFixed(1)}% ({formatLKR(insuranceData.insurance_approved_amount)})
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>Approved claim value; insurer payment is not established</div>
                                  </div>

                                  <div style={{ background: '#fdf6ea', padding: '12px 16px', borderRadius: 'var(--radius)', borderLeft: '4px solid #b86e0c' }}>
                                    <div style={{ fontSize: 11, color: '#b86e0c', fontWeight: 700, textTransform: 'uppercase' }}>Estimated Patient Exposure Share</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#78350f', marginTop: 2 }}>
                                      {patientPct.toFixed(1)}% ({formatLKR(exposure)})
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>Invoiced amount minus approved claims; not payments or current balance</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="alert alert-info">
                        Insurance approval is not a received payment and does not automatically reduce an invoice balance.
                        Estimated patient exposure = invoiced amount minus approved claims. It is not recorded payments
                        or the current outstanding balance, and does not establish who will ultimately settle the bill.
                        Patient payments include recorded refunds and adjustments. Approved claims and patient payments
                        are separate measures, not percentages of a single cash total.
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
