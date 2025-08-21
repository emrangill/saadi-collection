import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Show loading state while user data is being fetched
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <div className="logo" onClick={() => navigate("/")}>
          Saadi Collections
        </div>

        {/* Hamburger Menu (Mobile) */}
        <div className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </div>

        {/* Nav Links */}
        <div className={`nav-links ${menuOpen ? "active" : ""}`}>
          <button onClick={() => navigate("/")}>Home</button>
          <button onClick={() => navigate("/categories")}>Categories</button>
          <button onClick={() => navigate("/about")}>About</button>
          <button onClick={() => navigate("/contact")}>Contact</button>

          {/* Extra links for BUYER */}
          {user && user.role === "buyer" && (
            <>
              <button onClick={() => navigate("/buyer/order-history")}>Orders</button>
              <button onClick={() => navigate("/buyer/wishlist")}>Wishlist</button>
              <button onClick={() => navigate("/buyer/account")}>Account</button>
              <button onClick={() => navigate("/buyer/checkout")}>Checkout</button>
              <button onClick={() => navigate("/buyer/dashboard")}>Dashboard</button>
              <button onClick={handleLogout}>Logout</button>
            </>
          )}

          {/* Extra links for SELLER */}
          {user && user.role === "seller" && (
            <>
              <button onClick={() => navigate("/seller/add-product")}>Add Product</button>
              <button onClick={() => navigate("/seller/orders")}>Orders</button>
              <button onClick={() => navigate("/seller/dashboard")}>Seller Dashboard</button>
              <button onClick={handleLogout}>Logout</button>
            </>
          )}

          {/* Logout for ADMIN, but NO admin links */}
          {user && user.role === "admin" && (
            <>
              <button onClick={handleLogout}>Logout</button>
            </>
          )}

          {/* Show Login button if NOT logged in */}
          {!user && (
            <button onClick={() => navigate("/login")}>Login</button>
          )}
        </div>
      </nav>

      {/* ✅ Styling */}
      <style jsx>{`
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: #1a1a1a;
          color: #fff;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          cursor: pointer;
          color: #f4c542;
        }

        .nav-links {
          display: flex;
          gap: 1rem;
        }

        .nav-links button {
          background: none;
          border: none;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .nav-links button:hover {
          color: #28a745;
        }

        .menu-toggle {
          display: none;
          font-size: 1.8rem;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .menu-toggle {
            display: block;
          }

          .nav-links {
            display: none;
            flex-direction: column;
            position: absolute;
            top: 60px;
            right: 20px;
            background: #1a1a1a;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }

          .nav-links.active {
            display: flex;
          }

          .nav-links button {
            padding: 0.5rem 0;
            text-align: left;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;