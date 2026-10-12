import React, { useState, useEffect, useMemo, useRef } from 'react';
import { branchService, Branch, staffService, Staff, apiErrorMessage } from '../services/api';
import { useAuth } from '../auth/AuthContext';

export default function Branches() {
  const { isAdmin, user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [managerBranch, setManagerBranch] = useState<Branch | null>(null);
  const [managerId, setManagerId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Partial<Branch>>({
    branch_name: '',
    location: '',
    contact_details: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [staffError, setStaffError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const loadVersion = useRef(0);
  const scopeVersion = useRef(0);
  const mounted = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    scopeVersion.current += 1;
    setBranches([]);
    setStaffList([]);
    setShowModal(false);
    setManagerBranch(null);
    setSuccessMsg('');
    void loadData();
    return () => {
      mounted.current = false;
      loadVersion.current += 1;
      scopeVersion.current += 1;
    };
  }, [user?.user_id, user?.branch_id, user?.role, isAdmin]);

  const loadData = async () => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setLoadError('');
    setStaffError('');
    const [branchResult, staffResult] = await Promise.allSettled([
      branchService.getAll(), staffService.getAll(),
    ]);
    if (!mounted.current || version !== loadVersion.current) return;
    if (branchResult.status === 'fulfilled') setBranches(branchResult.value);
    else setLoadError(apiErrorMessage(branchResult.reason, 'Could not load branches. Please retry.'));
    if (staffResult.status === 'fulfilled') setStaffList(staffResult.value);
    else setStaffError(apiErrorMessage(staffResult.reason, 'Could not load branch staff. Staff counts and manager details are unavailable. Please retry.'));
    setIsLoading(false);
  };

  const closeModal = () => {
    if (!submittingRef.current) setShowModal(false);
  };

  const openModal = () => {
    if (submittingRef.current) return;
    setForm({ branch_name: '', location: '', contact_details: '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!isAdmin) {
      setError('Only administrators can create branches.');
      return;
    }
    const payload = {
      branch_name: form.branch_name?.trim() || '',
      location: form.location?.trim() || '',
      contact_details: form.contact_details?.trim() || '',
    };
    if (!payload.branch_name || !payload.location) {
      setError('Enter a branch name and location.');
      return;
    }
    const scope = scopeVersion.current;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const created = await branchService.create(payload);
      if (!mounted.current || scope !== scopeVersion.current) return;
      loadVersion.current += 1;
      setIsLoading(false);
      setBranches(current => [...current.filter(branch => branch.branch_id !== created.branch_id), created]
        .sort((a, b) => a.branch_name.localeCompare(b.branch_name)));
      setSuccessMsg(`${created.branch_name} created successfully.`);
      setShowModal(false);
      setForm({ branch_name: '', location: '', contact_details: '' });
    } catch (err) {
      if (mounted.current && scope === scopeVersion.current) setError(apiErrorMessage(err, 'Could not confirm branch creation. Check the branch list before trying again.'));
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const assignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !managerBranch || submittingRef.current || staffError) return;
    const staffId = Number(managerId);
    const candidate = staffList.find(staff => staff.staff_id === staffId
      && staff.branch_id === managerBranch.branch_id
      && ['branch_manager', 'manager'].includes(staff.role.trim().toLowerCase().replace(/ /g, '_')));
    if (!candidate) {
      setError('Select a branch-manager staff member from this branch.');
      return;
    }
    const scope = scopeVersion.current;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const updated = await branchService.update(managerBranch.branch_id, { manager_staff_id: staffId });
      if (!mounted.current || scope !== scopeVersion.current) return;
      loadVersion.current += 1;
      setIsLoading(false);
      setBranches(current => current.map(branch => branch.branch_id === updated.branch_id ? updated : branch));
      setSuccessMsg(`Manager assigned to ${updated.branch_name}.`);
      setManagerBranch(null);
    } catch (err) {
      if (mounted.current && scope === scopeVersion.current) {
        setError(apiErrorMessage(err, 'Could not confirm the manager assignment. Refresh before retrying.'));
      }
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const staffByBranch = useMemo(() => {
    const map = new Map<number, Staff[]>();
    staffList.forEach((s) => {
      const list = map.get(s.branch_id) ?? [];
      list.push(s);
      map.set(s.branch_id, list);
    });
    return map;
  }, [staffList]);

  const getStaffForBranch = (branchId: number) =>
    staffByBranch.get(branchId) ?? [];

  const getManager = (managerId?: number | null) => {
    if (!managerId) return null;
    return staffList.find((s) => s.staff_id === managerId) ?? null;
  };

  const initials = (first?: string, last?: string) =>
    `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '??';

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.branch_name.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        (b.contact_details ?? '').toLowerCase().includes(q)
    );
  }, [branches, search]);

  
  if (isLoading) {
    return (
      <div className="animate-[fade-in_0.3s_ease]">
        <div className="section-header mb-6">
          <div>
            <div className="skeleton h-7 w-64 mb-2" />
            <div className="skeleton h-4 w-48" />
          </div>
        </div>
        <div className="branches-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.3s_ease]">
      {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="section-header mb-6">
        <div>
          <h2 className="text-gray-900 m-0">MedSync Branches</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loadError ? 'Branch count unavailable' : `${branches.length} branch${branches.length === 1 ? '' : 'es'} available to you`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" disabled={submitting} onClick={() => void loadData()}>Refresh</button>
          <div className="search-box">
            <input
              type="search"
              placeholder="Search branches…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary"
              disabled={!!loadError || submitting}
              onClick={openModal}
            >
              + Add Branch
            </button>
          )}
        </div>
      </div>

      {staffError && <div className="alert alert-error" role="alert">{staffError} <button className="btn btn-secondary btn-sm" disabled={submitting} onClick={() => void loadData()}>Retry</button></div>}

      {/* ── Empty state ────────────────────────────────────────── */}
      {loadError ? (
        <div className="alert alert-error" role="alert">{loadError} <button className="btn btn-secondary btn-sm" disabled={submitting} onClick={() => void loadData()}>Retry</button></div>
      ) : filteredBranches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">
              {search ? 'No branches match your search' : 'No branches yet'}
            </div>
            <div className="empty-state-desc">
              {search
                ? 'Try a different keyword or clear the search.'
                : isAdmin ? 'Get started by adding your first MedSync branch.' : 'No branches are available to your account.'}
            </div>
            {isAdmin && !search && (
              <button
                className="btn btn-primary"
                disabled={submitting}
                onClick={openModal}
              >
                + Add Branch
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="branches-grid">
          {filteredBranches.map((branch) => {
            const branchStaff = getStaffForBranch(branch.branch_id);
            const doctors = branchStaff.filter((s) =>
              s.role.toLowerCase().includes('doctor')
            );
            const manager = getManager(branch.manager_staff_id);

            return (
              <article key={branch.branch_id} className="branch-card">
                {/* Header strip */}
                <header className="branch-card-header">
                  <div className="branch-card-header-main">
                    <span className="eyebrow">Branch</span>
                    <h3 className="branch-card-title">{branch.branch_name}</h3>
                    <p className="branch-card-location">
                      <span className="branch-pin" aria-hidden>📍</span>
                      {branch.location}, Sri Lanka
                    </p>
                  </div>
                  <span className="branch-id-pill">#{branch.branch_id}</span>
                </header>

                {/* Stats row */}
                <div className="branch-card-stats">
                  <div className="branch-stat">
                    <span className="branch-stat-value">{staffError ? 'Unavailable' : branchStaff.length}</span>
                    <span className="branch-stat-label">Total Staff</span>
                  </div>
                  <div className="branch-stat">
                    <span className="branch-stat-value branch-stat-value--accent">
                      {staffError ? 'Unavailable' : doctors.length}
                    </span>
                    <span className="branch-stat-label">Doctor-role Staff</span>
                  </div>
                </div>

                {/* Details */}
                <div className="branch-card-details">
                  <div className="branch-detail-row">
                    <span className="branch-detail-label">Contact</span>
                    <span className="branch-detail-value">
                      {branch.contact_details || (
                        <span className="text-muted">Not provided</span>
                      )}
                    </span>
                  </div>
                  <div className="branch-detail-row">
                    <span className="branch-detail-label">Manager</span>
                    <span className="branch-detail-value">
                      {staffError ? <span className="text-muted">Unavailable</span> : manager ? (
                        <span className="branch-manager">
                          <span className="avatar branch-manager-avatar">
                            {initials(manager.first_name, manager.last_name)}
                          </span>
                          {manager.first_name} {manager.last_name}
                        </span>
                      ) : (
                        <span className="badge badge-gray">{branch.manager_staff_id ? 'Details unavailable' : 'Not assigned'}</span>
                      )}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button className="btn btn-secondary btn-sm" disabled={!!staffError || submitting}
                    onClick={() => {
                      setManagerBranch(branch);
                      setManagerId(branch.manager_staff_id?.toString() ?? '');
                      setError('');
                      setSuccessMsg('');
                    }}>
                    {branch.manager_staff_id ? 'Change Manager' : 'Assign Manager'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {managerBranch && (
        <div className="modal-overlay" onClick={() => { if (!submittingRef.current) setManagerBranch(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="manager-dialog-title"
            onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" id="manager-dialog-title">Manager - {managerBranch.branch_name}</h3>
              <button className="modal-close" aria-label="Close" disabled={submitting}
                onClick={() => setManagerBranch(null)} />
            </div>
            <form onSubmit={assignManager}>
              <div className="modal-body">
                {error && <div className="alert alert-error" role="alert">{error}</div>}
                <label className="form-label" htmlFor="branch-manager">Branch manager *</label>
                <select id="branch-manager" className="form-control" required disabled={submitting || !!staffError}
                  value={managerId} onChange={event => setManagerId(event.target.value)}>
                  <option value="">Select a manager</option>
                  {getStaffForBranch(managerBranch.branch_id)
                    .filter(staff => ['branch_manager', 'manager'].includes(staff.role.trim().toLowerCase().replace(/ /g, '_')))
                    .map(staff => <option key={staff.staff_id} value={staff.staff_id}>{staff.first_name} {staff.last_name}</option>)}
                </select>
                <p className="text-sm text-muted">Create staff with the Branch Manager role in this branch first if no manager is available.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" type="button" disabled={submitting} onClick={() => setManagerBranch(null)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={submitting || !!staffError || !managerId}>
                  {submitting ? 'Saving...' : 'Assign Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Branch Modal ───────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Branch</h3>
              <button
                className="modal-close"
                disabled={submitting}
                onClick={closeModal}
                aria-label="Close"
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input
                    className="form-control"
                    required
                    maxLength={150}
                    value={form.branch_name || ''}
                    onChange={(e) =>
                      setForm({ ...form, branch_name: e.target.value })
                    }
                    placeholder="e.g. MedSync Negombo"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input
                    className="form-control"
                    required
                    maxLength={255}
                    value={form.location || ''}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="e.g. Negombo"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Contact</label>
                  <input
                    className="form-control"
                    value={form.contact_details || ''}
                    onChange={(e) =>
                      setForm({ ...form, contact_details: e.target.value })
                    }
                    placeholder="Phone number"
                    maxLength={255}
                  />
                </div>
                </fieldset>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={submitting}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner border-2 size-3.5" /> Creating…
                    </>
                  ) : (
                    'Create Branch'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );

}
