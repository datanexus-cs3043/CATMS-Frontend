import React, { useState, useEffect, useCallback, useRef } from 'react';
import FilteredCount from '../components/FilteredCount';
import { treatmentService, apiErrorMessage, Treatment, TreatmentCategory } from '../services/api';
import { useAuth } from '../auth/AuthContext';


const categoryColors = ['#1d6fb8', '#3f89cc', '#155a96', '#b86e0c', '#0f4575', '#c2372f'];
const emptyForm = { service_code: '', treatment_name: '', category_id: '', standard_price: '' };
const formatPrice = (price: number) => Number(price).toLocaleString(undefined, {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export default function Treatments() {
  const { isAdmin } = useAuth();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [categories, setCategories] = useState<TreatmentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'grid'>('list');
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TreatmentCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ category_name: '', description: '' });
  const [categoryError, setCategoryError] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const saving = useRef(false);
  const categorySaving = useRef(false);
  const loadRequest = useRef(0);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const categoryHeading = useRef<HTMLHeadingElement>(null);

  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const [t, c] = await Promise.all([
        treatmentService.getAll(),
        treatmentService.getCategories(),
      ]);
      if (request === loadRequest.current) {
        setTreatments(t);
        setCategories(c);
      }
    } catch (err) {
      if (request === loadRequest.current) {
        setLoadError(apiErrorMessage(err, 'Could not load the treatment catalogue. Please try again.'));
      }
    } finally {
      if (request === loadRequest.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    return () => { loadRequest.current += 1; };
  }, [loadData]);

  useEffect(() => {
    if (showForm) formHeading.current?.focus();
  }, [showForm, editingTreatment]);

  useEffect(() => {
    if (showCategoryForm) categoryHeading.current?.focus();
  }, [showCategoryForm, editingCategory]);

  const openForm = (treatment: Treatment | null = null) => {
    if (!isAdmin || saving.current || categorySaving.current) return;
    setShowCategoryForm(false);
    setEditingTreatment(treatment);
    setForm(treatment ? {
      service_code: treatment.service_code,
      treatment_name: treatment.treatment_name,
      category_id: String(treatment.category_id),
      standard_price: Number(treatment.standard_price).toFixed(2),
    } : { ...emptyForm, category_id: filterCategory });
    setFormError('');
    setSuccessMessage('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving.current) return;
    setShowForm(false);
    setEditingTreatment(null);
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || saving.current || categorySaving.current) return;
    const serviceCode = form.service_code.trim();
    const treatmentName = form.treatment_name.trim();
    const categoryId = Number(form.category_id);
    const priceText = form.standard_price.trim();
    const price = Number(priceText);
    if (!serviceCode || serviceCode.length > 50 || !treatmentName || treatmentName.length > 150) {
      setFormError('Enter a service code (up to 50 characters) and treatment name (up to 150 characters).');
      return;
    }
    if (!Number.isSafeInteger(categoryId) || !categories.some(c => c.category_id === categoryId)) {
      setFormError('Choose an existing treatment category.');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(priceText) || !Number.isFinite(price) || price > 99999999.99) {
      setFormError('Enter a price from 0 to 99,999,999.99 with no more than two decimal places.');
      return;
    }
    if (treatments.some(t => t.treatment_id !== editingTreatment?.treatment_id &&
      t.service_code.toLowerCase() === serviceCode.toLowerCase())) {
      setFormError('That service code is already used. Choose a different code.');
      return;
    }
    saving.current = true;
    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');
    try {
      const payload = {
        service_code: serviceCode, treatment_name: treatmentName,
        category_id: categoryId, standard_price: price,
      };
      const saved = editingTreatment
        ? await treatmentService.update(editingTreatment.treatment_id, payload)
        : await treatmentService.create(payload);
      setTreatments(previous => [...previous.filter(t => t.treatment_id !== saved.treatment_id), saved]
        .sort((a, b) => a.treatment_name.localeCompare(b.treatment_name)));
      setSuccessMessage(`${saved.treatment_name} ${editingTreatment ? 'updated' : 'added'} successfully.`);
      setShowForm(false);
      setEditingTreatment(null);
    } catch (err) {
      setFormError(apiErrorMessage(err, `Could not ${editingTreatment ? 'update' : 'add'} the treatment. Please try again.`));
    } finally {
      saving.current = false;
      setSubmitting(false);
    }
  };

  const openCategoryForm = (category: TreatmentCategory | null = null) => {
    if (!isAdmin || saving.current || categorySaving.current) return;
    setEditingCategory(category);
    setCategoryForm({ category_name: category?.category_name || '', description: category?.description || '' });
    setCategoryError('');
    setSuccessMessage('');
    setShowForm(false);
    setShowCategoryForm(true);
  };

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || saving.current || categorySaving.current) return;
    const name = categoryForm.category_name.trim();
    const description = categoryForm.description.trim();
    if (!name || name.length > 150 || description.length > 500) {
      setCategoryError('Enter a category name of up to 150 characters and a description of up to 500 characters.');
      return;
    }
    if (categories.some(c => c.category_id !== editingCategory?.category_id &&
      c.category_name.toLowerCase() === name.toLowerCase())) {
      setCategoryError('A category with that name already exists.');
      return;
    }
    categorySaving.current = true;
    setCategorySubmitting(true);
    setCategoryError('');
    setSuccessMessage('');
    try {
      const payload = { category_name: name, description: description || null };
      const saved = editingCategory
        ? await treatmentService.updateCategory(editingCategory.category_id, payload)
        : await treatmentService.createCategory(payload);
      setCategories(previous => [...previous.filter(c => c.category_id !== saved.category_id), saved]
        .sort((a, b) => a.category_name.localeCompare(b.category_name)));
      setTreatments(previous => previous.map(t => t.category_id === saved.category_id
        ? { ...t, category_name: saved.category_name } : t));
      setSuccessMessage(`${saved.category_name} category ${editingCategory ? 'updated' : 'added'} successfully.`);
      setShowCategoryForm(false);
      setEditingCategory(null);
    } catch (err) {
      setCategoryError(apiErrorMessage(err, 'Could not save the treatment category. Please try again.'));
    } finally {
      categorySaving.current = false;
      setCategorySubmitting(false);
    }
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
      {successMessage && <div className="alert alert-success" role="status">{successMessage}</div>}
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>Treatment Catalogue</h2>
          <FilteredCount filtered={filtered.length} total={treatments.length} label="treatments" />
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
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => openForm()}
              disabled={isLoading || !!loadError || categories.length === 0 || submitting || categorySubmitting}>
              Add Treatment
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-secondary" disabled={isLoading || !!loadError || submitting || categorySubmitting}
              aria-expanded={showCategories} aria-controls="treatment-category-management"
              onClick={() => {
                setShowCategories(previous => !previous);
                setShowCategoryForm(false);
              }}>
              {showCategories ? 'Hide Categories' : 'Manage Categories'}
            </button>
          )}
        </div>
      </div>

      {showCategories && isAdmin && !loadError && !isLoading && (
        <section id="treatment-category-management" className="card" style={{ marginBottom: 20 }}
          aria-labelledby="treatment-categories-title">
          <div className="section-header" style={{ padding: '20px 24px', marginBottom: 0 }}>
            <h3 id="treatment-categories-title" style={{ margin: 0 }}>Treatment Categories</h3>
            <button className="btn btn-primary btn-sm" disabled={submitting || categorySubmitting}
              onClick={() => openCategoryForm()}>Add Category</button>
          </div>
          {showCategoryForm && (
            <div style={{ padding: '0 24px 20px' }}>
              <h4 ref={categoryHeading} tabIndex={-1}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h4>
              {categoryError && <div className="alert alert-error" role="alert" id="category-form-error">{categoryError}</div>}
              <form onSubmit={handleCategorySubmit} noValidate
                aria-describedby={categoryError ? 'category-form-error' : undefined}>
                <fieldset disabled={categorySubmitting} style={{ border: 0, padding: 0, margin: 0 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="category-name">Category Name</label>
                    <input id="category-name" className="form-control" maxLength={150} required
                      value={categoryForm.category_name}
                      onChange={e => setCategoryForm({ ...categoryForm, category_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="category-description">Description (optional)</label>
                    <textarea id="category-description" className="form-control" maxLength={500} rows={3}
                      value={categoryForm.description}
                      onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} />
                  </div>
                  <div className="page-actions">
                    <button className="btn btn-primary" type="submit">{categorySubmitting ? 'Saving…' : 'Save Category'}</button>
                    <button className="btn btn-secondary" type="button" onClick={() => {
                      if (!categorySaving.current) setShowCategoryForm(false);
                    }}>Cancel</button>
                  </div>
                </fieldset>
              </form>
            </div>
          )}
          {categories.length === 0 ? (
            <div className="empty-state"><p>No categories yet. Add a category before adding a treatment.</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Category</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>{categories.map(c => (
                  <tr key={c.category_id}>
                    <td>{c.category_name}</td>
                    <td>{c.description || '—'}</td>
                    <td><button className="btn btn-secondary btn-sm" disabled={submitting || categorySubmitting}
                      aria-label={`Edit ${c.category_name} category`} onClick={() => openCategoryForm(c)}>Edit</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showForm && isAdmin && (
        <section className="card" aria-labelledby="treatment-form-title" style={{ padding: 24, marginBottom: 20 }}>
          <h3 id="treatment-form-title" ref={formHeading} tabIndex={-1} style={{ marginTop: 0 }}>
            {editingTreatment ? 'Edit Treatment' : 'Add Treatment'}
          </h3>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            Catalogue changes apply to future treatment selections. Already recorded treatment prices stay unchanged.
          </p>
          {formError && <div className="alert alert-error" role="alert" id="treatment-form-error">{formError}</div>}
          <form onSubmit={handleSubmit} noValidate aria-describedby={formError ? 'treatment-form-error' : undefined}>
            <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="treatment-code">Service Code</label>
                  <input id="treatment-code" className="form-control" required maxLength={50}
                    value={form.service_code} onChange={e => setForm({ ...form, service_code: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="treatment-name">Treatment Name</label>
                  <input id="treatment-name" className="form-control" required maxLength={150}
                    value={form.treatment_name} onChange={e => setForm({ ...form, treatment_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="treatment-category">Category</label>
                  <select id="treatment-category" className="form-control" required value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Choose a category</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="treatment-price">Standard Price (Rs.)</label>
                  <input id="treatment-price" className="form-control" inputMode="decimal" required
                    value={form.standard_price} onChange={e => setForm({ ...form, standard_price: e.target.value })}
                    aria-describedby="treatment-price-help" />
                  <small id="treatment-price-help">Zero is allowed; use up to two decimal places.</small>
                </div>
              </div>
              <div className="page-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" type="submit">{submitting ? 'Saving…' : 'Save Treatment'}</button>
                <button className="btn btn-secondary" type="button" onClick={closeForm}>Cancel</button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      {loadError ? (
        <div className="alert alert-error" role="alert">
          <p>{loadError}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => void loadData()}>Retry</button>
        </div>
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">No treatments found</p>
            <p className="empty-state-desc">{isAdmin && categories.length === 0
              ? 'Use Manage Categories to add a category before creating a treatment.'
              : 'Try adjusting your search or filter.'}</p>
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
                  {isAdmin && <th>Actions</th>}
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
                        Rs. {formatPrice(t.standard_price)}
                      </td>
                      {isAdmin && <td><button className="btn btn-secondary btn-sm" disabled={submitting || categorySubmitting}
                        onClick={() => openForm(t)} aria-label={`Edit ${t.treatment_name}`}>Edit</button></td>}
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
                          Rs. {formatPrice(t.standard_price)}
                        </div>
                      </div>
                      {isAdmin && <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} disabled={submitting || categorySubmitting}
                        onClick={() => openForm(t)} aria-label={`Edit ${t.treatment_name}`}>Edit</button>}
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
