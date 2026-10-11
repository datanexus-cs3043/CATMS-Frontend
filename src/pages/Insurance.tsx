import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  insuranceService, patientService, treatmentService, apiErrorMessage,
  InsuranceClaim, InsurancePolicy, InsuranceProvider, InsuranceCoverage, Patient, Treatment
} from '../services/api';
import { useAuth } from '../auth/AuthContext';

export default function Insurance() {
  const { isAdmin, isCashier } = useAuth();
  const canEdit = isAdmin || isCashier;
  const navigate = useNavigate();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [message, setMessage] = useState('');
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerForm, setProviderForm] = useState({ provider_name: '', contact_details: '' });
  const [coveragePolicy, setCoveragePolicy] = useState<InsurancePolicy | null>(null);
  const [coverages, setCoverages] = useState<InsuranceCoverage[]>([]);
  const [coverageForm, setCoverageForm] = useState({ treatment_id: '', coverage_percentage: '', maximum_amount: '' });

  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'claims' | 'policies' | 'providers'>('claims');
  const [filterStatus, setFilterStatus] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    patient_id: '', provider_id: '', policy_number: '', start_date: '', end_date: '', status: 'Active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [c, pol, prov, pts, txs] = await Promise.allSettled([
        insuranceService.getClaims(),
        insuranceService.getPolicies(),
        insuranceService.getProviders(),
        patientService.getAll(),
        treatmentService.getAll(),
      ]);
      if (txs.status === 'fulfilled') setTreatments(txs.value);
      if (c.status === 'fulfilled') setClaims(c.value);
      if (pol.status === 'fulfilled') setPolicies(pol.value);
      if (prov.status === 'fulfilled') setProviders(prov.value);
      if (pts.status === 'fulfilled') setPatients(pts.value);
    } catch {} finally { setIsLoading(false); }
  };

  const filteredClaims = claims.filter(c => !filterStatus || c.status === filterStatus);

  const totalClaimed = claims.reduce((s, c) => s + Number(c.claim_amount), 0);
  const totalApproved = claims.reduce((s, c) => s + Number(c.approved_amount), 0);
  const pendingCount = claims.filter(c => c.status === 'Pending').length;

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await insuranceService.createPolicy({
        patient_id: Number(policyForm.patient_id),
        provider_id: Number(policyForm.provider_id),
        policy_number: Number(policyForm.policy_number),
        start_date: policyForm.start_date,
        end_date: policyForm.end_date,
        status: policyForm.status,
      });
      setShowPolicyModal(false);
      setPolicyForm({ patient_id: '', provider_id: '', policy_number: '', start_date: '', end_date: '', status: 'Active' });
      setMessage('Policy created. Add its coverage terms so claims can be calculated.');
      loadData();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create policy'));
    } finally { setSubmitting(false); }
  };

  const handleUpdateClaimStatus = async (claim: InsuranceClaim, newStatus: string) => {
    let approved: number | undefined;
    if (newStatus === 'Approved') {
      const input = prompt(`Approved amount for CLM-${claim.claim_id} (claimed Rs. ${Number(claim.claim_amount).toLocaleString()}):`, String(claim.claim_amount));
      if (input === null) return;
      approved = Number(input);
      if (!(approved >= 0)) { alert('Enter a valid amount.'); return; }
    } else if (!confirm(`Reject claim CLM-${claim.claim_id}?`)) {
      return;
    }
    try {
      await insuranceService.updateClaim(claim.claim_id, { status: newStatus, approved_amount: approved });
      setMessage(`Claim CLM-${claim.claim_id} ${newStatus.toLowerCase()}. The invoice balance has been updated.`);
      loadData();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await insuranceService.createProvider(providerForm);
      setShowProviderModal(false);
      setProviderForm({ provider_name: '', contact_details: '' });
      loadData();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add provider'));
    }
  };

  const openCoverage = async (pol: InsurancePolicy) => {
    setCoveragePolicy(pol);
    setError('');
    setCoverageForm({ treatment_id: '', coverage_percentage: '', maximum_amount: '' });
    try { setCoverages(await insuranceService.getCoverageByPolicy(pol.policy_id)); } catch { setCoverages([]); }
  };

  const handleAddCoverage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coveragePolicy) return;
    setError('');
    try {
      await insuranceService.addCoverage(coveragePolicy.policy_id, {
        treatment_id: Number(coverageForm.treatment_id),
        coverage_percentage: Number(coverageForm.coverage_percentage),
        maximum_amount: Number(coverageForm.maximum_amount),
      });
      setCoverageForm({ treatment_id: '', coverage_percentage: '', maximum_amount: '' });
      setCoverages(await insuranceService.getCoverageByPolicy(coveragePolicy.policy_id));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add coverage'));
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {message && <div className="alert alert-success">{message}</div>}
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Claimed', value: `Rs. ${totalClaimed.toLocaleString()}`, color: '#155a96' },
          { label: 'Total Approved', value: `Rs. ${totalApproved.toLocaleString()}`, color: '#1d6fb8' },
          { label: 'Pending Claims', value: pendingCount, color: '#b86e0c' },
          { label: 'Active Policies', value: policies.filter(p => p.status === 'Active').length, color: '#3f89cc' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'claims' ? 'active' : ''}`} onClick={() => setActiveTab('claims')}>
          Claims ({claims.length})
        </button>
        <button className={`tab-btn ${activeTab === 'policies' ? 'active' : ''}`} onClick={() => setActiveTab('policies')}>
          Policies ({policies.length})
        </button>
        <button className={`tab-btn ${activeTab === 'providers' ? 'active' : ''}`} onClick={() => setActiveTab('providers')}>
          Providers ({providers.length})
        </button>
      </div>

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <select className="form-control" style={{ width: 'auto', padding: '8px 12px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="card">
            {isLoading ? (
              <div style={{ padding: 24 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No claims found</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Claim #</th>
                      <th>Invoice</th>
                      <th>Policy</th>
                      <th>Date</th>
                      <th>Claimed</th>
                      <th>Approved</th>
                      <th>Status</th>
                      {canEdit && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map(claim => (
                      <tr key={claim.claim_id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>CLM-{claim.claim_id}</td>
                        <td>
                          <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate(`/invoices/${claim.invoice_id}`)}>INV-{claim.invoice_id}</span>
                          {claim.patient_name && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{claim.patient_name}</div>}
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>Policy {claim.policy_number ?? `#${claim.policy_id}`}</div>
                          {claim.provider_name && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{claim.provider_name}</div>}
                        </td>
                        <td style={{ color: 'var(--gray-500)' }}>{claim.claim_date}</td>
                        <td style={{ fontWeight: 600 }}>Rs. {Number(claim.claim_amount).toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>Rs. {Number(claim.approved_amount).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${claim.status === 'Approved' ? 'badge-success' : claim.status === 'Pending' ? 'badge-warning' : 'badge-danger'}`}>
                            {claim.status}
                          </span>
                        </td>
                        {canEdit && (
                          <td>
                            {claim.status === 'Pending' && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => handleUpdateClaimStatus(claim, 'Approved')}>
                                  Approve
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleUpdateClaimStatus(claim, 'Rejected')}>
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <>
          {canEdit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => { setShowPolicyModal(true); setError(''); }}>
                New Policy
              </button>
            </div>
          )}
          <div className="card">
            {policies.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No policies found</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Policy ID</th><th>Patient</th><th>Provider</th><th>Policy #</th><th>Valid From</th><th>Valid To</th><th>Status</th><th>Coverage</th></tr></thead>
                  <tbody>
                    {policies.map(pol => (
                      <tr key={pol.policy_id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{pol.policy_id}</td>
                        <td>{pol.patient_name || `Patient #${pol.patient_id}`}</td>
                        <td>{pol.provider_name || `Provider #${pol.provider_id}`}</td>
                        <td style={{ fontFamily: 'monospace' }}>{pol.policy_number}</td>
                        <td>{pol.start_date}</td>
                        <td>{pol.end_date}</td>
                        <td><span className={`badge ${pol.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>{pol.status}</span></td>
                        <td><button className="btn btn-secondary btn-sm" onClick={() => openCoverage(pol)}>Terms</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Providers Tab */}
      {/* The backend allows only admins to create providers. */}
      {activeTab === 'providers' && isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => { setError(''); setShowProviderModal(true); }}>+ Add Provider</button>
        </div>
      )}
      {activeTab === 'providers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {providers.map(prov => (
            <div key={prov.provider_id} className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: '#1d6fb8',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{prov.provider_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Insurance Provider</div>
                </div>
              </div>
              {prov.contact_details && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-600)' }}>
                  {prov.contact_details}
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-400)' }}>
                {policies.filter(p => p.provider_id === prov.provider_id && p.status === 'Active').length} active policies
              </div>
            </div>
          ))}
        </div>
      )}

      {showProviderModal && (
        <div className="modal-overlay" onClick={() => setShowProviderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Insurance Provider</h3>
              <button className="modal-close" onClick={() => setShowProviderModal(false)}></button>
            </div>
            <form onSubmit={handleCreateProvider}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Provider Name *</label>
                  <input className="form-control" required value={providerForm.provider_name} onChange={e => setProviderForm({ ...providerForm, provider_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact</label>
                  <input className="form-control" value={providerForm.contact_details} onChange={e => setProviderForm({ ...providerForm, contact_details: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowProviderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Provider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {coveragePolicy && (
        <div className="modal-overlay" onClick={() => setCoveragePolicy(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Coverage Terms · {coveragePolicy.provider_name} #{coveragePolicy.policy_number}</h3>
              <button className="modal-close" onClick={() => setCoveragePolicy(null)}></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                For each covered treatment the insurer reimburses the percentage below, up to the maximum per invoice line. Claims are calculated automatically when an invoice is generated.
              </p>
              {error && <div className="alert alert-error">{error}</div>}
              {coverages.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>No treatments covered yet.</p>
              ) : (
                <div className="table-container" style={{ marginBottom: 16 }}>
                  <table>
                    <thead><tr><th>Treatment</th><th>Coverage %</th><th>Maximum</th></tr></thead>
                    <tbody>
                      {coverages.map(c => (
                        <tr key={c.coverage_id}>
                          <td>{c.treatment_name}</td>
                          <td>{c.coverage_percentage}%</td>
                          <td>Rs. {Number(c.maximum_amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canEdit && (
                <form onSubmit={handleAddCoverage} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: '2 1 200px', marginBottom: 0 }}>
                    <label className="form-label">Treatment *</label>
                    <select className="form-control" required value={coverageForm.treatment_id} onChange={e => setCoverageForm({ ...coverageForm, treatment_id: e.target.value })}>
                      <option value="">Select...</option>
                      {treatments.filter(t => !coverages.some(c => c.treatment_id === t.treatment_id)).map(t => (
                        <option key={t.treatment_id} value={t.treatment_id}>{t.treatment_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
                    <label className="form-label">Coverage % *</label>
                    <input type="number" min={1} max={100} className="form-control" required value={coverageForm.coverage_percentage} onChange={e => setCoverageForm({ ...coverageForm, coverage_percentage: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                    <label className="form-label">Max (Rs.) *</label>
                    <input type="number" min={1} className="form-control" required value={coverageForm.maximum_amount} onChange={e => setCoverageForm({ ...coverageForm, maximum_amount: e.target.value })} />
                  </div>
                  <button type="submit" className="btn btn-primary">Add</button>
                </form>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setCoveragePolicy(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Policy Modal */}
      {showPolicyModal && (
        <div className="modal-overlay" onClick={() => setShowPolicyModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Insurance Policy</h3>
              <button className="modal-close" onClick={() => setShowPolicyModal(false)}></button>
            </div>
            <form onSubmit={handleCreatePolicy}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Patient *</label>
                    <select className="form-control" required value={policyForm.patient_id} onChange={e => setPolicyForm({...policyForm, patient_id: e.target.value})}>
                      <option value="">Select patient...</option>
                      {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Insurance Provider *</label>
                    <select className="form-control" required value={policyForm.provider_id} onChange={e => setPolicyForm({...policyForm, provider_id: e.target.value})}>
                      <option value="">Select provider...</option>
                      {providers.map(p => <option key={p.provider_id} value={p.provider_id}>{p.provider_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Policy Number *</label>
                    <input type="number" className="form-control" required value={policyForm.policy_number} onChange={e => setPolicyForm({...policyForm, policy_number: e.target.value})} placeholder="e.g. 100001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={policyForm.status} onChange={e => setPolicyForm({...policyForm, status: e.target.value})}>
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Expired</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-control" required value={policyForm.start_date} onChange={e => setPolicyForm({...policyForm, start_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input type="date" className="form-control" required value={policyForm.end_date} onChange={e => setPolicyForm({...policyForm, end_date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPolicyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating...</> : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
