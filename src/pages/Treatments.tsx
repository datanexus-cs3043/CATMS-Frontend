import React, { useState, useEffect } from 'react';
import { treatmentService, Treatment, TreatmentCategory } from '../services/api';
import { useAuth } from '../auth/AuthContext';


const categoryColors = ['#1d6fb8', '#3f89cc', '#155a96', '#b86e0c', '#0f4575', '#c2372f'];

export default function Treatments() {
  const { isAdmin } = useAuth();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [categories, setCategories] = useState<TreatmentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'grid'>('list');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [t, c] = await Promise.all([
        treatmentService.getAll(),
        treatmentService.getCategories(),
      ]);
      setTreatments(t);
      setCategories(c);
    } catch {}
    finally { setIsLoading(false); }
  };

  const filtered = treatments.filter(t => {
    const matchSearch = !search ||
      t.treatment_name.toLowerCase().includes(search.toLowerCase()) ||
      t.service_code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || String(t.category_id) === filterCategory;
    return matchSearch && matchCat;
  });

  const getCategoryName = (id: number) =>
    categories.find(c => c.category_id === id)?.category_name || `Category #${id}`;

  const getCategoryColor = (id: number) => {
    const idx = categories.findIndex(c => c.category_id === id);
    return categoryColors[idx % categoryColors.length] || '#1d6fb8';
  };

  // Group by category
  const grouped = categories.reduce<Record<number, Treatment[]>>((acc, cat) => {
    acc[cat.category_id] = filtered.filter(t => t.category_id === cat.category_id);
    return acc;
  }, {});


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

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">No treatments found</p>
            <p className="empty-state-desc">Try adjusting your search or filter.</p>
          </div>
        </div>
      ) : activeTab === 'list' ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Service Code</th>
                  <th>Treatment Name</th>
                  <th>Category</th>
                  <th>Standard Price</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const color = getCategoryColor(t.category_id);
                  return (
                    <tr key={t.treatment_id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--gray-100)', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                          {t.service_code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{t.treatment_name}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: 12, fontWeight: 600, background: `${color}15`, color }}>
                          {t.category_name || getCategoryName(t.category_id)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 14 }}>
                        Rs. {Number(t.standard_price).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Grid view - grouped by category
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {categories.filter(cat => (grouped[cat.category_id] || []).length > 0).map((cat, idx) => {
            const color = categoryColors[idx % categoryColors.length];
            const catTreatments = grouped[cat.category_id] || [];
            return (
              <div key={cat.category_id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>{cat.category_name}</h3>
                  <span className="badge" style={{ background: `${color}18`, color }}>{catTreatments.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                  {catTreatments.map(t => (
                    <div key={t.treatment_id} className="card" style={{ padding: '18px 20px', borderLeft: `3px solid ${color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)', marginBottom: 4 }}>{t.treatment_name}</div>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 3 }}>
                            {t.service_code}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color }}>
                          Rs. {Number(t.standard_price).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

//Tharushi