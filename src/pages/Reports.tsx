import React, { useState, useEffect } from 'react';
import {
  reportsService,
  BranchAppointmentSummary,
  DoctorRevenueReport,
  OutstandingPatient,
  TreatmentCountReport,
  InsuranceSummary,
} from '../services/api';

type ReportType = 'branch' | 'doctor_revenue' | 'outstanding' | 'treatment' | 'insurance';

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('branch');
  const [isLoading, setIsLoading] = useState(false);

  const [branchData, setBranchData] = useState<BranchAppointmentSummary[]>([]);
  const [doctorRevData, setDoctorRevData] = useState<DoctorRevenueReport[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingPatient[]>([]);
  const [treatmentData, setTreatmentData] = useState<TreatmentCountReport[]>([]);
  const [insuranceData, setInsuranceData] = useState<InsuranceSummary | null>(null);

  const [dateFilter, setDateFilter] = useState({ from: '', to: '', date: '' });

  const [error, setError] = useState('');

 
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="report-layout">
        {/* Report selector */}
        <nav className="card report-menu" aria-label="Reports">
          <div className="card-header"><h3 className="card-title">Management reports</h3></div>
          {reports.map((r, i) => (
            <button
              key={r.key}
              className={`report-menu-item${activeReport === r.key ? ' active' : ''}`}
              onClick={() => setActiveReport(r.key)}
              aria-current={activeReport === r.key}
            >
              <span className="report-menu-num">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="report-menu-label">{r.label}</span>
                <span className="report-menu-desc">{r.desc}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* Report content */}
        <div style={{ minWidth: 0 }}>
          {/* Date filter */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-600)' }}>Filter by date:</span>
                {activeReport === 'branch' ? (
                  <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFilter.date} onChange={e => setDateFilter({ ...dateFilter, date: e.target.value })} />
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>From</span>
                      <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFilter.from} onChange={e => setDateFilter({ ...dateFilter, from: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>To</span>
                      <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFilter.to} onChange={e => setDateFilter({ ...dateFilter, to: e.target.value })} />
                    </div>
                  </>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => loadReport(activeReport)}>
                  Generate Report
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const cleared = { from: '', to: '', date: '' };
                  setDateFilter(cleared);
                  loadReport(activeReport, cleared);
                }}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--radius)' }} />)}
            </div>
          ) :  }
      </div>
    </div>
  );
}
