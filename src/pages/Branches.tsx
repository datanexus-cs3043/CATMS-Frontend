import React, { useState, useEffect } from 'react';
import { branchService, Branch, staffService, Staff } from '../services/api';
import { useAuth } from '../auth/AuthContext';

export default function Branches() {
  const { isAdmin } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Branch>>({ branch_name: '', location: '', contact_details: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [b, s] = await Promise.all([branchService.getAll(), staffService.getAll()]);
      setBranches(b);
      setStaffList(s);
    } catch {} finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await branchService.create(form);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create branch');
    } finally { setSubmitting(false); }
  };

  const getStaffForBranch = (branchId: number) =>
    staffList.filter(s => s.branch_id === branchId);

  const getManagerName = (branchId: number, managerId?: number | null) => {
    if (!managerId) return 'Not assigned';
    const manager = staffList.find(s => s.staff_id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : `Staff #${managerId}`;
  };

  if (isLoading) return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-70 rounded-lg" />)}
    </div>
  );

  return (
    <div className="animate-[fade-in_0.3s_ease]">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-gray-900 m-0">MedSync Branches</h2>
          <p className="text-sm text-gray-500 mt-0.5">{branches.length} branches across Sri Lanka</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>
            Add Branch
          </button>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
        {branches.map(branch => {
          const branchStaff = getStaffForBranch(branch.branch_id);
          const doctors = branchStaff.filter(s => s.role.toLowerCase().includes('doctor'));

          return (
            <div key={branch.branch_id} className="card overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg"
            >
              {/* Top gradient header */}
              <div className="bg-primary-50 border-b border-b-primary-100 py-5 px-6 text-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="eyebrow mb-1">Branch</div>
                    <h3 className="font-display text-[20px] font-semibold m-0">{branch.branch_name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{branch.location}, Sri Lanka</p>
                  </div>
                  <span className="bg-white border border-primary-200 text-primary-dark py-[3px] px-2.5 rounded-full text-xs font-semibold">
                    #{branch.branch_id}
                  </span>
                </div>
              </div>

              <div className="py-5 px-6">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 mb-4">
                  <div className="bg-primary-50 rounded-md py-3 px-3.5 text-center">
                    <div className="text-2xl font-semibold text-primary">{branchStaff.length}</div>
                    <div className="text-xs text-gray-500">Total Staff</div>
                  </div>
                  <div className="bg-primary-50 rounded-md py-3 px-3.5 text-center">
                    <div className="text-2xl font-semibold text-primary-light">{doctors.length}</div>
                    <div className="text-xs text-gray-500">Doctors</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-600">{branch.contact_details || 'No contact'}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-600">
                      Manager: {getManagerName(branch.branch_id, branch.manager_staff_id)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Branch</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input className="form-control" required value={form.branch_name || ''} onChange={e => setForm({...form, branch_name: e.target.value})} placeholder="e.g. MedSync Negombo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input className="form-control" required value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Negombo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact</label>
                  <input className="form-control" value={form.contact_details || ''} onChange={e => setForm({...form, contact_details: e.target.value})} placeholder="Phone number" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner border-2 size-3.5" /> Creating...</> : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
