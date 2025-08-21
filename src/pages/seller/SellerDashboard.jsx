import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getProductsBySeller,
  deleteProduct,
  getOrdersBySeller,
  updateOrderStatus,
  updateSellerProfile,
  updateProduct,
  getCategories,
  getSellerProfile
} from '../../services/firebase.js';
import { db } from '../../services/firebase.js';
import { doc as fsDoc, getDoc } from 'firebase/firestore';

const SellerDashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState({ totalSales: 0, totalOrders: 0, topProduct: null });
  const [categories, setCategories] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});
  const [profile, setProfile] = useState({
    uid: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'seller',
    shopName: '',
    contactEmail: '',
    contactPhone: '',
    approved: false
  });
  const [profileDraft, setProfileDraft] = useState({ ...profile });
  const [activeTab, setActiveTab] = useState('products');
  const [editProduct, setEditProduct] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [imageFile, setImageFile] = useState(null); // for new image upload in edit form
  const [imageError, setImageError] = useState('');

  // Normalize createdAt to JS Date
  const toDate = (v) => {
    if (!v) return new Date(0);
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'number') return new Date(v);
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  // Load data (categories, products, orders, seller profile)
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    if (user.role === 'seller' && !user.approved) {
      navigate('/');
      alert('Your seller account is not approved.');
      return;
    }

    let mounted = true;
    setProducts([]);
    setOrders([]);

    const fetchData = async () => {
      try {
        // Categories
        const cats = await getCategories();
        const catsList = cats || [];
        if (!mounted) return;
        setCategories(catsList);
        const map = {};
        catsList.forEach(c => { map[c.id] = c.name; });
        setCategoriesMap(map);

        // Products
        const sellerProducts = await getProductsBySeller(user.uid);
        const productsList = sellerProducts || [];
        const productsWithImages = productsList.map(p => ({
          ...p,
          displayImage: p.imageData || '/placeholder.jpg'
        }));
        if (!mounted) return;
        setProducts(productsWithImages);

        // Orders
        const sellerOrders = await getOrdersBySeller(user.uid);
        const ordersList = sellerOrders || [];

        // Enrich items with product name, category name, and image
        const enrichedOrders = await Promise.all(ordersList.map(async (order) => {
          const items = (order.items || []);
          const resolvedItems = await Promise.all(items.map(async (item) => {
            const product = productsList.find(p => p.id === item.productId) || {};
            const categoryId = product.category || item.category || '';
            const categoryName = map[categoryId] || (typeof categoryId === 'string' ? categoryId : '');
            const displayImage = product.imageData || '/placeholder.jpg';
            return {
              ...item,
              productName: product.name || item.name || 'Product',
              categoryId,
              categoryName,
              displayImage
            };
          }));

          return {
            ...order,
            items: resolvedItems
          };
        }));

        // Sort orders newest first
        enrichedOrders.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());

        if (!mounted) return;
        setOrders(enrichedOrders);

        // Analytics
        const totalSales = (ordersList || []).reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = (ordersList || []).length;
        const productSales = {};
        (ordersList || []).forEach(order => {
          (order.items || []).forEach(item => {
            productSales[item.productId] = (productSales[item.productId] || 0) + (item.quantity || 0);
          });
        });
        const topProductId = Object.keys(productSales).length > 0
          ? Object.keys(productSales).reduce((a, b) => productSales[a] > productSales[b] ? a : b)
          : null;
        const topProduct = (productsList || []).find(p => p.id === topProductId) || null;
        if (!mounted) return;
        setAnalytics({ totalSales, totalOrders, topProduct });

        // Seller profile
        let sellerProfile = null;
        try {
          sellerProfile = await getSellerProfile(user.uid);
        } catch (err) {
          console.warn('Could not fetch seller profile from Firestore:', err);
        }
        const initialProfile = {
          uid: user.uid,
          name: sellerProfile?.name || user.displayName || '',
          email: sellerProfile?.email || user.email || '',
          phone: sellerProfile?.phone || user.phone || '',
          address: sellerProfile?.address || user.address || '',
          role: sellerProfile?.role || user.role || 'seller',
          shopName: sellerProfile?.shopName || user.shopName || '',
          contactEmail: sellerProfile?.contactEmail || sellerProfile?.email || user.email || '',
          contactPhone: sellerProfile?.contactPhone || sellerProfile?.phone || user.phone || '',
          approved: sellerProfile?.approved ?? (user.approved ?? false)
        };
        if (!mounted) return;
        setProfile(initialProfile);
        setProfileDraft(initialProfile);
      } catch (err) {
        console.error('Error loading seller dashboard data:', err);
        alert('Failed to load dashboard data: ' + (err.message || err));
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [user, navigate]);

  // Keep draft synced when profile changes externally
  useEffect(() => {
    setProfileDraft(profile);
  }, [profile]);

  // ESC closes modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowProfileModal(false);
        setIsEditingProfile(false);
        setProfileDraft(profile);
        setEditProduct(null);
        setImageFile(null);
        setImageError('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profile]);

  // Helpers
  const openProfile = () => {
    setProfileDraft(profile);
    setIsEditingProfile(false);
    setShowProfileModal(true);
  };
  const closeProfile = () => {
    setShowProfileModal(false);
    setIsEditingProfile(false);
    setProfileDraft(profile);
  };

  const getInitials = (name = '') => {
    const parts = (name || '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return (profile.shopName && profile.shopName[0]) || 'S';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // Product handlers
  const handleEditProduct = (product) => {
    let catId = product.category;
    if (product.category && !categoriesMap[product.category]) {
      const found = categories.find(c => c.name === product.category);
      if (found) catId = found.id;
    }
    setEditProduct({ ...product, category: catId });
    setImageFile(null);
    setImageError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      setImageError('');
      return;
    }

    // Validate file size (750 KB = 750 * 1024 bytes)
    const maxSize = 750 * 1024;
    if (file.size > maxSize) {
      setImageError('Image size exceeds 750 KB.');
      setImageFile(null);
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
      setImageError('Only JPEG or PNG images are allowed.');
      setImageFile(null);
      return;
    }

    setImageError('');
    setImageFile(file);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    if (imageError) {
      alert(imageError);
      return;
    }

    try {
      let updatedData = {
        name: editProduct.name,
        price: parseFloat(editProduct.price),
        stock: parseInt(editProduct.stock),
        description: editProduct.description,
        category: editProduct.category
      };

      // Handle image update if a new file is selected
      if (imageFile) {
        const reader = new FileReader();
        const imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(imageFile);
        });
        updatedData.imageData = imageData;
      } else {
        // Preserve existing imageData
        updatedData.imageData = editProduct.imageData;
      }

      await updateProduct(editProduct.id, updatedData);
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...updatedData, displayImage: updatedData.imageData || '/placeholder.jpg' } : p));
      setOrders(prev => prev.map(order => ({
        ...order,
        items: order.items.map(it => it.productId === editProduct.id
          ? { ...it, productName: editProduct.name, categoryId: editProduct.category, categoryName: categoriesMap[editProduct.category] || editProduct.category, displayImage: updatedData.imageData || '/placeholder.jpg' }
          : it)
      })));
      setEditProduct(null);
      setImageFile(null);
      setImageError('');
      alert('Product updated successfully!');
    } catch (err) {
      console.error('updateProduct error', err);
      alert('Failed to update product: ' + (err.message || err));
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert('Product deleted successfully!');
    } catch (err) {
      console.error('deleteProduct error', err);
      alert('Failed to delete product: ' + (err.message || err));
    }
  };

  // Orders
  const handleUpdateOrderStatus = async (orderId, status) => {
    if (['rejected', 'cancelled'].includes(status)) {
      if (!window.confirm(`Are you sure you want to mark this order as ${status}?`)) return;
    }
    try {
      await updateOrderStatus(orderId, status, user.uid);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      alert('Order status updated successfully!');
    } catch (err) {
      console.error('updateOrderStatus error', err);
      alert('Failed to update order status: ' + (err.message || err));
    }
  };

  // Profile edit/save
  const handleStartEditProfile = () => {
    setProfileDraft(profile);
    setIsEditingProfile(true);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e && e.preventDefault();
    if (!profileDraft.name || !profileDraft.contactEmail) {
      alert('Please provide name and contact email.');
      return;
    }

    try {
      await updateSellerProfile(user.uid, {
        name: profileDraft.name,
        email: profileDraft.email,
        phone: profileDraft.phone || profileDraft.contactPhone || '',
        address: profileDraft.address || '',
        shopName: profileDraft.shopName || profileDraft.shopName,
        contactEmail: profileDraft.contactEmail,
        contactPhone: profileDraft.contactPhone,
        role: profileDraft.role || 'seller'
      });

      const newProfile = { ...profile, ...profileDraft };
      setProfile(newProfile);
      setProfileDraft(newProfile);
      setIsEditingProfile(false);
      setShowProfileModal(false);

      if (typeof setUser === 'function') {
        try {
          setUser(prev => ({ ...(prev || {}), ...newProfile }));
        } catch (err) {
          console.warn('setUser failed', err);
        }
      }

      alert('Profile updated successfully!');
    } catch (err) {
      console.error('updateSellerProfile error', err);
      alert('Failed to update profile: ' + (err.message || err));
    }
  };

  const statusOptions = [
    'pending',
    'accepted',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'rejected',
    'cancelled'
  ];

  return (
    <>
      <div className="seller-dashboard">
        <aside className="sidebar">
          <div className="brand-wrap">
            <div className="brand">Saadi Collection</div>
            <div className="brand-sub">Seller Panel</div>
          </div>

          <nav className="side-nav" aria-label="Seller navigation">
            <button className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <span className="nav-label">Products</span>
              <span className="nav-badge">{products.length}</span>
            </button>
            <button className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <span className="nav-label">Orders</span>
              <span className="nav-badge">{orders.length}</span>
            </button>
            <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <span className="nav-label">Analytics</span>
            </button>
            <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setIsEditingProfile(false); }}>
              <span className="nav-label">Settings</span>
            </button>
          </nav>

          <div className="sidebar-cta">
            <button className="add-btn" onClick={() => navigate('/seller/add-product')}>+ Add Product</button>
            <div className="copyright">© {new Date().getFullYear()} Saadi Collection</div>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="left">
              <button className="shop-pill" onClick={openProfile} aria-haspopup="dialog" aria-expanded={showProfileModal}>
                <div className="avatar">{getInitials(profile.shopName)}</div>
                <div className="shop-text">
                  <div className="shop-title">{profile.shopName || profile.name || 'Your Shop'}</div>
                  <div className="shop-sub">{profile.contactEmail || profile.email || ''}</div>
                </div>
              </button>
            </div>

            <div className="right">
              <div className="kpi">
                <div className="kpi-item">
                  <div className="kpi-label">Sales</div>
                  <div className="kpi-value">Rs{analytics.totalSales.toFixed(2)}</div>
                </div>
                <div className="kpi-item">
                  <div className="kpi-label">Orders</div>
                  <div className="kpi-value">{analytics.totalOrders}</div>
                </div>
              </div>
            </div>
          </header>

          <section className="content-area">
            {/* PRODUCTS */}
            {activeTab === 'products' && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Products</h2>
                  <div className="panel-actions">
                    <button className="ghost" onClick={() => navigate('/seller/add-product')}>New Product</button>
                  </div>
                </div>

                {editProduct ? (
                  <form className="card form-card" onSubmit={handleUpdateProduct}>
                    <div className="form-grid">
                      <label>
                        Name
                        <input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} required />
                      </label>
                      <label>
                        Price (Rs)
                        <input type="number" step="0.01" value={editProduct.price} onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })} required />
                      </label>
                      <label>
                        Stock
                        <input type="number" value={editProduct.stock} onChange={(e) => setEditProduct({ ...editProduct, stock: e.target.value })} required />
                      </label>
                      <label>
                        Image
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleImageChange}
                        />
                        {imageError && <span className="error">{imageError}</span>}
                        {imageFile ? (
                          <img
                            src={URL.createObjectURL(imageFile)}
                            alt="Preview"
                            className="image-preview"
                          />
                        ) : editProduct.imageData ? (
                          <img
                            src={editProduct.imageData}
                            alt="Current"
                            className="image-preview"
                          />
                        ) : null}
                      </label>
                      <label className="full">
                        Description
                        <textarea value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} />
                      </label>
                      <label>
                        Category
                        <select value={editProduct.category || ''} onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })} required>
                          <option value="">Select a category</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-actions">
                      <button className="primary" type="submit">Save changes</button>
                      <button type="button" onClick={() => { setEditProduct(null); setImageFile(null); setImageError(''); }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="grid cards-grid">
                    {products.length === 0 ? (
                      <div className="card empty">No products yet. Click "New Product" to add.</div>
                    ) : (
                      products.map(prod => (
                        <article key={prod.id} className="card product">
                          <div className="product-row">
                            <div className="prod-thumb">
                              <img src={prod.displayImage || '/placeholder.jpg'} alt={prod.name} onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }} loading="lazy" />
                            </div>

                            <div className="product-body">
                              <div className="product-top">
                                <div className="product-info">
                                  <div className="product-name" title={prod.name}>{prod.name}</div>
                                  <div className="product-cat">{categoriesMap[prod.category] || prod.category}</div>
                                </div>
                                <div className="product-price">${Number(prod.price || 0).toFixed(2)}</div>
                              </div>
                              <div className="product-desc">{prod.description}</div>
                              <div className="product-footer">
                                <div className="stock">Stock: <strong>{prod.stock}</strong></div>
                                <div className="actions">
                                  <button onClick={() => handleEditProduct(prod)} className="ghost">Edit</button>
                                  <button onClick={() => handleDeleteProduct(prod.id)} className="danger">Delete</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ORDERS */}
            {activeTab === 'orders' && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Orders</h2>
                </div>

                {orders.length === 0 ? (
                  <div className="card empty">No orders yet.</div>
                ) : (
                  <div className="cards-grid orders-grid" role="list">
                    {orders.map((o) => (
                      <article className="order-card" key={o.id} role="listitem" aria-labelledby={`order-${o.id}`}>
                        <div className="card-top">
                          <div className="left">
                            <div className="order-id" id={`order-${o.id}`}>#{o.id}</div>
                            <div className="order-date">{o.createdAt ? (typeof o.createdAt.toDate === 'function' ? o.createdAt.toDate().toLocaleString() : new Date(o.createdAt).toLocaleString()) : ''}</div>
                          </div>
                          <div className="right">
                            <div className={`status-pill ${o.status || 'unknown'}`}>{o.status || 'N/A'}</div>
                            <div className="order-total">Rs. {Number(o.total || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="card-body">
                          <div className="media-and-items">
                            <div className="media-col" aria-hidden>
                              <div className="items-thumb">
                                {o.items && o.items.length > 0 ? (
                                  o.items.slice(0, 4).map((it, i) => (
                                    <div className="thumb-wrap" key={i}>
                                      <img
                                        src={it.displayImage || '/placeholder.jpg'}
                                        alt={it.productName || it.name}
                                        loading="lazy"
                                        onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                                      />
                                    </div>
                                  ))
                                ) : (
                                  <div className="thumb-empty">No images</div>
                                )}
                              </div>
                            </div>

                            <div className="items-col" aria-label={`Items for order ${o.id}`}>
                              <div className="items-list">
                                {o.items && o.items.length > 0 ? (
                                  o.items.map((it, idx) => (
                                    <div className="item-row" key={idx}>
                                      <img
                                        src={it.displayImage || '/placeholder.jpg'}
                                        alt={it.productName || it.name}
                                        className="item-thumb"
                                        onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                                      />
                                      <div className="item-info">
                                        <div className="item-name" title={it.productName || it.name}>{it.productName || it.name}</div>
                                        <div className="item-cat muted">{it.categoryName}</div>
                                      </div>
                                      <div className="item-meta" aria-hidden>
                                        <div>Qty: <strong>{it.quantity}</strong></div>
                                        <div>Rs. {(Number(it.price || 0)).toFixed(2)}</div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="muted">No items</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="buyer-block">
                            <div className="buyer-left">
                              <div className="label">Buyer</div>
                              <div className="buyer-name">{o.customerName || '—'}</div>
                              <div className="buyer-contact">
                                {o.customerEmail && <div className="muted">{o.customerEmail}</div>}
                                {o.customerPhone && <div className="muted">• {o.customerPhone}</div>}
                              </div>
                            </div>

                            <div className="buyer-right">
                              <div className="label">Shipping</div>
                              <div className="address">
                                {o.shippingInfo ? (
                                  <>
                                    <div>{o.shippingInfo.name || ''}</div>
                                    <div>{o.shippingInfo.address}</div>
                                    <div>{o.shippingInfo.city} • {o.shippingInfo.postalCode}</div>
                                    <div>{o.shippingInfo.country}</div>
                                  </>
                                ) : <span className="muted">N/A</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="card-footer">
                          <div className="left-actions"></div>
                          <div className="right-actions">
                            <label className="sr-only" htmlFor={`status-${o.id}`}>Change status</label>
                            <select
                              id={`status-${o.id}`}
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                              aria-label={`Change status for order ${o.id}`}
                            >
                              {statusOptions.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ANALYTICS */}
            {activeTab === 'analytics' && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Analytics</h2>
                </div>
                <div className="analytics-cards">
                  <div className="metric card">
                    <div className="metric-title">Total Sales</div>
                    <div className="metric-value">Rs{analytics.totalSales.toFixed(2)}</div>
                  </div>
                  <div className="metric card">
                    <div className="metric-title">Total Orders</div>
                    <div className="metric-value">{analytics.totalOrders}</div>
                  </div>
                  <div className="metric card">
                    <div className="metric-title">Top Product</div>
                    <div className="metric-value">{analytics.topProduct ? analytics.topProduct.name : '—'}</div>
                  </div>
                </div>
              </section>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
              <section className="panel">
                <div className="panel-head">
                  <h2>Settings</h2>
                </div>

                <div className="card profile-card">
                  <div className="profile-left">
                    <div className="avatar-large">{getInitials(profile.shopName || profile.name)}</div>
                  </div>
                  <div className="profile-right">
                    <div className="profile-name">{profile.shopName || profile.name}</div>
                    <div className="profile-contact">{profile.contactEmail || profile.email}{(profile.contactPhone || profile.phone) ? ` • ${profile.contactPhone || profile.phone}` : ''}</div>
                    <div className="form-actions" style={{ marginTop: 12 }}>
                      <button className="primary" onClick={() => { handleStartEditProfile(); }}>Edit Profile</button>
                    </div>
                  </div>
                </div>

                {isEditingProfile && (
                  <form className="card form-card" onSubmit={handleSaveProfile}>
                    <div className="form-grid">
                      <label>
                        Full Name
                        <input value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} required />
                      </label>
                      <label>
                        Contact Email
                        <input type="email" value={profileDraft.contactEmail || profileDraft.email} onChange={(e) => setProfileDraft({ ...profileDraft, contactEmail: e.target.value })} required />
                      </label>
                      <label>
                        Phone
                        <input value={profileDraft.contactPhone || profileDraft.phone} onChange={(e) => setProfileDraft({ ...profileDraft, contactPhone: e.target.value })} />
                      </label>
                      <label className="full">
                        Address
                        <input value={profileDraft.address || ''} onChange={(e) => setProfileDraft({ ...profileDraft, address: e.target.value })} />
                      </label>
                      <label>
                        Shop Name
                        <input value={profileDraft.shopName} onChange={(e) => setProfileDraft({ ...profileDraft, shopName: e.target.value })} />
                      </label>
                      <label>
                        Role
                        <input value={profileDraft.role || 'seller'} disabled />
                      </label>
                      <label>
                        Approval Status
                        <input value={profileDraft.approved ? 'Approved' : 'Pending approval'} disabled />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button className="primary" type="submit">Save</button>
                      <button type="button" onClick={() => { setIsEditingProfile(false); setProfileDraft(profile); }}>Cancel</button>
                    </div>
                  </form>
                )}
              </section>
            )}
          </section>
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-backdrop" onMouseDown={closeProfile}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Seller profile" onMouseDown={(e) => e.stopPropagation()}>
            {!isEditingProfile ? (
              <>
                <div className="modal-header">
                  <div className="modal-avatar">{getInitials(profile.shopName || profile.name)}</div>
                  <div>
                    <div className="modal-title">{profile.shopName || profile.name}</div>
                    <div className="modal-sub">{profile.contactEmail || profile.email}</div>
                  </div>
                </div>
                <div className="modal-body">
                  <div className="detail"><strong>Name:</strong> {profile.name || '—'}</div>
                  <div className="detail"><strong>Email:</strong> {profile.email || '—'}</div>
                  <div className="detail"><strong>Contact Email:</strong> {profile.contactEmail || '—'}</div>
                  <div className="detail"><strong>Phone:</strong> {profile.contactPhone || profile.phone || '—'}</div>
                  <div className="detail"><strong>Address:</strong> {profile.address || '—'}</div>
                  <div className="detail"><strong>Shop Name:</strong> {profile.shopName || '—'}</div>
                  <div className="detail"><strong>Role:</strong> {profile.role || 'seller'}</div>
                  <div className="detail"><strong>Approval:</strong> {profile.approved ? 'Approved' : 'Pending'}</div>
                </div>
                <div className="modal-actions">
                  <button className="primary" onClick={handleStartEditProfile}>Edit</button>
                  <button onClick={closeProfile}>Close</button>
                </div>
              </>
            ) : (
              <form className="modal-form" onSubmit={handleSaveProfile}>
                <h3>Edit Profile</h3>
                <label>Full Name
                  <input value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} required />
                </label>
                <label>Contact Email
                  <input type="email" value={profileDraft.contactEmail || profileDraft.email} onChange={(e) => setProfileDraft({ ...profileDraft, contactEmail: e.target.value })} required />
                </label>
                <label>Phone
                  <input value={profileDraft.contactPhone || profileDraft.phone} onChange={(e) => setProfileDraft({ ...profileDraft, contactPhone: e.target.value })} />
                </label>
                <label>Address
                  <input value={profileDraft.address || ''} onChange={(e) => setProfileDraft({ ...profileDraft, address: e.target.value })} />
                </label>
                <label>Shop Name
                  <input value={profileDraft.shopName} onChange={(e) => setProfileDraft({ ...profileDraft, shopName: e.target.value })} />
                </label>
                <div className="modal-actions">
                  <button className="primary" type="submit">Save</button>
                  <button type="button" onClick={() => { setIsEditingProfile(false); setProfileDraft(profile); }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        :root{
          --bg: #f4f7fb;
          --panel: #ffffff;
          --muted: #6b7280;
          --accent: #1f6feb;
          --accent-2: #7c3aed;
          --danger: #ef4444;
          --card-radius: 12px;
          --shadow-soft: 0 8px 30px rgba(20, 24, 40, 0.06);
        }

        *{ box-sizing: border-box; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
        :global(html, body) {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
        }

        .seller-dashboard{
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 28px;
          padding: 28px;
          background: linear-gradient(180deg, #f7fafc 0%, var(--bg) 100%);
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
        }

        .sidebar{
          background: linear-gradient(180deg, #0b1223 0%, #0f1724 100%);
          border-radius: var(--card-radius);
          padding: 20px;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-soft);
          max-height: calc(100vh - 56px);
          overflow: auto;
          min-width: 0;
        }

        .brand-wrap .brand{ font-size: 1.2rem; font-weight: 800; letter-spacing: 0.3px; }
        .brand-wrap .brand-sub{ color: rgba(255,255,255,0.75); font-size: 0.9rem; margin-top:6px; }

        .side-nav{ display:flex; flex-direction:column; gap:8px; margin-top:18px; min-width: 0; }
        .nav-item{
          display:flex; justify-content:space-between; align-items:center; gap:8px;
          background: transparent; color: rgba(255,255,255,0.95); border: none;
          padding: 12px 14px; border-radius: 10px; cursor: pointer; font-weight: 700;
          transition: background 160ms ease, transform 120ms ease;
          white-space: nowrap;
        }
        .nav-item:hover{ background: rgba(255,255,255,0.04); transform: translateY(-2px); }
        .nav-item.active{ background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)); box-shadow: 0 6px 20px rgba(15,23,42,0.05); }
        .nav-badge{ background: rgba(255,255,255,0.08); padding:6px 8px; border-radius: 999px; font-size: 0.8rem; color: #fff; }

        .sidebar-cta{ display:flex; flex-direction:column; gap:10px; align-items:stretch; margin-top:18px; }
        .add-btn{ background: linear-gradient(90deg,var(--accent),var(--accent-2)); color:white; border:none; padding:10px; border-radius:10px; font-weight:800; cursor:pointer; box-shadow: 0 8px 30px rgba(31,111,235,0.14); }
        .copyright{ color: rgba(255,255,255,0.5); font-size:0.85rem; margin-top:6px; text-align:center; }

        .main{ display:flex; flex-direction:column; gap:18px; min-width: 0; }
        .topbar{ display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .shop-pill{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:999px; border:none; background:transparent; cursor:pointer; min-width:0; }
        .avatar{ width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; background: linear-gradient(135deg,var(--accent),var(--accent-2)); font-weight:800; box-shadow: 0 8px 22px rgba(31,111,235,0.12); flex-shrink: 0; }
        .shop-text{ text-align:left; min-width:0; }
        .shop-title{ font-weight:800; color:#0f1724; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px; }
        .shop-sub{ font-size:0.85rem; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px; }
        .kpi{ display:flex; gap:12px; }

        .kpi-item{ background:var(--panel); padding:8px 14px; border-radius:10px; box-shadow:var(--shadow-soft); min-width:100px; text-align:center; }
        .kpi-label{ color:var(--muted); font-size:0.85rem; }
        .kpi-value{ font-weight:800; font-size:1.05rem; color:#0f1724; }

        .content-area{ display:flex; flex-direction:column; gap:18px; min-width:0; }

        .panel{ background: transparent; }
        .panel-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:12px; }
        .panel-head h2{ margin:0; font-size:1.15rem; color:#0f1724; }
        .panel-actions .ghost{ background: transparent; border:1px solid #e6eefc; padding:8px 10px; border-radius:8px; cursor:pointer; color:var(--accent); font-weight:700; }

        .grid.cards-grid{ display:grid; gap:14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); align-items:start; width:100%; }
        .card{ background:var(--panel); border-radius:12px; padding:16px; box-shadow:var(--shadow-soft); transition: transform 160ms ease, box-shadow 160ms ease; min-width:0; overflow: hidden; }
        .card:hover{ transform: translateY(-6px); box-shadow: 0 20px 45px rgba(15,23,42,0.08); }
        .empty{ text-align:center; color:var(--muted); padding:28px; }

        .product{ display:flex; gap:12px; min-height:110px; min-width:0; }
        .product-row{ display:flex; gap:12px; align-items:flex-start; min-width:0; }
        .prod-thumb{ width:96px; height:96px; border-radius:10px; overflow:hidden; flex-shrink:0; background:#fbfdff; border:1px solid #eef6ff; display:flex; align-items:center; justify-content:center; }
        .prod-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
        .product-body{ display:flex; flex-direction:column; gap:8px; min-width:0; flex:1; }
        .product-top{ display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .product-info{ min-width:0; }
        .product-name{ font-weight:800; color:#0f1724; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 100%; }
        .product-cat{ color:var(--muted); font-size:0.85rem; }
        .product-price{ color:var(--accent); font-weight:800; }
        .product-desc{ color:#374151; font-size:0.92rem; min-height:34px; overflow:hidden; text-overflow:ellipsis; }
        .product-footer{ display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
        .stock{ color:var(--muted); }
        .actions{ display:flex; gap:8px; }
        .ghost{ background:transparent; border:1px solid #e6e9ee; padding:8px 10px; border-radius:8px; cursor:pointer; }
        .danger{ background:var(--danger); color:white; border:none; padding:8px 10px; border-radius:8px; cursor:pointer; }

        .orders-grid{ display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:18px; align-items:start; margin-top: 12px; grid-auto-rows: minmax(160px, auto); width:100%; }
        .order-card{ background: var(--panel); border-radius: 12px; padding: 12px; border: 1px solid #eef4ff; box-shadow: 0 10px 30px rgba(16,24,40,0.06); display:flex; flex-direction:column; gap:10px; height:100%; overflow: hidden; min-width:0; }
        .card-top{ display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .order-id{ font-weight:800; color:#071327; font-size:0.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
        .order-date{ color:var(--muted); font-size:0.8rem; margin-top:4px; }
        .order-total{ margin-top:6px; color:var(--accent); font-weight:800; text-align:right; font-size:0.95rem; }

        .status-pill{ display:inline-block; padding:6px 10px; border-radius:999px; font-weight:800; color:#fff; text-transform:capitalize; font-size:0.76rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px; }
        .status-pill.pending{ background: linear-gradient(90deg,#ffb020,#ff8a00); }
        .status-pill.accepted{ background: linear-gradient(90deg,#59b8ff,#2b8cff); }
        .status-pill.processing{ background: linear-gradient(90deg,#7c5cff,#5b3bff); }
        .status-pill.shipped{ background: linear-gradient(90deg,#00bfa6,#0aa17a); }
        .status-pill.out_for_delivery{ background: linear-gradient(90deg,#f97316,#fb923c); }
        .status-pill.delivered{ background: linear-gradient(90deg,#10b981,#059669); }
        .status-pill.rejected, .status-pill.cancelled{ background: linear-gradient(90deg,#ef4444,#b91c1c); }
        .status-pill.unknown{ background:#6b7280; }

        .card-body{ display:flex; flex-direction:column; gap:8px; min-height:0; flex:1 1 auto; }
        .media-and-items{ display:flex; gap:10px; align-items:flex-start; min-height:0; flex-wrap:wrap; }
        .media-col{ width:110px; display:flex; flex-direction:column; gap:8px; align-items:center; flex-shrink:0; }
        .items-thumb{ display:grid; grid-template-columns: repeat(2, 1fr); gap:6px; width:100%; }
        .thumb-wrap{ width:100%; aspect-ratio: 1 / 1; border-radius:8px; overflow:hidden; background: linear-gradient(180deg,#fff,#fbfbff); border:1px solid #eef6ff; display:flex; align-items:center; justify-content:center; }
        .thumb-wrap img{ width:100%; height:100%; object-fit:cover; display:block; }
        .thumb-empty{ width:100%; height:80px; display:flex; align-items:center; justify-content:center; color:var(--muted); border-radius:8px; border:1px dashed #eef6ff; font-size:0.9rem; }

        .items-col{ flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; max-height:160px; overflow:auto; padding-right:6px; }
        .items-list{ display:flex; flex-direction:column; gap:6px; min-width:0; }
        .item-row{ display:flex; gap:10px; align-items:center; padding:6px; border-radius:8px; background:#fbfdff; border:1px solid #eef6ff; }
        .item-thumb{ width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid #eef6ff; flex-shrink:0; }
        .item-info{ min-width:0; display:flex; flex-direction:column; gap:4px; overflow:hidden; }
        .item-name{ font-weight:700; color:#071327; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.92rem; max-width: 180px; }
        .item-cat{ color:var(--muted); font-size:0.82rem; }
        .item-meta{ margin-left:auto; text-align:right; color:var(--muted); font-size:0.88rem; }

        .buyer-block{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; }
        .buyer-left, .buyer-right{ flex:1; min-width:0; }
        .label{ color:var(--muted); font-weight:700; font-size:0.8rem; margin-bottom:6px; }
        .buyer-name{ font-weight:800; margin-bottom:4px; font-size:0.92rem; }
        .buyer-contact .muted{ color:var(--muted); font-size:0.86rem; display:flex; gap:8px; align-items:center; }
        .address{ color:#334155; line-height:1.25; font-size:0.9rem; overflow-wrap:break-word; }

        .card-footer{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:6px; flex-wrap:wrap; }
        .left-actions{ display:flex; gap:8px; }
        .right-actions{ display:flex; gap:8px; align-items:center; }

        .form-card{ display:flex; flex-direction:column; gap:12px; }
        .form-grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; }
        .form-grid label{ display:flex; flex-direction:column; color:#374151; font-weight:600; }
        .form-grid .full{ grid-column: 1 / -1; }
        input, textarea, select{ padding:10px; border-radius:10px; border:1px solid #eef2f8; font-size:0.95rem; margin-top:8px; background:white; width:100%; box-sizing:border-box; }
        input[type="file"] { padding: 6px 0; }
        .image-preview { margin-top: 8px; max-width: 100%; max-height: 100px; object-fit: contain; border-radius: 8px; }
        .error { color: var(--danger); font-size: 0.85rem; margin-top: 4px; }
        textarea{ min-height:110px; resize:vertical; }
        .form-actions{ display:flex; gap:10px; flex-wrap:wrap; }

        .primary{ background: linear-gradient(90deg,var(--accent),var(--accent-2)); color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer; font-weight:800; }
        .profile-card{ display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
        .avatar-large{ width:72px; height:72px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-weight:800; color:white; background: linear-gradient(135deg,var(--accent),var(--accent-2)); font-size:20px; box-shadow:0 10px 30px rgba(124,58,237,0.12); }
        .profile-name{ font-weight:800; color:#0f1724; font-size:1.05rem; }
        .profile-contact{ color:var(--muted); margin-top:6px; }
        .analytics-cards{ display:flex; gap:12px; flex-wrap:wrap; }
        .metric{ flex:1; min-width:210px; text-align:center; padding:18px; }

        .modal-backdrop{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(6,10,20,0.45); z-index:60; padding:20px; }
        .modal{ width:460px; max-width: calc(100% - 40px); background:var(--panel); border-radius:12px; padding:18px; box-shadow: 0 24px 70px rgba(2,6,23,0.45); }
        .modal-header{ display:flex; gap:12px; align-items:center; margin-bottom:8px; }
        .modal-avatar{ width:56px; height:56px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:white; background: linear-gradient(135deg,var(--accent),var(--accent-2)); font-weight:800; }
        .modal-title{ font-weight:800; color:#0f1724; }
        .modal-sub{ color:var(--muted); font-size:0.9rem; }
        .modal-body .detail{ color:#374151; margin-top:8px; }
        .modal-actions{ display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }

        img{ max-width:100%; height:auto; display:block; }
        .product-name, .item-name, .order-id, .shop-title { min-width: 0; word-break: break-word; overflow-wrap: break-word; }

        @media (max-width: 1100px){
          .seller-dashboard{ grid-template-columns: 1fr; padding:18px; }
          .sidebar{ position:relative; height:auto; display:flex; flex-direction:row; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; max-height: none; overflow: visible; }
          .side-nav{ display:flex; flex-direction:row; gap:8px; overflow:auto; -webkit-overflow-scrolling:touch; padding-bottom:4px; }
          .brand-wrap{ display:none; }
          .main{ margin-top:8px; }
          .grid.cards-grid{ grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); }
          .form-grid{ grid-template-columns: 1fr; }
          .items-col { max-height: 220px; }
        }

        @media (max-width: 900px) {
          .cards-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:12px; }
          .prod-thumb { width:84px; height:84px; }
          .item-thumb { width:44px; height:44px; }
          .shop-title, .shop-sub { max-width: 220px; }
          .items-col { max-height: 200px; }
        }

        @media (max-width: 520px){
          .kpi{ display:none; }
          .grid.cards-grid{ grid-template-columns: 1fr; }
          .avatar{ width:40px; height:40px; }
          .product-desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .items-col{ max-height: 180px; }
          .card { padding: 12px; }
          .item-name { max-width: 140px; }
          .order-id { max-width: 120px; }
        }

        @media (max-width: 420px) {
          .seller-dashboard { padding: 12px; }
          .card { padding: 10px; }
          .prod-thumb { width:72px; height:72px; }
          .item-thumb { width:40px; height:40px; }
          .modal { padding: 12px; width: 100%; max-width: calc(100% - 24px); }
          .shop-title, .shop-sub { max-width: 160px; }
          .image-preview { max-height: 80px; }
        }
      `}</style>
    </>
  );
};

export default SellerDashboard;