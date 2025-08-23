import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../../services/firebase.js';
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword } from 'firebase/auth';

const AdminLogin = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showVerifyCredentials, setShowVerifyCredentials] = useState(false);

  const resetError = () => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetError();

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    // Basic email format validation
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Invalid email format.');
      return;
    }

    setLoading(true);
    try {
      // Sign in with Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const signedInEmail = (cred?.user?.email || '').toLowerCase();

      // Fetch users collection
      const allUsers = await getUsers();

      // Find matching user record and check role === 'admin'
      const matched = (allUsers || []).find(
        (u) => (u?.email || '').toLowerCase() === signedInEmail
      );

      if (!matched) {
        await signOut(auth);
        setError('No user record found.');
        setLoading(false);
        return;
      }

      if (matched.role !== 'admin') {
        await signOut(auth);
        setError('Access denied. You are not an admin.');
        setLoading(false);
        return;
      }

      // Authorized — go to admin dashboard
      navigate('/admin/admindashboard');
    } catch (err) {
      console.error('AdminLogin: signin error', err);
      const msg =
        err?.code === 'auth/user-not-found'
          ? 'No account found for this email.'
          : err?.code === 'auth/wrong-password'
          ? 'Wrong password.'
          : err?.code === 'auth/invalid-email'
          ? 'Invalid email format.'
          : err?.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Failed to sign in. Please check your credentials.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    resetError();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    // Basic email format validation
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Invalid email format.');
      return;
    }

    setLoading(true);
    try {
      // Fetch users collection to check admin role
      const allUsers = await getUsers();
      const matched = (allUsers || []).find(
        (u) => (u?.email || '').toLowerCase() === email.trim().toLowerCase()
      );

      if (!matched) {
        setError('No user record found for this email.');
        setLoading(false);
        return;
      }

      if (matched.role !== 'admin') {
        setError('Access denied. Only admins can reset their password.');
        setLoading(false);
        return;
      }

      // If admin, send password reset email
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('Password reset email sent. Please check your inbox.');
    } catch (err) {
      console.error('AdminLogin: forgot password error', err);
      const msg =
        err?.code === 'auth/user-not-found'
          ? 'No account found for this email.'
          : err?.code === 'auth/invalid-email'
          ? 'Invalid email format.'
          : err?.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Failed to send password reset email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCredentials = async (e) => {
    e.preventDefault();
    resetError();

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    // Basic email format validation
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Invalid email format.');
      return;
    }

    setLoading(true);
    try {
      // Verify credentials with Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const signedInEmail = (cred?.user?.email || '').toLowerCase();

      // Fetch users collection to check admin role
      const allUsers = await getUsers();
      const matched = (allUsers || []).find(
        (u) => (u?.email || '').toLowerCase() === signedInEmail
      );

      if (!matched) {
        await signOut(auth);
        setError('No user record found for this email.');
        setLoading(false);
        return;
      }

      if (matched.role !== 'admin') {
        await signOut(auth);
        setError('Access denied. Only admins can change their password.');
        setLoading(false);
        return;
      }

      // Credentials and role verified, show change password form
      setShowVerifyCredentials(false);
      setShowChangePassword(true);
      setPassword(''); // Clear password field
      setLoading(false); // Reset loading state
    } catch (err) {
      console.error('AdminLogin: verify credentials error', err);
      const msg =
        err?.code === 'auth/user-not-found'
          ? 'No account found for this email.'
          : err?.code === 'auth/wrong-password'
          ? 'Wrong password.'
          : err?.code === 'auth/invalid-email'
          ? 'Invalid email format.'
          : err?.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Failed to verify credentials.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    resetError();

    if (!newPassword || !confirmNewPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password is too short. Must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No user is currently signed in.');
        setLoading(false);
        return;
      }

      await updatePassword(user, newPassword);
      setSuccess('Password updated successfully.');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePassword(false);
      await signOut(auth); // Sign out after changing password
      setEmail(''); // Clear email field
    } catch (err) {
      console.error('AdminLogin: change password error', err);
      const msg =
        err?.code === 'auth/requires-recent-login'
          ? 'Please sign in again to change your password.'
          : err?.code === 'auth/weak-password'
          ? 'Password is too weak. Choose a stronger password.'
          : err?.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Failed to change password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login" role="main" aria-live="polite">
      <div className="card">
        <h1 className="title">Admin Login</h1>

        {error && <div className="error" role="alert">{error}</div>}
        {success && <div className="success" role="alert">{success}</div>}

        {!showVerifyCredentials && !showChangePassword ? (
          <>
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

            <div className="links">
              <button
                onClick={handleForgotPassword}
                className="link-btn"
                disabled={loading}
                aria-label="Forgot password"
              >
                Forgot Password?
              </button>
              <button
                onClick={() => setShowVerifyCredentials(true)}
                className="link-btn"
                disabled={loading}
                aria-label="Change password"
              >
                Change Password
              </button>
            </div>
          </>
        ) : showVerifyCredentials ? (
          <form onSubmit={handleVerifyCredentials} className="form" aria-label="Verify credentials form" noValidate>
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

            <label htmlFor="password" className="label">Current Password</label>
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
                {loading ? 'Verifying…' : 'Verify Credentials'}
              </button>
              <button
                type="button"
                onClick={() => setShowVerifyCredentials(false)}
                className="btn secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="form" aria-label="Change password form" noValidate>
            <label htmlFor="new-password" className="label">New Password</label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              required
            />

            <label htmlFor="confirm-new-password" className="label">Confirm New Password</label>
            <input
              id="confirm-new-password"
              name="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="input"
              required
            />

            <div className="actions">
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? 'Changing…' : 'Change Password'}
              </button>
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                className="btn secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

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

        .success {
          background: #f0fff4;
          color: #2f855a;
          border: 1px solid rgba(52,211,153,0.12);
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

        .actions { margin-top: 8px; display:flex; justify-content:flex-end; gap: 8px; }
        .btn { border: none; cursor: pointer; padding: 8px 14px; border-radius: 10px; font-weight:700; font-size: 0.95rem; }
        .primary { background: linear-gradient(90deg,#0f4ef0,#6d28d9); color: #fff; box-shadow: 0 10px 26px rgba(13,60,160,0.06); }
        .secondary { background: #e2e8f0; color: #0b1b2b; }

        .links {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
        }

        .link-btn {
          background: none;
          border: none;
          color: #0f4ef0;
          font-size: 0.9rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .hint { margin-top: 12px; font-size: 0.88rem; color: #64748b; }

        @media (max-width:520px) {
          .card { padding: 16px; border-radius: 10px; }
          .actions { justify-content: stretch; flex-direction: column; }
          .btn { width:100%; }
          .links { flex-direction: column; gap: 8px; }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;