import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpWithEmail } from '../../services/firebase.js';
import { db } from '../../services/firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Signup = () => {
  const navigate = useNavigate();

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer'); // buyer or seller

  // Seller specific
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim()) return 'Please enter your name.';
    if (!email.trim()) return 'Please enter email.';
    if (!password || password.length < 6) return 'Password must be at least 6 characters.';
    if (!phone.trim()) return 'Please enter phone number.';
    if (!address.trim()) return 'Please enter address.';
    if (role === 'seller' && !shopName.trim()) return 'Please enter shop name for seller.';
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      alert(errMsg);
      return;
    }

    setLoading(true);
    try {
      // Pass name to signUpWithEmail
      const userCredential = await signUpWithEmail(email.trim(), password, role, name.trim());
      const uid = userCredential?.user?.uid;
      if (!uid) {
        throw new Error('Could not get user id after signup.');
      }

      // Save full profile in Firestore
      const userData = {
        uid,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        role,
        shopName: role === 'seller' ? shopName.trim() : '',
        approved: role === 'seller' ? false : true, // Buyers auto-approved, sellers need approval
        createdAt: serverTimestamp()
      };
      console.log('Signup: Saving user data, ID:', uid, 'Approved:', userData.approved);
      await setDoc(doc(db, 'users', uid), userData, { merge: true });

      alert('Account created successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      console.error('Signup error:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      alert('Signup failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="signup-container">
        <div className="signup-card">
          <h1>Create Your Account</h1>
          <form onSubmit={handleSignup}>
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
            </div>

            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
            </div>

            <div className="input-group">
              <label htmlFor="phone">Phone Number</label>
              <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 3xx xxxxxxx" required />
            </div>

            <div className="input-group">
              <label htmlFor="address">Address</label>
              <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, Country" required />
            </div>

            <div className="input-group">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={e => setRole(e.target.value)}>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </div>

            {role === 'seller' && (
              <>
                <div className="input-group">
                  <label htmlFor="shopName">Shop Name</label>
                  <input id="shopName" type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Your shop / store name" required={role === 'seller'} />
                </div>
              </>
            )}

            <button type="submit" className="signup-button" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="login-option">
            <p>Already have an account?</p>
            <button onClick={() => navigate('/login')} className="login-button">Login</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .signup-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 120px);
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 2rem;
        }
        .signup-card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          padding: 2rem;
          width: 100%;
          max-width: 520px;
        }
        h1 { text-align:center; font-size:1.5rem; margin-bottom:1rem; color:#111827; }
        .input-group { margin-bottom: 0.9rem; }
        .input-group label { display:block; font-size:0.95rem; color:#374151; margin-bottom:0.25rem; }
        .input-group input, .input-group select {
          width:100%; padding:0.65rem; border-radius:8px; border:1px solid #e6eef8; font-size:0.95rem;
        }
        .signup-button {
          width:100%; background: linear-gradient(90deg,#1f6feb,#7c3aed); color:#fff; border:none; padding:0.8rem; border-radius:8px; font-weight:700; margin-top:8px;
        }
        .login-option { margin-top: 14px; text-align:center; }
        .login-button { background:transparent; border:1px solid #e6eef8; padding:8px 12px; border-radius:8px; cursor:pointer; }
        @media (max-width: 520px) {
          .signup-card { padding: 1rem; }
        }
      `}</style>
    </>
  );
};

export default Signup;