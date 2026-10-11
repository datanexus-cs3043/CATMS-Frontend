import React, { useState, useEffect, useRef } from 'react';
import { staffService, branchService, apiErrorMessage, Branch } from '../services/api';
import type { Staff } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import FilteredCount from '../components/FilteredCount';


const roleColor: Record<string, { color: string; bg: string }> = {
  Doctor: { color: '#1d6fb8', bg: '#eef8f3' },
  Receptionist: { color: '#3f89cc', bg: '#f3f8fd' },
  Manager: { color: '#155a96', bg: '#f3f8fd' },
  Admin: { color: '#b86e0c', bg: '#fdf6ea' },
};


export default function Staff() {
  const { isAdmin, isManager, user } = useAuth();
  const canManageStaff = isAdmin || (isManager && !!user?.branch_id);
  const canEditStaff = (staff: Staff) => isAdmin || (
    isManager && staff.branch_id === user?.branch_id &&
    !/admin|manager/i.test(`${staff.role} ${staff.staff_type}`)
  );
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const blankForm = {
    first_name: '', last_name: '', email: '', username: '', contact_details: '',
    staff_type: 'Medical', role: 'Doctor', branch_id: user?.branch_id || 0,
  };
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const [branchError, setBranchError] = useState('');
  const loadVersion = useRef(0);
  const scopeVersion = useRef(0);
  const mounted = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    scopeVersion.current += 1;
    setStaffList([]);
    setBranches([]);
    setShowModal(false);
    setEditingStaff(null);
    setSuccessMsg('');
    setFilterBranch('');
    void loadData();
    return () => {
      mounted.current = false;
      loadVersion.current += 1;
      scopeVersion.current += 1;
    };
  }, [user?.user_id, user?.branch_id, user?.role, isAdmin, isManager]);

  const loadData = async () => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setLoadError('');
    setBranchError('');
    const [staffResult, branchResult] = await Promise.allSettled([staffService.getAll(), branchService.getAll()]);
    if (!mounted.current || version !== loadVersion.current) return;
    if (staffResult.status === 'fulfilled') setStaffList(staffResult.value);
    else setLoadError(apiErrorMessage(staffResult.reason, 'Could not load staff. Please retry.'));
    if (branchResult.status === 'fulfilled') setBranches(branchResult.value);
    else setBranchError(apiErrorMessage(branchResult.reason, 'Could not load branches. Branch selection is unavailable. Please retry.'));
    setIsLoading(false);
  };

  const closeModal = () => {
    if (submittingRef.current) return;
    setShowModal(false);
    setEditingStaff(null);
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
    if (submittingRef.current) return;
    if (!canManageStaff || editingStaff && !canEditStaff(editingStaff)) {
      setError('You do not have permission to manage this staff member.');
      return;
    }
    const payload = {
      first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim(), contact_details: form.contact_details.trim(),
      staff_type: form.staff_type, role: form.role, branch_id: Number(form.branch_id),
    };
    if (!payload.first_name || !payload.last_name || !payload.email || !editingStaff && form.username.trim().length < 3) {
      setError('Enter first name, last name, email and a username of at least three characters for new staff.');
      return;
    }
    if (branchError || !branches.some(branch => branch.branch_id === payload.branch_id) ||
        isManager && !isAdmin && payload.branch_id !== user?.branch_id) {
      setError('Select an available branch within your permissions.');
      return;
    }
    if (!isAdmin && /admin|manager/i.test(`${payload.role} ${payload.staff_type}`)) {
      setError('Only administrators can assign privileged staff roles.');
      return;
    }
    const scope = scopeVersion.current;
    submittingRef.current = true;
    setSubmitting(true); setError('');
    try {
      let saved: Staff;
      if (editingStaff) {
        const { email, ...editableFields } = payload;
        saved = await staffService.update(editingStaff.staff_id, {
          ...editableFields,
          ...(isAdmin ? { email } : {}),
        });
      } else {
        saved = await staffService.create({ ...payload, username: form.username.trim() });
      }
      if (!mounted.current || scope !== scopeVersion.current) return;
      // Use the acknowledged write; a follow-up read must not turn a successful save into a failure.
      loadVersion.current += 1;
      setIsLoading(false);
      setStaffList(current => [...current.filter(staff => staff.staff_id !== saved.staff_id), saved]
        .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)));
      setSuccessMsg(editingStaff
        ? `${saved.first_name} ${saved.last_name} updated successfully.`
        : `${saved.first_name} ${saved.last_name} added as ${saved.role}. Default password: password123. Change it after signing in.${saved.role === 'Doctor' ? ' A separate doctor profile and SLMC licence still need to be linked before clinical scheduling.' : ''}`);
      setShowModal(false);
      setEditingStaff(null);
    } catch (err) {
      if (mounted.current && scope === scopeVersion.current) setError(apiErrorMessage(err, 'Could not confirm the staff save. Check the directory before trying again.'));
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const getBranchName = (id: number) =>
    branches.find(b => b.branch_id === id)?.branch_name || `Branch #${id}`;


  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>Staff Directory</h2>
          {isLoading || loadError ? <p className="text-muted">{isLoading ? 'Loading staff…' : 'Staff count unavailable'}</p> : <FilteredCount filtered={filtered.length} total={staffList.length} label="staff members" />}
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" disabled={isLoading || submitting} onClick={() => void loadData()}>Refresh</button>
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
          {canManageStaff && (
            <button
              className="btn btn-primary"
              disabled={isLoading || !!loadError || !!branchError || !branches.length || submitting}
              onClick={() => {
                const defaultBranch = isManager && user?.branch_id ? user.branch_id : branches[0]?.branch_id || 0;
                setEditingStaff(null);
                setForm({ ...blankForm, branch_id: defaultBranch });
                setShowModal(true);
                setError('');
              }}
            >
              Add Staff
            </button>
          )}
        </div>
      </div>

      {branchError && <div className="alert alert-error" role="alert">{branchError} <button className="btn btn-secondary btn-sm" disabled={isLoading || submitting} onClick={() => void loadData()}>Retry</button></div>}

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : loadError ? (
          <div className="alert alert-error" role="alert">{loadError} <button className="btn btn-secondary btn-sm" disabled={submitting} onClick={() => void loadData()}>Retry</button></div>
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
                  {canManageStaff && <th>Actions</th>}
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
                      {canManageStaff && (
                        <td>
                          {canEditStaff(s) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={!!branchError || submitting}
                              onClick={() => {
                                setEditingStaff(s);
                                setForm({
                                  first_name: s.first_name,
                                  username: '',
                                  last_name: s.last_name,
                                  email: s.email,
                                  contact_details: s.contact_details || '',
                                  staff_type: s.staff_type,
                                  role: s.role,
                                  branch_id: s.branch_id,
                                });
                                setError('');
                                setShowModal(true);
                              }}
                            >
                              Edit
                            </button>
                          )}
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button className="modal-close" disabled={submitting} aria-label="Close" onClick={closeModal}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-control" required maxLength={100} value={form.first_name || ''} onChange={e => setForm({...form, first_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" required maxLength={100} value={form.last_name || ''} onChange={e => setForm({...form, last_name: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{editingStaff ? 'Staff Contact Email *' : 'Email *'}</label>
                    <input type="email" className="form-control" required maxLength={255} disabled={!!editingStaff && !isAdmin} value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
                    {editingStaff && <p className="text-muted">This is the staff contact email. Updating it does not change the sign-in account email.</p>}
                  </div>
                  <div className="form-group">
                    {!editingStaff && (
                      <>
                        <label className="form-label">Username *</label>
                        <input className="form-control" required minLength={3} maxLength={100} value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} />
                      </>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact</label>
                    <input className="form-control" maxLength={255} value={form.contact_details || ''} onChange={e => setForm({...form, contact_details: e.target.value})} />
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
                      {isAdmin && <option>Manager</option>}
                      {isAdmin && <option>Admin</option>}
                    </select>
                  </div>
                </div>
                {!editingStaff && form.role === 'Doctor' && (
                  <div className="alert alert-info">
                    This form creates a staff member and sign-in account only. It does not save an SLMC licence or create a doctor profile. A separate linked doctor profile is required before clinical scheduling.
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Branch *</label>
                  {isManager && user?.branch_id ? (
                    <select className="form-control" disabled value={user.branch_id}>
                      {branches.filter(b => b.branch_id === user.branch_id).map(b => (
                        <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                      ))}
                    </select>
                  ) : (
                    <select className="form-control" required value={form.branch_id || ''} onChange={e => setForm({...form, branch_id: Number(e.target.value)})}>
                      <option value="" disabled>Select a branch</option>
                      {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                    </select>
                  )}
                </div>
                </fieldset>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" disabled={submitting} onClick={closeModal}>Cancel</button>
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
