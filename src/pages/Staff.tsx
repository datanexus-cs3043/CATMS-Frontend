import React, { useState, useEffect } from 'react';
import { staffService, branchService, apiErrorMessage, Branch } from '../services/api';
import type { Staff } from '../services/api';
import { useAuth } from '../auth/AuthContext';


export default function Staff() {

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
            <button className="btn btn-primary" onClick={() => { setForm(blankForm); setShowModal(true); setError(''); }}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>       
    </div>
  );
}
