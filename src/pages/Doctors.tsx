import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService, apiErrorMessage, Doctor } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import DoctorProfileForm from '../components/DoctorProfileForm';

export default function Doctors() {
  const navigate = useNavigate();
  const { user, isPatient } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');

  useEffect(() => {
    let cancelled = false;
    doctorService.getAll()
      .then(data => { if (!cancelled) setDoctors(data); })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'Could not load the doctor directory. Please reload.')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const branches = Array.from(new Map(doctors.filter(d => d.branch_id).map(d => [
    d.branch_id, { branch_id: d.branch_id, branch_name: d.branch_name || `Branch #${d.branch_id}` },
  ])).values());
  const specialties = Array.from(new Map(doctors.flatMap(d => d.specialties || []).map(s => [s.specialty_id, s])).values());

  const filtered = doctors.filter(d => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      d.doctor_name.toLowerCase().includes(q) ||
      d.doctor_license_number.toLowerCase().includes(q) ||
      (d.specialties || []).some(s => s.specialty_name.toLowerCase().includes(q));
    const matchBranch = !filterBranch || String(d.branch_id) === filterBranch;
    const matchSpec = !filterSpecialty ||
      d.specialties?.some(s => String(s.specialty_id) === filterSpecialty);
    return matchSearch && matchBranch && matchSpec;
  });

  const getBranchName = (id?: number) =>
    id ? branches.find(b => b.branch_id === id)?.branch_name || `Branch #${id}` : '—';

  const specialtyColors = ['#1d6fb8', '#3f89cc', '#155a96', '#b86e0c', '#0f4575', '#c2372f'];

  return (
    <div className="animate-[fade-in_0.3s_ease]">
      <div className="section-header">
        <div>
          <h2 className="text-gray-900 m-0">
            Doctor Directory
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} of {doctors.length} doctors
          </p>
        </div>
        <div className="page-actions">
          {user?.role === 'admin' && <button className="btn btn-primary" onClick={() => setRegistering(true)}>Register doctor</button>}
          <div className="search-box">
            <input
              placeholder="Search by name, license or specialty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-control w-auto py-2 px-3" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
          </select>
          <select className="form-control w-auto py-2 px-3" value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}>
            <option value="">All Specialties</option>
            {specialties.map(s => <option key={s.specialty_id} value={s.specialty_id}>{s.specialty_name}</option>)}
          </select>
        </div>
      </div>

      {registering && user?.role === 'admin' && <div className="modal-overlay">
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="register-doctor-title">
          <div className="modal-header"><h3 id="register-doctor-title">Register doctor</h3></div>
          <div className="modal-body">
            <DoctorProfileForm onCancel={() => setRegistering(false)} onSaved={doc => navigate(`/doctors/${doc.doctor_id}`)} />
          </div>
        </div>
      </div>}

      {error ? <div className="alert alert-error" role="alert">{error}</div> : isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton h-50 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
            </div>
            <p className="empty-state-title">No doctors found</p>
            <p className="empty-state-desc">Try adjusting search or filters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-4">
          {filtered.map(doc => (
            <div
              key={doc.doctor_id}
              className="card cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() => navigate(`/doctors/${doc.doctor_id}`)}
            >
              <div className="card-body p-6">
                <div className="flex gap-3.5 mb-4">
                  <div className="avatar avatar-lg text-xl">
                    {doc.doctor_name.split(' ').filter(w => w !== 'Dr.').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900">
                      {doc.doctor_name}
                    </div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">
                      SLMC: {doc.doctor_license_number}
                    </div>
                  </div>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5 mb-3.5">
                  {(doc.specialties || []).map((spec, idx) => (
                    <span className="py-[3px] px-2.5 rounded-full text-2xs font-semibold bg-(--tint)/8 text-(--tint)"
                      key={spec.specialty_id}
                      style={{ '--tint': specialtyColors[idx % specialtyColors.length] } as React.CSSProperties}
                    >
                      {spec.specialty_name}
                    </span>
                  ))}
                  {(!doc.specialties || doc.specialties.length === 0) && (
                    <span className="text-muted text-xs">No specialties listed</span>
                  )}
                </div>

                <div className="flex gap-4 pt-3.5 border-t border-t-gray-100">
                  <div>
                    <div className="info-label">Branch</div>
                    <div className="info-value text-sm">{getBranchName(doc.branch_id)}</div>
                  </div>
                  {doc.email && (
                    <div>
                      <div className="info-label">Email</div>
                      <div className="info-value text-sm">{doc.email}</div>
                    </div>
                  )}
                </div>
                {isPatient && (
                  <button
                    className="btn btn-primary btn-sm w-full mt-3.5"
                    onClick={e => { e.stopPropagation(); navigate(`/my-appointments?doctor_id=${doc.doctor_id}`); }}
                  >
                    Book with {doc.doctor_name}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
