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
    </div>
  );
}
