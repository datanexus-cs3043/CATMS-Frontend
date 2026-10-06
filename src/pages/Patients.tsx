import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { patientService, branchService, apiErrorMessage, Patient, Branch } from '../services/api';
import { localDate } from '../services/mockData';
import { useAuth } from '../auth/AuthContext';


const genderColor: Record<string, { color: string; bg: string }> = {
  Male: { color: '#3f89cc', bg: '#f3f8fd' },
  Female: { color: '#0f4575', bg: '#f3f8fd' },
  Other: { color: '#5f7188', bg: '#f8fafc' },
};


export default function Patients() {
  const navigate = useNavigate();
  const { isAdmin, isCashier } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = isAdmin || isCashier;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [showModal, setShowModal] = useState(false);
  const blankForm = {
    first_name: '', last_name: '', date_of_birth: '', gender: 'Male',
    patient_type: 'Regular', contact_details: '', email: '', address: '',
    branch_id: 1, emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
  };
  const [form, setForm] = useState<Record<string, any>>(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
    if (searchParams.get('new') === '1') {
      openModal();
      setSearchParams({}, { replace: true });
    }
  }, []);

  const openModal = () => {
    setForm(blankForm);
    setError('');
    setShowModal(true);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pts, brs] = await Promise.all([
        patientService.getAll(),
        branchService.getAll(),
      ]);
      setPatients(pts);
      setBranches(brs);
    } catch {
      // handle
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase());
    const matchBranch = !filterBranch || String(p.branch_id) === filterBranch;
    const matchGender = !filterGender || p.gender === filterGender;
    return matchSearch && matchBranch && matchGender;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created: any = await patientService.create(form as Partial<Patient>);
      setSuccessMsg(
        `${created.first_name} ${created.last_name} registered (Patient #${created.patient_id}).` +
        (created.username ? ` Patient portal login: ${created.username} / ${created.temporary_password}` : '')
      );
      setShowModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 10000);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to register patient'));
    } finally {
      setSubmitting(false);
    }
  };

  const getBranchName = (id: number) =>
    branches.find(b => b.branch_id === id)?.branch_name || `Branch #${id}`;

  const calcAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };


  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
            Patient Records
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {filtered.length} of {patients.length} patients
          </p>
        </div>
        <div className="page-actions">
          {/* Search */}
          <div className="search-box">
            <input
              placeholder="Search patients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filters */}
          <select
            className="form-control"
            style={{ width: 'auto', padding: '8px 12px' }}
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: 'auto', padding: '8px 12px' }}
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
          >
            <option value="">All Genders</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>

          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={openModal}
            >
              Register Patient
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 32 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8, borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
            </div>
            <p className="empty-state-title">No patients found</p>
            <p className="empty-state-desc">
              {search ? 'Try a different search term.' : 'Register your first patient.'}
            </p>
            {canEdit && !search && (
              <button className="btn btn-primary" onClick={openModal}>
                Register Patient
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Gender / Age</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(patient => {
                  const gc = genderColor[patient.gender] || genderColor.Other;
                  return (
                    <tr key={patient.patient_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">
                            {`${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>
                              {patient.first_name} {patient.last_name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                              {patient.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: gc.bg, color: gc.color }}>
                          {patient.gender}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 8 }}>
                          {calcAge(patient.date_of_birth)} yrs
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                        {patient.contact_details || '—'}
                      </td>
                      <td>
                        <span className="tag">{getBranchName(patient.branch_id)}</span>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: 11 }}>
                          {patient.patient_type || 'Regular'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/patients/${patient.patient_id}`)}
                          >
                            View
                          </button>
                          {(isAdmin || isCashier) && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate(`/appointments?patient_id=${patient.patient_id}`)}
                            >
                              Book
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Patient Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Patient</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-control" required value={form.first_name || ''} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="e.g. Kavindu" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" required value={form.last_name || ''} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="e.g. Perera" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth *</label>
                    <input className="form-control" type="date" required max={localDate(0)} value={form.date_of_birth || ''} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender *</label>
                    <select className="form-control" value={form.gender || 'Male'} onChange={e => setForm({...form, gender: e.target.value})}>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="patient@email.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact</label>
                    <input className="form-control" value={form.contact_details || ''} onChange={e => setForm({...form, contact_details: e.target.value})} placeholder="07XXXXXXXX" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Branch *</label>
                    <select className="form-control" value={form.branch_id || 1} onChange={e => setForm({...form, branch_id: Number(e.target.value)})}>
                      {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Patient Type</label>
                    <select className="form-control" value={form.patient_type || 'Regular'} onChange={e => setForm({...form, patient_type: e.target.value})}>
                      <option>Regular</option>
                      <option>Child</option>
                      <option>Senior</option>
                      <option>VIP</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address..." />
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0' }}>Emergency Contact</p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-control" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship</label>
                    <input className="form-control" value={form.emergency_contact_relationship} onChange={e => setForm({...form, emergency_contact_relationship: e.target.value})} placeholder="e.g. Spouse" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-control" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Registering...</> : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

//Tharushi