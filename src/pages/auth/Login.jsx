import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail } from '../../services/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const getUserRoleAndApproval = async (uid) => {
    const q = query(collection(db, 'users'), where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0].data();
      return { role: userDoc.role, approved: userDoc.approved };
    }
    throw new Error('User not found in Firestore');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmail(email, password);
      const { role, approved } = await getUserRoleAndApproval(userCredential.user.uid);
      if (role === 'buyer') {
        navigate('/buyer/dashboard');
      } else if (role === 'seller' && approved) {
        navigate('/seller/dashboard');
      } else if (role === 'seller' && !approved) {
        navigate('/');
        alert('Your seller account is pending approval.');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleSignUpRedirect = () => {
    navigate('/signup');
  };

  return (
    <>
      <div className="login-container">
        <div className="login-card">
          <h1>Login to Your Account</h1>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button type="submit" className="login-button">Login</button>
          </form>
          <div className="signup-options">
            <p>Don't have an account?</p>
            <button onClick={handleSignUpRedirect} className="signup-button">Sign Up</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 120px); /* Adjust for navbar/footer */
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 2rem;
        }
        .login-card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .login-card h1 {
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
          color: #1a1a1a;
        }
        .input-group {
          margin-bottom: 1rem;
          text-align: left;
        }
        .input-group label {
          display: block;
          font-size: 0.9rem;
          color: #333;
          margin-bottom: 0.3rem;
        }
        .input-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }
        .input-group input:focus {
          outline: none;
          border-color: #007bff;
        }
        .login-button {
          width: 100%;
          background-color: #007bff;
          color: #fff;
          border: none;
          padding: 0.75rem;
          border-radius: 5px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .login-button:hover {
          background-color: #0056b3;
        }
        .signup-options {
          margin-top: 1.5rem;
        }
        .signup-options p {
          color: #666;
          margin-bottom: 1rem;
        }
        .signup-button {
          width: 100%;
          background-color: #28a745;
          color: #fff;
          border: none;
          padding: 0.75rem;
          border-radius: 5px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.3s ease;
          margin-bottom: 0.5rem;
        }
        .signup-button:hover {
          background-color: #218838;
        }
        @media (max-width: 768px) {
          .login-container {
            padding: 1rem;
          }
          .login-card {
            padding: 1.5rem;
          }
          .login-card h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default Login;