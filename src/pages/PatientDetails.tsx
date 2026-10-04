import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  patientService, appointmentService, insuranceService,
  apiErrorMessage, Patient, Appointment, EmergencyContact, InsurancePolicy
} from '../services/api';
import { statusBadge } from './Appointments';
import { useAuth } from '../auth/AuthContext';

export default function PatientDetails() {


  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(backPath)}>
          Back
        </button>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="avatar avatar-xl">{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                    {patient.first_name} {patient.last_name}
                  </h2>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{patient.patient_type || 'Regular'}</span>
                    <span className="badge badge-gray">#{patient.patient_id}</span>
                    {hasInsurance && <span className="badge badge-success">Insured</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {canEdit && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/appointments?patient_id=${patient.patient_id}`)}>
                        Book Appointment
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/invoices?patient_id=${patient.patient_id}`)}>
                        Invoices
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="info-grid" style={{ marginTop: 20 }}>
                <div className="info-item">
                  <span className="info-label">Date of Birth</span>
                  <span className="info-value">{patient.date_of_birth} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>({calcAge(patient.date_of_birth)} yrs)</span></span>
                </div>
                <div className="info-item">
                  <span className="info-label">Gender</span>
                  <span className="info-value">{patient.gender}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Contact</span>
                  <span className="info-value">{patient.contact_details || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{patient.email || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Address</span>
                  <span className="info-value">{patient.address || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Registered Branch</span>
                  <span className="info-value">{patient.branch_name || `Branch #${patient.branch_id}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'appointments', label: `Appointments (${appointments.length})` },
          { key: 'insurance', label: `Insurance (${policies.length})` },
          { key: 'emergency', label: `Emergency Contacts (${emergencyContacts.length})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-body">
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              {[
                { label: 'Total Appointments', value: appointments.length },
                { label: 'Insurance Policies', value: policies.length },
                { label: 'Emergency Contacts', value: emergencyContacts.length },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)' }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
