import React, { useState } from 'react';
import { apiErrorMessage, userService } from '../services/api';

export default function ChangePassword() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (form.new_password !== form.confirm_password) {
      setError('The new password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await userService.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccessMsg(response.message);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to change your password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Change Password</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
          Update the password for your account.
        </p>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{successMsg}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                className="form-control"
                type="password"
                required
                value={form.current_password}
                onChange={event => setForm({ ...form, current_password: event.target.value })}
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                className="form-control"
                type="password"
                minLength={6}
                required
                value={form.new_password}
                onChange={event => setForm({ ...form, new_password: event.target.value })}
                autoComplete="new-password"
              />
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 5 }}>At least 6 characters.</div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                className="form-control"
                type="password"
                minLength={6}
                required
                value={form.confirm_password}
                onChange={event => setForm({ ...form, confirm_password: event.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
