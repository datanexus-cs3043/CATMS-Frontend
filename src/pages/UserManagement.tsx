import React, { useEffect, useState } from 'react';
import { apiErrorMessage, userService } from '../services/api';
import type { User } from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      setUsers(await userService.list());
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load users.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const resetPassword = async (user: User) => {
    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    if (!window.confirm(`Reset ${displayName}'s password to password123?`)) return;

    setResettingId(user.user_id);
    setError('');
    setSuccessMsg('');
    try {
      const response = await userService.resetPassword(user.user_id);
      setSuccessMsg(`${displayName}: ${response.message}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to reset the password.'));
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>User Management</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Reset passwords for user accounts.</p>
        </div>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{successMsg}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(item => (
              <div key={item} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No users found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.user_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed user'}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>ID: {user.user_id}</div>
                    </td>
                    <td>{user.username}</td>
                    <td>{user.email || '—'}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => resetPassword(user)}
                        disabled={resettingId === user.user_id}
                      >
                        {resettingId === user.user_id ? 'Resetting...' : 'Reset Password'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
