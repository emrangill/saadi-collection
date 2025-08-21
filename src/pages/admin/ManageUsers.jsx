import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, updateUser, deleteUser } from '../../services/firebase.js';

// Helpers to convert firestore timestamp or other forms
const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};
const formatDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleString() : 'N/A';
};

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // for expansion (show details + buttons)
  const [editingUser, setEditingUser] = useState(null); // for opening edit modal
  const [editForm, setEditForm] = useState({});

  // Notifications state (non-blocking toasts)
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info', ttl = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, ttl);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      // Exclude admin users from the list
      const filteredUsers = (data || []).filter((u) => u && u.id && u.role !== 'admin');
      setUsers(filteredUsers);
      setLoading(false);
    } catch (err) {
      console.error('ManageUsers: error fetching users', err);
      setError('Failed to load users: ' + (err?.message || err));
      showNotification('Failed to load users', 'error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const setLoadingFor = (id, op) => setActionLoading((prev) => ({ ...prev, [id]: op }));

  const handleApprove = async (id) => {
    const prev = [...users];
    setLoadingFor(id, 'approve');
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, approved: true } : x)));
    try {
      await updateUser(id, { approved: true });
      showNotification('User approved', 'success');
    } catch (err) {
      console.error('approve error', err);
      setUsers(prev);
      showNotification('Failed to approve user', 'error');
    } finally {
      setLoadingFor(id, null);
    }
  };

  const handleReject = async (id) => {
    const prev = [...users];
    setLoadingFor(id, 'reject');
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, approved: false } : x)));
    try {
      await updateUser(id, { approved: false });
      showNotification('User rejected', 'info');
    } catch (err) {
      console.error('reject error', err);
      setUsers(prev);
      showNotification('Failed to reject user', 'error');
    } finally {
      setLoadingFor(id, null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This may be irreversible.')) return;
    const prev = [...users];
    setLoadingFor(id, 'delete');
    setUsers((u) => u.filter((x) => x.id !== id));
    try {
      if (typeof deleteUser === 'function') {
        await deleteUser(id);
      } else {
        await updateUser(id, { deleted: true });
      }
      if (selectedUser?.id === id) setSelectedUser(null);
      if (editingUser?.id === id) setEditingUser(null);
      showNotification('User deleted', 'success');
    } catch (err) {
      console.error('delete error', err);
      setUsers(prev);
      showNotification('Failed to delete user', 'error');
    } finally {
      setLoadingFor(id, null);
    }
  };

  // Expand/collapse an item to show full details and action buttons
  const handleToggleSelect = (user) => {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
    } else {
      setSelectedUser(user);
    }
  };

  // Open edit modal (separate from selecting / expanding)
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role || 'buyer',
      shopName: user.shopName || '',
      approved: !!user.approved,
    });
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEditSubmit = async (id) => {
    if (editForm.role === 'admin') {
      showNotification('You cannot set role to admin from this screen.', 'warning');
      return;
    }

    const prev = [...users];
    setLoadingFor(id, 'edit');
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, ...editForm } : x)));
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        role: editForm.role,
        shopName: editForm.role === 'seller' ? editForm.shopName || '' : '',
        approved: !!editForm.approved,
      };
      await updateUser(id, payload);
      showNotification('User updated', 'success');
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('update error', err);
      setUsers(prev);
      showNotification('Failed to update user', 'error');
    } finally {
      setLoadingFor(id, null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="manage-users">
        <div className="panel">
          <h2>Manage Users</h2>
          <div className="card empty">Loading...</div>
        </div>

        <style jsx>{`
          .manage-users { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:18px; background:#f4f7fb; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto; }
          .panel { width:100%; max-width:900px; }
          .card.empty { padding:28px; background:#fff; border-radius:12px; box-shadow:0 8px 30px rgba(20,24,40,0.06); color:#6b7280; text-align:center;}
        `}</style>
      </div>
    );
  }

  return (
    <div className="manage-users" role="application">
      {/* Toast container */}
      <div className="toasts" aria-live="polite">
        {notifications.map((n) => (
          <div key={n.id} className={`toast ${n.type}`}>
            <div className="toast-message">{n.message}</div>
            <button
              className="toast-close"
              onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand">MyEcom</div>
          <div className="brand-sub">Admin Panel</div>
        </div>

        <nav className="side-nav" aria-label="Admin navigation">
          <button className="nav-item" onClick={() => navigate('/admin')}>Dashboard</button>
          <button className="nav-item active" onClick={() => navigate('/admin/users')}>Manage Users</button>
          <button className="nav-item" onClick={() => navigate('/admin/products')}>Manage Products</button>
          <button className="nav-item" onClick={() => navigate('/admin/orders')}>Manage Orders</button>
          <button className="nav-item" onClick={() => navigate('/admin/discounts')}>Manage Discounts</button>
          <button className="nav-item" onClick={() => navigate('/admin/categories')}>Manage Categories</button>
          <button className="nav-item" onClick={() => navigate('/login')}>Logout</button>
        </nav>

        <div className="sidebar-cta">
          <div className="copyright">© {new Date().getFullYear()} MyEcom</div>
        </div>
      </aside>

      <main className="main" aria-live="polite">
        <header className="topbar">
          <div className="left">
            <div className="shop-pill" aria-hidden>
              <div className="avatar">AD</div>
              <div className="shop-text">
                <div className="shop-title">Welcome, Admin</div>
                <div className="shop-sub">User management & approvals</div>
              </div>
            </div>
          </div>
          {/* menu button removed as requested */}
        </header>

        <section className="content-area">
          <div className="panel">
            <div className="panel-head">
              <h2>Manage Users</h2>
              <input
                type="text"
                placeholder="Search users by name, email or id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Search users"
              />
            </div>

            {error && <div className="card empty error">{error}</div>}

            {filteredUsers.length === 0 ? (
              <div className="card empty">No users to display.</div>
            ) : (
              <div className="user-list" role="list">
                {filteredUsers.map((u, idx) => {
                  const expanded = selectedUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`user-list-item ${expanded ? 'expanded' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleSelect(u)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleToggleSelect(u); }}
                      aria-label={`Open details for ${u.name || u.email || u.id}`}
                      style={{ order: idx }} /* preserves natural order, allows future re-ordering */
                    >
                      <div className="user-list-left">
                        <div className="user-avatar">{(u.name || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}</div>
                        <div className="user-list-details">
                          <div className="row-top">
                            <p className="user-list-name">{u.name || 'N/A'}</p>
                            <div className={`status-pill ${u.approved ? 'approved' : 'pending'}`}>{u.approved ? 'Approved' : 'Pending'}</div>
                          </div>
                          {/* COLLAPSED LIST: only show name + role (no email / createdAt) */}
                          <div className="row-bottom">
                            <span className="user-list-role">{u.role || 'N/A'}</span>
                            {u.shopName && <span className="user-list-shop"> · {u.shopName}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="user-list-right" aria-hidden>
                        {expanded ? (
                          <div className="expanded-area" onClick={(e) => e.stopPropagation()}>
                            <div className="expanded-details">
                              {/* EXPANDED VIEW: show email and createdAt + phone/address */}
                              <div><strong>Email:</strong> {u.email || '—'}</div>
                              <div><strong>Created:</strong> {formatDate(u.createdAt)}</div>
                              <div><strong>Phone:</strong> {u.phone || '—'}</div>
                              <div><strong>Address:</strong> {u.address || '—'}</div>
                            </div>

                            <div className="expanded-actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="ghost"
                                onClick={() => handleOpenEdit(u)}
                                aria-label={`Edit ${u.email || u.id}`}
                                title="Edit user"
                              >
                                Edit
                              </button>

                              {u.approved ? (
                                <button
                                  className="ghost"
                                  onClick={() => handleReject(u.id)}
                                  disabled={actionLoading[u.id] === 'reject'}
                                  title="Reject user"
                                >
                                  {actionLoading[u.id] === 'reject' ? 'Rejecting...' : 'Reject'}
                                </button>
                              ) : (
                                <button
                                  className="primary"
                                  onClick={() => handleApprove(u.id)}
                                  disabled={actionLoading[u.id] === 'approve'}
                                  title="Approve user"
                                >
                                  {actionLoading[u.id] === 'approve' ? 'Approving...' : 'Approve'}
                                </button>
                              )}

                              <button
                                className="danger"
                                onClick={() => handleDelete(u.id)}
                                disabled={actionLoading[u.id] === 'delete'}
                                title="Delete user"
                              >
                                {actionLoading[u.id] === 'delete' ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="view-only" aria-hidden>View</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Modal: user edit */}
        {editingUser && (
          <div className="modal" role="dialog" aria-modal="true" aria-label={`Edit user ${editingUser.name || editingUser.email || editingUser.id}`}>
            <div className="modal-content" role="document">
              <h3>Edit User: {editingUser.name || editingUser.email || editingUser.id}</h3>

              <div className="meta">
                <div><strong>UID:</strong> {editingUser.uid || editingUser.id}</div>
                <div><strong>Created:</strong> {formatDate(editingUser.createdAt)}</div>
                <div><strong>Role:</strong> {editingUser.role}</div>
                <div><strong>Status:</strong> {editingUser.approved ? 'Approved' : 'Pending'}</div>
              </div>

              <div className="edit-form">
                <div className="form-field">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" value={editForm.name} onChange={handleEditChange} />
                </div>
                <div className="form-field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" value={editForm.email} onChange={handleEditChange} />
                </div>
                <div className="form-field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} />
                </div>
                <div className="form-field">
                  <label htmlFor="address">Address</label>
                  <input id="address" name="address" type="text" value={editForm.address} onChange={handleEditChange} />
                </div>
                <div className="form-field">
                  <label htmlFor="role">Role</label>
                  <select id="role" name="role" value={editForm.role} onChange={handleEditChange}>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="editor">Editor</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>

                {editForm.role === 'seller' && (
                  <div className="form-field">
                    <label htmlFor="shopName">Shop Name</label>
                    <input id="shopName" name="shopName" type="text" value={editForm.shopName} onChange={handleEditChange} />
                  </div>
                )}

                <div className="form-field checkbox">
                  <label htmlFor="approved">Approved</label>
                  <input id="approved" name="approved" type="checkbox" checked={!!editForm.approved} onChange={handleEditChange} />
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={() => handleEditSubmit(editingUser.id)} className="primary" disabled={actionLoading[editingUser.id] === 'edit'}>
                  {actionLoading[editingUser.id] === 'edit' ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleCloseEdit} className="secondary">Cancel</button>
                <button onClick={() => handleDelete(editingUser.id)} className="danger" disabled={actionLoading[editingUser.id] === 'delete'}>
                  {actionLoading[editingUser.id] === 'delete' ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        :root {
          --bg: #f5f7fb;
          --surface: #ffffff;
          --muted: #6b7280;
          --text: #0b1b2b;
          --accent: #0f4ef0;
          --accent-2: #6d28d9;
          --success: #16a34a;
          --danger: #ef4444;
          --card-radius: 10px;
          --shadow-soft: 0 8px 20px rgba(9,20,34,0.06);
        }

        * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }

        .manage-users {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 20px;
          padding: 20px;
          min-height: calc(100vh - 60px);
          background: linear-gradient(180deg, var(--bg), #eef4ff);
        }

        /* Toasts */
        .toasts {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 6000;
        }
        .toast {
          display:flex;
          align-items:center;
          gap:12px;
          background: var(--surface);
          color: var(--text);
          padding: 10px 12px;
          border-radius: 10px;
          box-shadow: 0 8px 20px rgba(9,20,34,0.08);
          min-width: 200px;
          max-width: 380px;
          border-left: 4px solid transparent;
          animation: slideIn 260ms ease;
        }
        .toast.info { border-left-color: var(--accent); }
        .toast.success { border-left-color: var(--success); }
        .toast.error { border-left-color: var(--danger); }
        .toast.warning { border-left-color: #f59e0b; }
        .toast-message { flex: 1; font-size: 0.92rem; }
        .toast-close { background: none; border: none; color: var(--muted); font-size: 16px; cursor: pointer; }

        @keyframes slideIn {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Sidebar */
        .sidebar {
          background: linear-gradient(180deg, #071032 0%, #0b1a34 100%);
          border-radius: var(--card-radius);
          padding: 16px;
          color: white;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          box-shadow: var(--shadow-soft);
          max-height: calc(100vh - 56px);
          overflow:auto;
          min-width:0;
        }
        .brand { font-size: 1.15rem; font-weight: 800; }
        .brand-sub { color: rgba(255,255,255,0.78); margin-top:6px; font-size:0.88rem; }

        .side-nav { margin-top: 14px; display:flex; flex-direction:column; gap:8px; }
        .nav-item { text-align:left; background: transparent; color: rgba(255,255,255,0.95); border: none; padding: 9px 10px; border-radius: 8px; font-weight:700; cursor:pointer; transition: background 150ms; }
        .nav-item.active { background: rgba(255,255,255,0.04); box-shadow: 0 6px 14px rgba(0,0,0,0.08); }

        .main { display:flex; flex-direction:column; gap:14px; min-width:0; }

        .topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .shop-pill { display:flex; align-items:center; gap:10px; }
        .avatar { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:white; background: linear-gradient(135deg,var(--accent),var(--accent-2)); font-weight:800; box-shadow: 0 8px 18px rgba(31,111,235,0.08); }
        .shop-title { font-weight:700; color: var(--text); font-size:1rem; }
        .shop-sub { font-size:0.82rem; color: var(--muted); }

        .panel { background: transparent; }
        .panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:12px; }
        .panel-head h2 { margin:0; font-size:1.15rem; color:var(--text); }
        .search-input { padding:9px 12px; border-radius:10px; border:1px solid rgba(9,20,34,0.04); width:100%; max-width:380px; background: linear-gradient(180deg,#fff,#fbfdff); }

        .card.empty { padding:20px; background: var(--surface); border-radius: 10px; box-shadow: var(--shadow-soft); color: var(--muted); text-align:center; }

        /* User list - compact and professional */
        .user-list { display:flex; flex-direction:column; gap:10px; }

        /* Base list item style: desktop uses a regular compact height */
        .user-list-item {
          position: relative;
          background: var(--surface);
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 6px 18px rgba(9,20,34,0.04);
          cursor: pointer;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          transition: transform 160ms ease, box-shadow 160ms ease, background 140ms ease;
          min-height: 56px; /* desktop compact height */
          border: 1px solid transparent;
          overflow: visible;
        }
        .user-list-item.expanded {
          background: linear-gradient(180deg,#ffffff,#f7fbff);
          transform: translateY(-4px);
          border-color: rgba(9,20,34,0.04);
        }

        .user-list-left { display:flex; gap:12px; align-items:center; min-width:0; }
        .user-avatar {
          width:40px;
          height:40px;
          border-radius:8px;
          display:flex;
          align-items:center;
          justify-content:center;
          background: linear-gradient(135deg,#eef4ff,#f1f6ff);
          color:var(--accent);
          font-weight:700;
          font-size:0.9rem;
          box-shadow: inset 0 -6px 14px rgba(13,60,160,0.03);
          flex-shrink:0;
        }

        .user-list-details {
          min-width:0;
          display: block;
          line-height: 1.15rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .row-top { display:flex; align-items:center; gap:8px; }
        .user-list-name {
          font-size:0.95rem;
          font-weight:700;
          color:var(--text);
          margin:0;
          display:block;
          line-height:1.15rem;
        }
        .status-pill {
          font-size:0.72rem;
          padding:3px 8px;
          border-radius:999px;
          font-weight:700;
          color:#fff;
          margin-left:8px;
          white-space:nowrap;
        }
        .status-pill.approved { background: var(--success); }
        .status-pill.pending { background: #f59e0b; }

        .row-bottom { display:flex; gap:8px; align-items:center; color:#475569; font-size:0.82rem; margin-top:4px; }

        .user-list-right { display:flex; align-items:center; gap:12px; }

        .expanded-area { display:flex; gap:14px; align-items:center; }
        .expanded-details { display:flex; flex-direction:column; gap:3px; color:#374151; font-size:0.88rem; min-width:220px; }
        .expanded-actions { display:flex; gap:8px; align-items:center; }

        button {
          border: none;
          cursor: pointer;
          padding: 7px 10px;
          border-radius: 9px;
          font-weight: 700;
          font-size: 0.86rem;
        }
        .primary { background: linear-gradient(90deg,var(--accent),var(--accent-2)); color: white; box-shadow: 0 8px 20px rgba(13,60,160,0.06); }
        .ghost { background: transparent; border: 1px solid rgba(13,60,160,0.06); color: var(--accent); }
        .danger { background: linear-gradient(90deg,var(--danger),#b91c1c); color: white; }

        .view-only { background:transparent; border:1px dashed rgba(9,20,34,0.04); padding:6px 8px; border-radius:8px; color:var(--muted); }

        /* Modal */
        .modal { position:fixed; inset:0; background: rgba(11,18,34,0.55); display:flex; align-items:center; justify-content:center; z-index:4000; padding:20px; }
        .modal-content { background: var(--surface); border-radius:12px; padding:18px; max-width:760px; width:100%; box-shadow: 0 24px 80px rgba(9,20,34,0.16); }
        .modal-content h3 { margin:0 0 12px; color:var(--text); }
        .meta { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px; color:#374151; font-size:0.9rem; }
        .edit-form { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        .form-field { display:flex; flex-direction:column; gap:6px; }
        .form-field label { font-size:0.9rem; color:#374151; margin-bottom:6px; font-weight:600; }
        .form-field input, .form-field select { padding:9px; border-radius:8px; border:1px solid rgba(9,20,34,0.04); font-size:0.95rem; width:100%; background:#fff; }

        .form-field.checkbox { grid-column: 1 / -1; flex-direction:row; align-items:center; gap:8px; }

        .modal-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:14px; }

        @media (max-width:1100px) {
          .manage-users { grid-template-columns: 1fr; padding:16px; }
          .sidebar { position:relative; height:auto; display:flex; flex-direction:row; align-items:center; gap:12px; padding:12px; border-radius:10px; max-height:none; overflow:visible; }
          .side-nav { display:flex; flex-direction:row; gap:8px; overflow:auto; }
          .panel-head { flex-direction:column; align-items:flex-start; gap:10px; }
          .user-list-item { flex-direction:column; align-items:flex-start; min-height: 52px; padding:10px; }
          .expanded-details { min-width: auto; }
          .edit-form { grid-template-columns: 1fr; }
        }

        @media (max-width: 680px) {
          .user-list { gap:8px; }

          .user-list-item {
            padding: 8px 10px;
            min-height: 44px;
            height: 44px; /* FIXED two-line height */
            gap:10px;
            align-items: center;
          }

          .user-avatar {
            width:34px;
            height:34px;
            font-size:0.82rem;
            border-radius:8px;
          }

          .user-list-details {
            -webkit-line-clamp: 2;
            line-height: 16px;
            max-height: 32px; /* 2 * 16px */
            overflow: hidden;
          }

          .user-list-name { font-size:0.95rem; max-width:220px; white-space:normal; }
          .row-bottom { font-size:0.78rem; gap:6px; margin-top:2px; }

          .user-list-item.expanded .expanded-area {
            position: absolute;
            left: 8px;
            right: 8px;
            top: calc(100% + 8px);
            z-index: 60;
            background: var(--surface);
            border-radius: 10px;
            box-shadow: 0 12px 40px rgba(9,20,34,0.12);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 220px;
            overflow: auto;
          }

          .expanded-details { font-size:0.86rem; }
          .expanded-actions { display:flex; gap:8px; flex-wrap:wrap; }
          .expanded-actions button { padding:6px 8px; font-size:0.82rem; border-radius:8px; }

          .search-input { max-width:100%; }
        }

        @media (max-width: 480px) {
          .user-list { gap:6px; }
          .user-list-item {
            padding: 6px 8px;
            min-height: 40px;
            height: 40px; /* FIXED two-line height for smallest devices */
            gap:8px;
            border-radius:8px;
          }
          .user-avatar { width:30px; height:30px; font-size:0.75rem; }
          .user-list-name { font-size:0.92rem; max-width:140px; }
          .row-bottom { font-size:0.75rem; gap:6px; color:#566471; margin-top:2px; }
          .user-list-details {
            -webkit-line-clamp: 2;
            line-height: 15px;
            max-height: 30px; /* 2 * 15px */
          }
          .expanded-details { font-size:0.82rem; }
          .expanded-actions { gap:6px; }
          .expanded-actions button { padding:6px 8px; font-size:0.78rem; }
          .view-only { padding:5px 7px; font-size:0.8rem; }

          .user-list-item.expanded .expanded-area {
            left: 6px;
            right: 6px;
            top: calc(100% + 6px);
            padding: 8px;
            max-height: 180px;
          }
        }
      `}</style>
    </div>
  );
};

export default ManageUsers;