
// Buyer settings page for managing preferences
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ notifications: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/');
      return;
    }
    // Placeholder: Fetch settings from Firestore or local storage if needed
    setLoading(false);
  }, [user, navigate]);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.checked });
  };

  const handleSave = () => {
    // Placeholder: Save settings to Firestore or local storage
    alert('Settings saved successfully!');
  };

  return (
    <>
      <div className="settings-page">
        <h1>Your Settings</h1>
        {loading ? (
          <p>Loading settings...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="settings-card">
            <h2>Preferences</h2>
            <div className="form-group">
              <label htmlFor="notifications">
                <input
                  type="checkbox"
                  id="notifications"
                  name="notifications"
                  checked={settings.notifications}
                  onChange={handleChange}
                />
                Enable Email Notifications
              </label>
            </div>
            <button onClick={handleSave}>Save Settings</button>
          </div>
        )}
      </div>
      <style jsx>{`
        .settings-page {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          min-height: calc(100vh - 120px);
          background: #f4f6f9;
        }
        h1 {
          font-size: 2rem;
          color: #1a1a1a;
          text-align: center;
          margin-bottom: 2rem;
        }
        h2 {
          font-size: 1.5rem;
          color: #1a1a1a;
          margin-bottom: 1rem;
        }
        .settings-card {
          background: #fff;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 1rem;
          color: #1a1a1a;
        }
        .form-group input {
          margin-right: 0.5rem;
        }
        button {
          background: #28a745;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        button:hover {
          background: #218838;
        }
        .error {
          color: #dc3545;
          text-align: center;
          font-size: 1.2rem;
        }
        p {
          text-align: center;
          font-size: 1.2rem;
          color: #666;
        }
        @media (max-width: 768px) {
          .settings-page {
            padding: 1rem;
          }
          h1 {
            font-size: 1.5rem;
          }
          h2 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </>
  );
};

export default Settings;
