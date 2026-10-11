import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { apiErrorMessage, userService } from '../services/api';
import type { User } from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');

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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = users.filter(user => {
    if (!normalizedSearch) return true;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return [name, user.username, user.email || '', String(user.user_id)]
      .some(value => value.toLowerCase().includes(normalizedSearch));
  });

  const resetPassword = async (user: User) => {
    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
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
      setSelectedUser(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>User Management</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {filteredUsers.length} of {users.length} users · Reset passwords for user accounts.
          </p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <input
              type="search"
              placeholder="Search users..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              aria-label="Search users"
            />
          </div>
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
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">{users.length === 0 ? 'No users found' : 'No matching users found'}</p>
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
                {filteredUsers.map(user => (
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
                        onClick={() => setSelectedUser(user)}
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

      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-password-title" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <KeyRound size={20} color="var(--primary)" aria-hidden="true" />
                <h3 id="reset-password-title" className="modal-title">Reset Password</h3>
              </div>
              <button className="modal-close" type="button" onClick={() => setSelectedUser(null)} aria-label="Close reset password dialog" />
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-700)' }}>
                Reset <strong>{`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username}</strong>'s password to the default password?
              </p>
              <div className="alert alert-info" style={{ marginTop: 16 }}>
                The password will be reset to <strong>password123</strong>.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" type="button" onClick={() => setSelectedUser(null)}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={() => resetPassword(selectedUser)} disabled={resettingId === selectedUser.user_id}>
                {resettingId === selectedUser.user_id ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
