import React, { useState, useEffect } from 'react';
import { staffService, branchService, apiErrorMessage, Branch } from '../services/api';
import type { Staff } from '../services/api';
import { useAuth } from '../auth/AuthContext';


const roleColor: Record<string, { color: string; bg: string }> = {
  Doctor: { color: '#1d6fb8', bg: '#eef8f3' },
  Receptionist: { color: '#3f89cc', bg: '#f3f8fd' },
  Manager: { color: '#155a96', bg: '#f3f8fd' },
  Admin: { color: '#b86e0c', bg: '#fdf6ea' },
};


export default function Staff() {
  const { isAdmin } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const blankForm = {
    first_name: '', last_name: '', email: '', contact_details: '',
    staff_type: 'Medical', role: 'Doctor', branch_id: 1, doctor_license_number: '',
  };
  const [form, setForm] = useState<Record<string, any>>(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, b] = await Promise.all([staffService.getAll(), branchService.getAll()]);
      setStaffList(s);
      setBranches(b);
    } catch {} finally { setIsLoading(false); }
  };

  const filtered = staffList.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchBranch = !filterBranch || String(s.branch_id) === filterBranch;
    const matchRole = !filterRole || s.role.toLowerCase().includes(filterRole.toLowerCase());
    return matchSearch && matchBranch && matchRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      if (editingStaff) {
        await staffService.update(editingStaff.staff_id, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          contact_details: form.contact_details,
          staff_type: form.staff_type,
          role: form.role,
          branch_id: Number(form.branch_id),
        });
        setSuccessMsg(`${form.first_name} ${form.last_name} updated successfully.`);
      } else {
        await staffService.create(form as Partial<Staff>);
        setSuccessMsg(`${form.first_name} ${form.last_name} added as ${form.role}.`);
      }
      setShowModal(false);
      setEditingStaff(null);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add staff'));
    } finally { setSubmitting(false); }
  };

  const getBranchName = (id: number) =>
    branches.find(b => b.branch_id === id)?.branch_name || `Branch #${id}`;


  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>Staff Directory</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{filtered.length} of {staffList.length} staff members</p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto', padding: '8px 12px' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
          </select>
          <select className="form-control" style={{ width: 'auto', padding: '8px 12px' }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option>Doctor</option>
            <option>Receptionist</option>
            <option>Manager</option>
            <option>Nurse</option>
          </select>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setEditingStaff(null); setForm(blankForm); setShowModal(true); setError(''); }}>
              Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Branch summaries */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {branches.map(b => {
          const count = staffList.filter(s => s.branch_id === b.branch_id).length;
          return (
            <div key={b.branch_id} className="card" style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setFilterBranch(String(b.branch_id))}>
              <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--primary)' }}>{count}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-700)', fontWeight: 600 }}>{b.branch_name}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{b.location}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No staff found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Branch</th>
                  <th>Contact</th>
                  <th>Email</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const rc = roleColor[s.role] || { color: 'var(--gray-600)', bg: 'var(--gray-100)' };
                  return (
                    <tr key={s.staff_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{`${s.first_name[0]}${s.last_name[0]}`.toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.first_name} {s.last_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>ID: {s.staff_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: rc.bg, color: rc.color }}>{s.role}</span>
                      </td>
                      <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>{s.staff_type}</td>
                      <td><span className="tag">{getBranchName(s.branch_id)}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{s.contact_details || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{s.email}</td>
                      {isAdmin && (
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingStaff(s);
                              setForm({
                                first_name: s.first_name,
                                last_name: s.last_name,
                                email: s.email,
                                contact_details: s.contact_details || '',
                                staff_type: s.staff_type,
                                role: s.role,
                                branch_id: s.branch_id,
                                doctor_license_number: '',
                              });
                              setError('');
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingStaff(null); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingStaff(null); }}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-control" required value={form.first_name || ''} onChange={e => setForm({...form, first_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" required value={form.last_name || ''} onChange={e => setForm({...form, last_name: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-control" required value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact</label>
                    <input className="form-control" value={form.contact_details || ''} onChange={e => setForm({...form, contact_details: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Staff Type *</label>
                    <select className="form-control" value={form.staff_type || 'Medical'} onChange={e => setForm({...form, staff_type: e.target.value})}>
                      <option>Medical</option>
                      <option>Non-Medical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-control" value={form.role || 'Doctor'} onChange={e => setForm({...form, role: e.target.value, staff_type: ['Doctor', 'Nurse'].includes(e.target.value) ? 'Medical' : 'Non-Medical'})}>
                      <option>Doctor</option>
                      <option>Nurse</option>
                      <option>Receptionist</option>
                      <option>Cashier</option>
                      <option>Manager</option>
                      <option>Admin</option>
                    </select>
                  </div>
                </div>
                {!editingStaff && form.role === 'Doctor' && (
                  <div className="form-group">
                    <label className="form-label">SLMC License Number *</label>
                    <input className="form-control" required value={form.doctor_license_number} onChange={e => setForm({...form, doctor_license_number: e.target.value})} placeholder="e.g. SLMC-1234" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Branch *</label>
                  <select className="form-control" required value={form.branch_id || 1} onChange={e => setForm({...form, branch_id: Number(e.target.value)})}>
                    {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingStaff(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : editingStaff ? 'Save Changes' : 'Add Staff'}
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