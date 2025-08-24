import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, updateUser, deleteUser } from '../../services/firebase.js';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [pendingSellers, setPendingSellers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPendingSellers = async () => {
    try {
      setLoading(true);
      const users = await getUsers();
      const sellers = (users || [])
        .filter(u => u && u.id && u.role !== 'admin' && u.role === 'seller' && !u.approved);
      setPendingSellers(sellers);
      setLoading(false);
    } catch (err) {
      console.error('AdminDashboard: Error fetching pending sellers:', err);
      setError('Failed to load pending sellers: ' + (err?.message || err));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (userId) => {
    try {
      await updateUser(userId, { approved: true });
      await fetchPendingSellers();
      alert('Seller approved successfully!');
    } catch (err) {
      console.error('AdminDashboard: approve error', err);
      alert('Failed to approve seller: ' + (err?.message || err));
    }
  };

  const handleReject = async (userId) => {
    try {
      await updateUser(userId, { approved: false });
      await fetchPendingSellers();
      alert('Seller rejected.');
    } catch (err) {
      console.error('AdminDashboard: reject error', err);
      alert('Failed to reject seller: ' + (err?.message || err));
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? This action may be irreversible.')) return;
    try {
      if (typeof deleteUser === 'function') {
        await deleteUser(userId);
      } else {
        await updateUser(userId, { deleted: true });
      }
      await fetchPendingSellers();
      alert('User deleted.');
    } catch (err) {
      console.error('AdminDashboard: delete error', err);
      alert('Failed to delete user: ' + (err?.message || err));
    }
  };

  const getInitials = (name = 'Admin') => {
    const parts = (name || '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'A';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="panel">
          <h2>Admin Dashboard</h2>
          <div className="card empty">Loading...</div>
        </div>

        <style jsx>{`
          .admin-dashboard { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:18px; background:#f4f7fb; }
          .panel { width:100%; max-width:900px; }
          .card.empty { background:#fff; padding:28px; border-radius:12px; box-shadow:0 8px 30px rgba(20,24,40,0.06); text-align:center; color:#6b7280; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" data-page="admin-dashboard">
      {/* Sidebar (only navigation control) */}
      <aside className="sidebar" aria-label="Admin navigation">
        <div className="brand-wrap">
          <div className="brand">Saadi Collection</div>
          <div className="brand-sub">Admin Panel</div>
        </div>

        <nav className="side-nav" aria-label="Admin navigation">
          <button className="nav-item active" onClick={() => navigate('/admin/admindashboard')}>Dashboard</button>
          <button className="nav-item" onClick={() => navigate('/admin/users')}>Manage Users</button>
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

      <main className="main">
        <header className="topbar">
          <div className="left">
            <div className="shop-pill" aria-hidden>
              <div className="avatar" title="Admin">{getInitials('Admin')}</div>
              <div className="shop-text">
                <div className="shop-title">Welcome, Admin</div>
              </div>
            </div>
          </div>
          {/* header buttons removed — navigation only in the sidebar */}
        </header>

        <section className="content-area">
          <div className="panel">
            <div className="panel-head">
              <h2>Pending Seller Approvals</h2>
            </div>

            {error && <div className="card empty error">{error}</div>}

            {pendingSellers.length === 0 ? (
              <div className="card empty">No pending seller approvals.</div>
            ) : (
              <div className="cards-grid" role="list">
                {pendingSellers.map(seller => (
                  <div key={seller.id} className="card seller" role="listitem" tabIndex={0}>
                    <div className="seller-details" title={`${seller.email} • ${seller.role} • ${seller.shopName || ''}`}>
                      <div className="seller-field email">
                        <p className="label">Email</p>
                        <p className="value">{seller.email}</p>
                      </div>
                      <div className="seller-field role">
                        <p className="label">Role</p>
                        <p className="value">{seller.role}</p>
                      </div>
                      <div className="seller-field status">
                        <p className="label">Status</p>
                        <p className="value">{seller.approved ? 'Approved' : 'Pending'}</p>
                      </div>
                      {seller.shopName && (
                        <div className="seller-field shop">
                          <p className="label">Shop Name</p>
                          <p className="value">{seller.shopName}</p>
                        </div>
                      )}
                    </div>

                    <div className="seller-actions" aria-hidden>
                      <button className="primary" onClick={() => handleApprove(seller.id)}>Approve</button>
                      <button className="ghost" onClick={() => handleReject(seller.id)}>Reject</button>
                      <button className="danger" onClick={() => handleDelete(seller.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <style jsx>{`
        :root {
          --bg:#f4f7fb;
          --panel:#ffffff;
          --muted:#6b7280;
          --accent:#1f6feb;
          --accent-2:#7c3aed;
          --danger:#ef4444;
          --danger-2:#b91c1c;
          --card-radius:12px;
          --shadow-soft:0 8px 30px rgba(20,24,40,0.06);
        }
        * { box-sizing:border-box; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial; }

        .admin-dashboard {
          display:grid;
          grid-template-columns:260px 1fr;
          gap:28px;
          padding:28px;
          background:linear-gradient(180deg,#f7fafc 0%,var(--bg) 100%);
          min-height:100vh;
        }

        .sidebar {
          background:linear-gradient(180deg,#0b1223 0%,#0f1724 100%);
          border-radius:var(--card-radius);
          padding:20px;
          color:white;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          box-shadow:var(--shadow-soft);
          max-height:calc(100vh - 56px);
          overflow:auto;
          min-width:0;
        }

        .brand-wrap .brand { font-size:1.2rem; font-weight:800; }
        .side-nav { display:flex; flex-direction:column; gap:8px; margin-top:18px; }
        .nav-item { background:transparent; color:rgba(255,255,255,0.95); border:none; padding:12px 14px; border-radius:10px; text-align:left; cursor:pointer; font-weight:700; }

        .main { display:flex; flex-direction:column; gap:18px; min-width:0; }
        .topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .shop-pill { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:999px; background:transparent; }
        .avatar { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; background:linear-gradient(135deg,var(--accent),var(--accent-2)); font-weight:800; box-shadow:0 8px 22px rgba(31,111,235,0.12); flex-shrink:0; }

        .content-area { display:flex; flex-direction:column; gap:18px; }
        .panel-head h2 { margin:0; font-size:1.15rem; color:#0f1724; }

        .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; align-items:start; }
        .card { background:var(--panel); border-radius:12px; padding:16px; box-shadow:var(--shadow-soft); min-width:0; display:flex; flex-direction:column; justify-content:space-between; }
        .seller-details { display:flex; flex-direction:column; gap:8px; }
        .label { font-size:0.9rem; color:#374151; margin:0 0 4px 0; }
        .value { font-size:0.95rem; color:#0f1724; margin:0; }

        .seller-actions { display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; }
        .primary { background:linear-gradient(90deg,var(--accent),var(--accent-2)); color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:700; }
        .ghost { background:transparent; border:1px solid #e6eefc; padding:8px 12px; border-radius:8px; cursor:pointer; color:var(--accent); font-weight:700; }
        .danger { background:linear-gradient(90deg,var(--danger),var(--danger-2)); color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:700; }

        /* Responsive: keep sidebar visible and adapt layout so it doesn't push content too far down */
        @media (max-width:1100px) {
          .admin-dashboard { grid-template-columns:220px 1fr; padding:18px; }
          .sidebar { position:relative; height:auto; display:flex; flex-direction:column; gap:12px; padding:12px; border-radius:10px; max-height:none; overflow:visible; }
          .side-nav { display:flex; flex-direction:row; gap:8px; overflow:auto; -webkit-overflow-scrolling:touch; }
          .nav-item { padding:8px 10px; font-size:0.92rem; }
          .cards-grid { grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); }
        }

        /* Mobile: make seller cards single-line and compact */
        @media (max-width:520px) {
          .admin-dashboard { grid-template-columns:1fr; gap:12px; padding:14px; }
          .sidebar { flex-direction:row; align-items:center; padding:10px; gap:12px; border-radius:10px; }
          .side-nav { display:flex; flex-direction:row; gap:8px; overflow:auto; }
          .avatar { width:40px; height:40px; }

          .cards-grid { grid-template-columns:1fr; }
          .card.seller {
            display:flex;
            flex-direction:row;
            align-items:center;
            justify-content:space-between;
            padding:8px 10px;
            height:44px; /* single-line height */
            min-height:44px;
            max-height:44px;
            overflow:hidden;
          }

          .seller-details {
            display:flex;
            flex-direction:row;
            gap:10px;
            align-items:center;
            flex:1 1 auto;
            min-width:0;
            overflow:hidden;
          }

          .seller-field .label { display:none; }
          .seller-field { display:flex; align-items:center; gap:6px; min-width:0; }
          .seller-field .value {
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            font-size:0.92rem;
            color:#0f1724;
          }

          .seller-field.email .value { max-width:50%; }
          .seller-field.role .value { max-width:20%; text-transform:capitalize; }
          .seller-field.status .value { max-width:20%; }
          .seller-field.shop .value { max-width:30%; }

          .seller-actions {
            display:flex;
            flex-direction:column;
            gap:6px;
            margin-top:0;
            margin-left:10px;
            flex-shrink:0;
            align-items:flex-end;
          }
          .primary, .ghost, .danger {
            padding:6px 8px;
            font-size:0.78rem;
            border-radius:8px;
            white-space:nowrap;
          }
        }

        @media (max-width:380px) {
          .card.seller {
            height:40px;
            min-height:40px;
            max-height:40px;
            padding:6px 8px;
          }
          .seller-field .value { max-width:110px; font-size:0.88rem; }
          .seller-actions { gap:4px; }
          .primary, .ghost, .danger { padding:5px 7px; font-size:0.74rem; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;