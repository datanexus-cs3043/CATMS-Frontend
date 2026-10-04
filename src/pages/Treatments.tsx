import React, { useState, useEffect } from 'react';
import { treatmentService, Treatment, TreatmentCategory } from '../services/api';
import { useAuth } from '../auth/AuthContext';

const categoryColors = ['#1d6fb8', '#3f89cc', '#155a96', '#b86e0c', '#0f4575', '#c2372f'];

export default function Treatments() {

    
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>Treatment Catalogue</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {filtered.length} treatments across {categories.length} categories
          </p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <input placeholder="Search treatments or code..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto', padding: '8px 12px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
          <div style={{ display: 'flex', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {(['list', 'grid'] as const).map(v => (
              <button
                key={v}
                onClick={() => setActiveTab(v)}
                style={{
                  padding: '7px 12px', border: 'none',
                  background: activeTab === v ? 'var(--primary-100)' : 'white',
                  color: activeTab === v ? 'var(--primary)' : 'var(--gray-500)',
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                {v === 'list' ? 'List' : 'Grid'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {categories.map((cat, idx) => {
          const count = treatments.filter(t => t.category_id === cat.category_id).length;
          const color = categoryColors[idx % categoryColors.length];
          return (
            <div
              key={cat.category_id}
              className="card"
              style={{ padding: '20px', cursor: 'pointer', borderTop: `3px solid ${color}`, transition: 'all 0.2s' }}
              onClick={() => setFilterCategory(String(cat.category_id))}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <div style={{ fontSize: 22, fontWeight: 600, color, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>{cat.category_name}</div>
              {cat.description && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>{cat.description}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
