import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { db, auth } from '../../services/firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const Account = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    shopName: '',
    approved: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      console.log('Account: No user, redirecting to /login');
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Account: Firestore profile data:', data);
          setProfile({
            name: data.name || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            address: data.address || '',
            role: data.role || user.role || 'buyer',
            shopName: data.shopName || '',
            approved: data.approved !== undefined ? data.approved : false
          });
          console.log('Account: Set profile role:', data.role || user.role || 'buyer');
        } else {
          console.log('Account: No Firestore user document found for uid:', user.uid);
          setProfile({
            name: user.displayName || '',
            email: user.email || '',
            phone: '',
            address: '',
            role: user.role || 'buyer',
            shopName: '',
            approved: false
          });
          console.log('Account: Set profile role (fallback):', user.role || 'buyer');
        }
      } catch (err) {
        console.error('Account: Error fetching profile:', {
          message: err.message,
          code: err.code,
          stack: err.stack
        });
        setError('Failed to load profile: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleChange = (e) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e && e.preventDefault();
    setSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const payload = {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        role: profile.role || 'buyer',
        shopName: profile.role === 'seller' ? (profile.shopName || '') : '',
        updatedAt: serverTimestamp()
      };
      console.log('Account: Saving profile:', payload);
      await setDoc(userDocRef, payload, { merge: true });
      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Account: Error saving profile:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      setError('Failed to save profile: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    setError(null);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const getInitials = (name = '') => {
    const parts = (name || '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="panel">
          <h2>Your Account</h2>
          <div className="card empty">Loading profile...</div>
        </div>

        <style jsx>{`
          .account-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f4f7fb;
            padding: 18px;
          }
          .panel {
            background: transparent;
            width: 100%;
            max-width: 800px;
          }
          h2 {
            font-size: 1.15rem;
            color: #0f1724;
            margin-bottom: 12px;
          }
          .card.empty {
            text-align: center;
            color: #6b7280;
            padding: 28px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(20, 24, 40, 0.06);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="account-page">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand">MyEcom</div>
          <div className="brand-sub">Account Settings</div>
        </div>

        <nav className="side-nav" aria-label="Account navigation">
          <button
            className="nav-item"
            onClick={() => navigate(profile.role === 'buyer' ? '/buyer/dashboard' : '/seller/dashboard')}
          >
            <span className="nav-label">Dashboard</span>
          </button>
          <button
            className="nav-item active"
            onClick={() => navigate('/account')}
          >
            <span className="nav-label">Account</span>
          </button>
          <button
            className="nav-item"
            onClick={() => auth.signOut().then(() => navigate('/login'))}
          >
            <span className="nav-label">Logout</span>
          </button>
        </nav>

        <div className="sidebar-cta">
          <div className="copyright">© {new Date().getFullYear()} MyEcom</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="left">
            <div className="shop-pill">
              <div className="avatar">{getInitials(profile.name)}</div>
              <div className="shop-text">
                <div className="shop-title">{profile.name || 'User'}</div>
                <div className="shop-sub">{profile.email || ''}</div>
              </div>
            </div>
          </div>
          <button className="menu-button" onClick={toggleMenu}>
            <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </header>

        {isMenuOpen && (
          <div className="mobile-menu">
            <button
              className="mobile-menu-item"
              onClick={() => { navigate(profile.role === 'buyer' ? '/buyer/dashboard' : '/seller/dashboard'); toggleMenu(); }}
            >
              Dashboard
            </button>
            <button
              className="mobile-menu-item active"
              onClick={() => { navigate('/account'); toggleMenu(); }}
            >
              Account
            </button>
            <button
              className="mobile-menu-item logout"
              onClick={() => { auth.signOut().then(() => navigate('/login')); toggleMenu(); }}
            >
              Logout
            </button>
          </div>
        )}

        <section className="content-area">
          <div className="panel">
            <div className="panel-head">
              <h2>Profile Information</h2>
              <div className="panel-actions">
                <button
                  onClick={toggleEdit}
                  className={isEditing ? 'ghost' : 'primary'}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            </div>

            {error && (
              <div className="card empty error">
                {error}
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSave} className="profile-form">
                <div className="cards-grid">
                  <div className="card">
                    <div className="form-group">
                      <label htmlFor="email">Email (cannot change)</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profile.email}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="card">
                    <div className="form-group">
                      <label htmlFor="name">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profile.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  <div className="card">
                    <div className="form-group">
                      <label htmlFor="phone">Phone</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={profile.phone}
                        onChange={handleChange}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div className="card">
                    <div className="form-group">
                      <label htmlFor="address">Address</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={profile.address}
                        onChange={handleChange}
                        placeholder="Address"
                      />
                    </div>
                  </div>
                  <div className="card">
                    <div className="form-group">
                      <label htmlFor="role">Role</label>
                      <input
                        id="role"
                        name="role"
                        value={profile.role || 'Not set'}
                        disabled
                      />
                    </div>
                  </div>
                  {profile.role === 'seller' && (
                    <>
                      <div className="card">
                        <div className="form-group">
                          <label htmlFor="shopName">Shop Name</label>
                          <input
                            id="shopName"
                            name="shopName"
                            value={profile.shopName}
                            onChange={handleChange}
                            placeholder="Shop name"
                          />
                        </div>
                      </div>
                      <div className="card">
                        <div className="form-group">
                          <label>Approval Status</label>
                          <input
                            value={profile.approved ? 'Approved' : 'Pending approval'}
                            disabled
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={toggleEdit}
                    className="ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="primary"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="cards-grid">
                <div className="card">
                  <div className="form-group">
                    <p className="label">Email</p>
                    <p className="value">{profile.email || 'Not set'}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="form-group">
                    <p className="label">Full Name</p>
                    <p className="value">{profile.name || 'Not set'}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="form-group">
                    <p className="label">Phone</p>
                    <p className="value">{profile.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="form-group">
                    <p className="label">Address</p>
                    <p className="value">{profile.address || 'Not set'}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="form-group">
                    <p className="label">Role</p>
                    <p className="value">{profile.role || 'Not set'}</p>
                  </div>
                </div>
                {profile.role === 'seller' && (
                  <>
                    <div className="card">
                      <div className="form-group">
                        <p className="label">Shop Name</p>
                        <p className="value">{profile.shopName || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="card">
                      <div className="form-group">
                        <p className="label">Approval Status</p>
                        <p className="value">{profile.approved ? 'Approved' : 'Pending approval'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <style jsx>{`
        :root {
          --bg: #f4f7fb;
          --panel: #ffffff;
          --muted: #6b7280;
          --accent: #1f6feb;
          --accent-2: #7c3aed;
          --danger: #ef4444;
          --card-radius: 12px;
          --shadow-soft: 0 8px 30px rgba(20, 24, 40, 0.06);
        }
        * {
          box-sizing: border-box;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }
        .account-page {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 28px;
          padding: 28px;
          background: linear-gradient(180deg, #f7fafc 0%, var(--bg) 100%);
          min-height: calc(100vh - 60px);
        }
        .sidebar {
          background: linear-gradient(180deg, #0b1223 0%, #0f1724 100%);
          border-radius: var(--card-radius);
          padding: 20px;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-soft);
          height: calc(100vh - 56px);
          position: sticky;
          top: 28px;
        }
        .brand-wrap .brand {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        .brand-wrap .brand-sub {
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.9rem;
          margin-top: 6px;
        }
        .side-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 18px;
        }
        .nav-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.95);
          border: none;
          padding: 12px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          transition: background 160ms ease, transform 120ms ease;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }
        .nav-item.active {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
        }
        .sidebar-cta {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: stretch;
          margin-top: 18px;
        }
        .copyright {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          margin-top: 6px;
          text-align: center;
        }
        .main {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .shop-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 999px;
          border: none;
          background: transparent;
        }
        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          font-weight: 800;
          box-shadow: 0 8px 22px rgba(31, 111, 235, 0.12);
        }
        .shop-text {
          text-align: left;
        }
        .shop-title {
          font-weight: 800;
          color: #0f1724;
        }
        .shop-sub {
          font-size: 0.85rem;
          color: var(--muted);
          margin-top: 2px;
        }
        .menu-button {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
        }
        .menu-icon {
          width: 24px;
          height: 24px;
          color: #0f1724;
        }
        .mobile-menu {
          display: none;
          background: var(--panel);
          box-shadow: var(--shadow-soft);
          padding: 12px;
          margin-top: 8px;
          border-radius: 10px;
        }
        .mobile-menu-item {
          display: block;
          width: 100%;
          padding: 10px 14px;
          font-size: 0.95rem;
          color: #0f1724;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 8px;
          text-align: left;
        }
        .mobile-menu-item:hover {
          background: #f4f6f9;
        }
        .mobile-menu-item.active {
          background: linear-gradient(90deg, rgba(31, 111, 235, 0.1), rgba(124, 58, 237, 0.1));
        }
        .mobile-menu-item.logout {
          color: var(--danger);
        }
        .content-area {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .panel {
          background: transparent;
        }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .panel-head h2 {
          margin: 0;
          font-size: 1.15rem;
          color: #0f1724;
        }
        .panel-actions .primary, .panel-actions .ghost {
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: background 160ms ease;
        }
        .panel-actions .primary {
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          color: white;
          border: none;
        }
        .panel-actions .primary:hover {
          background: linear-gradient(90deg, #1a5ed1, #6b21a8);
        }
        .panel-actions .ghost {
          background: transparent;
          border: 1px solid #e6eefc;
          color: var(--accent);
        }
        .panel-actions .ghost:hover {
          background: #e6eefc;
        }
        .cards-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          align-items: start;
        }
        .card {
          background: var(--panel);
          border-radius: var(--card-radius);
          padding: 16px;
          box-shadow: var(--shadow-soft);
          transition: transform 160ms ease, box-shadow 160ms ease;
        }
        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
        }
        .card.empty {
          text-align: center;
          color: var(--muted);
          padding: 28px;
        }
        .card.empty.error {
          background: #f8d7da;
          color: #721c24;
        }
        .profile-form, .profile-display {
          margin-top: 12px;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-group label, .form-group .label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .form-group input, .form-group .value {
          width: 100%;
          font-size: 0.95rem;
          color: #0f1724;
        }
        .form-group input {
          padding: 10px;
          border: 1px solid #e6eef8;
          border-radius: 8px;
        }
        .form-group input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.2);
        }
        .form-group .value {
          color: #0f1724;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 18px;
        }
        .form-actions .primary, .form-actions .ghost {
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: background 160ms ease;
        }
        .form-actions .primary {
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          color: white;
          border: none;
        }
        .form-actions .primary:hover {
          background: linear-gradient(90deg, #1a5ed1, #6b21a8);
        }
        .form-actions .primary:disabled {
          background: #6b7280;
          cursor: not-allowed;
        }
        .form-actions .ghost {
          background: transparent;
          border: 1px solid #e6eefc;
          color: var(--accent);
        }
        .form-actions .ghost:hover {
          background: #e6eefc;
        }
        @media (max-width: 1100px) {
          .account-page {
            grid-template-columns: 1fr;
            padding: 18px;
          }
          .sidebar {
            position: relative;
            height: auto;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 10px;
          }
          .side-nav {
            display: flex;
            flex-direction: row;
            gap: 8px;
            overflow: auto;
          }
          .brand-wrap {
            display: none;
          }
          .main {
            margin-top: 8px;
          }
          .cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          }
          .menu-button {
            display: block;
          }
          .mobile-menu {
            display: block;
          }
          .topbar .shop-pill {
            display: flex;
          }
        }
        @media (max-width: 520px) {
          .cards-grid {
            grid-template-columns: 1fr;
          }
          .avatar {
            width: 40px;
            height: 40px;
          }
          .shop-title {
            font-size: 0.95rem;
          }
          .shop-sub {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Account;