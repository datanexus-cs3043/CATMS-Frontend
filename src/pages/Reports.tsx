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
          ) : (
            <>
              {/* Branch Appointment Summary */}
              {activeReport === 'branch' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Branch-wise Appointment Summary</h3>
                    <span className="badge badge-primary">{branchData.length} records</span>
                  </div>
                  {branchData.length === 0 ? (
                    <div className="empty-state">
                      <p className="empty-state-title">No data available</p>
                      <p className="empty-state-desc">Try adjusting the date filter or ensure appointments are booked.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Branch</th>
                            <th>Date</th>
                            <th>Scheduled</th>
                            <th>Completed</th>
                            <th>Cancelled</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchData.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{row.branch_name}</td>
                              <td>{row.appointment_date}</td>
                              <td><span className="badge badge-info">{row.scheduled}</span></td>
                              <td><span className="badge badge-success">{row.completed}</span></td>
                              <td><span className="badge badge-danger">{row.cancelled}</span></td>
                              <td style={{ fontWeight: 700 }}>{row.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Doctor Revenue */}
              {activeReport === 'doctor_revenue' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Doctor-wise Revenue Report</h3>
                    <span className="badge badge-primary">{doctorRevData.length} doctors</span>
                  </div>
                  {doctorRevData.length === 0 ? (
                    <div className="empty-state">
                      <p className="empty-state-title">No revenue data</p>
                      <p className="empty-state-desc">Revenue data will appear once invoices are generated.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Doctor</th><th>Branch</th><th>Invoiced Visits</th><th>Total Billed</th><th>Collected</th><th>Avg per Visit</th></tr></thead>
                        <tbody>
                          {doctorRevData.map(d => (
                            <tr key={d.doctor_id}>
                              <td style={{ fontWeight: 600 }}>{d.doctor_name}</td>
                              <td>{d.branch_name}</td>
                              <td style={{ textAlign: 'center' }}>{d.appointment_count}</td>
                              <td style={{ fontWeight: 700, color: 'var(--success)' }}>Rs. {Number(d.total_revenue).toLocaleString()}</td>
                              <td>Rs. {Number(d.collected ?? 0).toLocaleString()}</td>
                              <td style={{ color: 'var(--gray-600)' }}>Rs. {Number(d.avg_revenue).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Outstanding Patients */}
              {activeReport === 'outstanding' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Patients with Outstanding Balances</h3>
                    <span className="badge badge-danger">{outstandingData.length} patients</span>
                  </div>
                  {outstandingData.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                      </div>
                      <p className="empty-state-title" style={{ color: 'var(--success)' }}>No outstanding balances! </p>
                      <p className="empty-state-desc">All patients are up to date with their payments.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Patient</th><th>Contact</th><th>Outstanding Amount</th><th>Invoices</th></tr></thead>
                        <tbody>
                          {outstandingData.map(p => (
                            <tr key={p.patient_id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                                    {p.patient_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight: 500 }}>{p.patient_name}</span>
                                </div>
                              </td>
                              <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{p.contact_details || '—'}</td>
                              <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 15 }}>
                                Rs. {Number(p.total_outstanding).toLocaleString()}
                              </td>
                              <td>
                                <span className="badge badge-danger">{p.invoice_count} invoice(s)</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Treatment Counts */}
              {activeReport === 'treatment' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Treatment Count by Category</h3>
                  </div>
                  {treatmentData.length === 0 ? (
                    <div className="empty-state">
                      <p className="empty-state-title">No treatment data</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Category</th><th>Treatment</th><th>Count</th><th>Total Revenue</th></tr></thead>
                        <tbody>
                          {treatmentData.map((t, idx) => (
                            <tr key={idx}>
                              <td><span className="tag">{t.category_name}</span></td>
                              <td style={{ fontWeight: 500 }}>{t.treatment_name}</td>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{t.count}</td>
                              <td style={{ color: 'var(--success)', fontWeight: 600 }}>Rs. {Number(t.total_revenue).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Insurance Summary */}
              {activeReport === 'insurance' && (
                <div>
                  {!insuranceData ? (
                    <div className="card">
                      <div className="empty-state">
                        <p className="empty-state-title">No insurance data available</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="stats-grid" style={{ marginBottom: 20 }}>
                        {[
                          { label: 'Total Billed', value: `Rs. ${Number(insuranceData.total_billed ?? 0).toLocaleString()}`, color: '#3f89cc', suffix: '' },
                          { label: 'Total Claims', value: insuranceData.total_claims, color: '#155a96', suffix: '' },
                          { label: 'Insurance Approved', value: `Rs. ${Number(insuranceData.approved_amount).toLocaleString()}`, color: '#1d6fb8', suffix: '' },
                          { label: 'Out-of-Pocket', value: `Rs. ${Number(insuranceData.out_of_pocket).toLocaleString()}`, color: '#b86e0c', suffix: '' },
                          { label: 'Pending Claims', value: `Rs. ${Number(insuranceData.pending_amount).toLocaleString()}`, color: '#c2372f', suffix: '' },
                        ].map(s => (
                          <div key={s.label} className="stat-card">
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Coverage ratio visualization */}
                      <div className="card">
                        <div className="card-header">
                          <h3 className="card-title">Coverage vs Out-of-Pocket Ratio</h3>
                        </div>
                        <div className="card-body">
                          {(() => {
                            const total = Number(insuranceData.approved_amount) + Number(insuranceData.out_of_pocket);
                            const insurancePct = total > 0 ? (Number(insuranceData.approved_amount) / total) * 100 : 0;
                            return (
                              <div>
                                <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', height: 32, marginBottom: 16 }}>
                                  <div style={{ width: `${insurancePct}%`, background: '#1d6fb8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, minWidth: insurancePct > 5 ? 'auto' : 0 }}>
                                    {insurancePct > 10 ? `${insurancePct.toFixed(1)}%` : ''}
                                  </div>
                                  <div style={{ flex: 1, background: '#96c0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                                    {(100 - insurancePct) > 10 ? `${(100 - insurancePct).toFixed(1)}%` : ''}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#1d6fb8' }} />
                                    <span style={{ fontSize: 13, color: 'var(--gray-700)' }}>Insurance Coverage ({insurancePct.toFixed(1)}%)</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#c2372f' }} />
                                    <span style={{ fontSize: 13, color: 'var(--gray-700)' }}>Out-of-Pocket ({(100 - insurancePct).toFixed(1)}%)</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
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
