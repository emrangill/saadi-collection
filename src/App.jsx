import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import LandingPage from './pages/public/LandingPage.jsx';
import CategoriesPage from './pages/public/CategoriesPage.jsx';
import About from './pages/public/About.jsx';
import Contact from './pages/public/Contact.jsx';
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';

import BuyerDashboard from './pages/buyer/BuyerDashboard.jsx';
import ProductList from './pages/buyer/ProductList.jsx';
import Product from './pages/buyer/Product.jsx';
import Cart from './pages/buyer/Cart.jsx';
import Checkout from './pages/buyer/Checkout.jsx';
import OrderHistory from './pages/buyer/OrderHistory.jsx';
import Wishlist from './pages/buyer/Wishlist.jsx';
import TrackOrder from './pages/buyer/TrackOrder.jsx';
import Account from './pages/buyer/Account.jsx';
import Settings from './pages/buyer/Settings.jsx';
import SellerDashboard from './pages/seller/SellerDashboard.jsx';
import AddProduct from './pages/seller/AddProduct.jsx';
import ManageProducts from './pages/seller/ManageProducts.jsx';
import SellerOrders from './pages/seller/Orders.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ManageUsers from './pages/admin/ManageUsers.jsx';
import AdminProducts from './pages/admin/ManageProducts.jsx';
import AdminOrders from './pages/admin/Orders.jsx';
import Discounts from './pages/admin/Discounts.jsx';
import Categories from './pages/admin/Categories.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';

import React, { useState, useEffect } from "react";

function App() {
  const { user, loading: authLoading } = useAuth();
  // Loader state for full app (navbar + auth + landing)
  const [pageLoading, setPageLoading] = useState(true);

  // Wait for auth context to load
  useEffect(() => {
    if (!authLoading) {
      // Wait for next tick, so Navbar can access user (removes flicker)
      const timer = setTimeout(() => setPageLoading(false), 100);
      return () => clearTimeout(timer);
    } else {
      setPageLoading(true);
    }
  }, [authLoading]);

  // AdminRoute: if user is logged in AND has role 'admin' allow access,
  // otherwise redirect to /admin/login.
  const AdminRoute = ({ children }) => {
    if (user && user.role === 'admin') return children;
    return <Navigate to="/admin/login" replace />;
  };

  if (pageLoading) {
    return (
      <div className="global-loader">
        <div className="spinner"></div>
        <style jsx="true">{`
          body { overflow: hidden !important; }
          .global-loader {
            position: fixed;
            inset: 0; width: 100vw; height: 100vh;
            background: #fff;
            display: flex; align-items: center; justify-content: center;
            z-index: 99999;
            transition: opacity 0.3s;
          }
          .spinner {
            width: 54px; height: 54px;
            border: 6px solid #f4c542;
            border-top: 6px solid #fff;
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
          }
          @keyframes spin {
            to {transform: rotate(360deg);}
          }
        `}</style>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
        <Route path="/buyer/products" element={<ProductList />} />
        <Route path="/buyer/product/:productId" element={<Product />} />
        <Route path="/buyer/cart" element={<Cart />} />
        <Route path="/buyer/checkout" element={<Checkout />} />
        <Route path="/buyer/order-history" element={<OrderHistory />} />
        <Route path="/buyer/wishlist" element={<Wishlist />} />
        <Route path="/buyer/track-order/:orderId" element={<TrackOrder />} />
        <Route path="/buyer/account" element={<Account />} />
        <Route path="/buyer/settings" element={<Settings />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/seller/add-product" element={<AddProduct />} />
        <Route path="/seller/manage-products" element={<ManageProducts />} />
        <Route path="/seller/orders" element={<SellerOrders />} />

        {/* Admin login route (open) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected admin routes */}
        <Route
          path="/admin/admindashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <ManageUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/discounts"
          element={
            <AdminRoute>
              <Discounts />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminRoute>
              <Categories />
            </AdminRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;