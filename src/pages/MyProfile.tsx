import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  doctorService, patientService, specialtyService, apiErrorMessage,
  Doctor, Patient, Specialty, EmergencyContact, InsurancePolicy,
} from '../services/api';

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
};


return (
    <div style={{ maxWidth: 760, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>My Profile</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
          {isDoctor
            ? 'Manage your professional profile. Changes are shown to patients and staff across the whole system.'
            : 'Manage your contact details, emergency contacts and view your insurance.'}
        </p>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{successMsg}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: `${roleColor}20`, color: roleColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{displayName}</h3>
              <span style={{ background: `${roleColor}15`, color: roleColor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                {isDoctor ? 'Doctor Profile' : 'Patient Profile'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>@{user?.username}</p>
          </div>
          {!editing && <button className="btn btn-primary" onClick={startEditing}>Edit Profile</button>}
        </div>

        {doctor && !editing && (
          <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--gray-100)' }}>
            <p style={labelStyle}>Specialties</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {(doctor.specialties || []).map(s => (
                <span key={s.specialty_id} style={{ background: '#eef8f3', color: '#1d6fb8', fontWeight: 600, fontSize: 13, padding: '5px 14px', borderRadius: 99, border: '1px solid #e4eff9' }}>
                  {s.specialty_name}
                </span>
              ))}
            </div>
            {doctor.bio && (
              <>
                <p style={{ ...labelStyle, marginTop: 16 }}>About</p>
                <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6 }}>{doctor.bio}</p>
              </>
            )}
          </div>
        )}

        <div style={{ padding: '20px 28px' }}>
          {!editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {viewFields.map(f => (
                <div key={f.label} style={{ gridColumn: (f as any).wide ? '1 / -1' : undefined }}>
                  <p style={labelStyle}>{f.label}</p>
                  <p style={{ fontSize: 14, color: 'var(--gray-800)', fontWeight: 500 }}>
                    {f.value || <span style={{ color: 'var(--gray-300)', fontStyle: 'italic' }}>Not provided</span>}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {isDoctor && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-control" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>
              )}

      {isDoctor && (
        <div className="alert" style={{ background: '#f3f8fd', border: '1px solid #c6ddf2', color: '#155a96' }}>
          Your license number and branch can only be changed by an administrator.
        </div>
      )}
      
    </div>
  );
}
