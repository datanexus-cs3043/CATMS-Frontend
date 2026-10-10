import React, { useState, useEffect, useMemo } from 'react';
import { branchService, Branch, staffService, Staff } from '../services/api';
import { useAuth } from '../auth/AuthContext';

export default function Branches() {
  const { isAdmin } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Partial<Branch>>({
    branch_name: '',
    location: '',
    contact_details: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [b, s] = await Promise.all([
        branchService.getAll(),
        staffService.getAll(),
      ]);
      setBranches(b);
      setStaffList(s);
    } catch {
      /* noop */
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await branchService.create(form);
      setShowModal(false);
      setForm({ branch_name: '', location: '', contact_details: '' });
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create branch');
    } finally {
      setSubmitting(false);
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
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="section-header mb-6">
        <div>
          <h2 className="text-gray-900 m-0">MedSync Branches</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {branches.length} branch{branches.length === 1 ? '' : 'es'} across Sri Lanka
          </p>
        </div>
        <div className="page-actions">
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
              onClick={() => {
                setShowModal(true);
                setError('');
              }}
            >
              + Add Branch
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────────── */}
      {filteredBranches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">
              {search ? 'No branches match your search' : 'No branches yet'}
            </div>
            <div className="empty-state-desc">
              {search
                ? 'Try a different keyword or clear the search.'
                : 'Get started by adding your first MedSync branch.'}
            </div>
            {isAdmin && !search && (
              <button
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
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
                    <span className="branch-stat-value">{branchStaff.length}</span>
                    <span className="branch-stat-label">Total Staff</span>
                  </div>
                  <div className="branch-stat">
                    <span className="branch-stat-value branch-stat-value--accent">
                      {doctors.length}
                    </span>
                    <span className="branch-stat-label">Doctors</span>
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
                      {manager ? (
                        <span className="branch-manager">
                          <span className="avatar branch-manager-avatar">
                            {initials(manager.first_name, manager.last_name)}
                          </span>
                          {manager.first_name} {manager.last_name}
                        </span>
                      ) : (
                        <span className="badge badge-gray">Not assigned</span>
                      )}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Add Branch Modal ───────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Branch</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input
                    className="form-control"
                    required
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
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
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
  