import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../../services/firebase.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const AdminLogin = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetError = () => setError('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetError();

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      // sign in with firebase auth
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const signedInEmail = (cred?.user?.email || '').toLowerCase();

      // fetch users collection (your existing helper)
      const allUsers = await getUsers();

      // find the matching user record and check role === 'admin'
      const matched = (allUsers || []).find(
        (u) => (u?.email || '').toLowerCase() === signedInEmail
      );

      if (!matched) {
        // no user record in your users collection
        await signOut(auth);
        setError('No user record found. Access denied.');
        setLoading(false);
        return;
      }

      if (matched.role !== 'admin') {
        // signed in, but not an admin
        await signOut(auth);
        setError('Access denied. You are not an admin.');
        setLoading(false);
        return;
      }

      // authorized — go to admin dashboard
      navigate('/admin/admindashboard');
    } catch (err) {
      console.error('AdminLogin: signin error', err);
      // Friendly error messages
      const msg =
        err?.code === 'auth/user-not-found'
          ? 'No account found for this email.'
          : err?.code === 'auth/wrong-password'
          ? 'Incorrect password.'
          : err?.message || 'Failed to sign in.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="admin-login" role="main" aria-live="polite">
      <div className="card">
        <h1 className="title">Admin Login</h1>

        {error && <div className="error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="form" aria-label="Admin login form" noValidate>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />

          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
          />

          <div className="actions">
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        <p className="hint">Sign up is disabled. Only pre-provisioned admin accounts can access this area.</p>
      </div>

      <style jsx>{`
        .admin-login {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(180deg,#f7fafc,#eef4ff);
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }

        .card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 12px;
          padding: 22px;
          box-shadow: 0 18px 60px rgba(9,20,34,0.06);
        }

        .title {
          margin: 0 0 12px 0;
          font-size: 1.25rem;
          color: #0b1b2b;
        }

        .error {
          background: #fff1f0;
          color: #7f1d1d;
          border: 1px solid rgba(239,68,68,0.12);
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 0.95rem;
        }

        .form { display: flex; flex-direction: column; gap:10px; }
        .label { font-size: 0.9rem; color: #334155; margin-bottom: 6px; }
        .input {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(9,20,34,0.06);
          font-size: 0.95rem;
          background: linear-gradient(180deg,#fff,#fbfdff);
        }

        .actions { margin-top: 8px; display:flex; justify-content:flex-end; }
        .btn { border: none; cursor: pointer; padding: 8px 14px; border-radius: 10px; font-weight:700; font-size: 0.95rem; }
        .primary { background: linear-gradient(90deg,#0f4ef0,#6d28d9); color: #fff; box-shadow: 0 10px 26px rgba(13,60,160,0.06); }

        .hint { margin-top: 12px; font-size: 0.88rem; color: #64748b; }

        @media (max-width:520px) {
          .card { padding: 16px; border-radius: 10px; }
          .actions { justify-content: stretch; }
          .btn { width:100%; }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;