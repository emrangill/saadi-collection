import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import { getWishlist, getProducts, db } from '../../services/firebase.js';
import {
  query,
  collection,
  where,
  getDocs,
  getDoc,
  doc as fsDoc
} from 'firebase/firestore';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { cart } = useContext(CartContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      console.log('BuyerDashboard: No user or not a buyer, redirecting to /');
      navigate('/');
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch buyer name
        try {
          const userQ = query(collection(db, 'users'), where('uid', '==', user.uid));
          const userSnap = await getDocs(userQ);
          if (!userSnap.empty) {
            const data = userSnap.docs[0].data();
            const nameFromDoc = data?.name || data?.displayName || data?.fullName || '';
            if (mounted) setDisplayName(nameFromDoc || user.displayName || user.email);
            console.log('BuyerDashboard: Set displayName:', nameFromDoc || user.displayName || user.email);
          } else {
            if (mounted) setDisplayName(user.displayName || user.email);
            console.log('BuyerDashboard: No user document, set displayName:', user.displayName || user.email);
          }
        } catch (err) {
          console.warn('BuyerDashboard: Error fetching user profile:', {
            message: err.message,
            code: err.code,
            stack: err.stack
          });
          if (mounted) setDisplayName(user.displayName || user.email);
        }

        // Fetch orders (no limit - show all orders for this user)
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const allOrders = ordersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort desc (no slice -> keep all)
        const sortedOrders = allOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });

        // Resolve images for each item inside each order
        const ordersWithImages = await Promise.all(sortedOrders.map(async (order) => {
          const items = Array.isArray(order.items) ? order.items : [];

          const resolvedItems = await Promise.all(items.map(async (item) => {
            const copy = { ...item };
            const pid = copy.productId || copy.id;
            if (pid) {
              try {
                const prodSnap = await getDoc(fsDoc(db, 'products', String(pid)));
                if (prodSnap.exists()) {
                  const pd = prodSnap.data();
                  copy.displayImage = pd.imageData || '/placeholder.jpg';
                } else {
                  copy.displayImage = '/placeholder.jpg';
                }
              } catch (err) {
                console.warn('BuyerDashboard: failed to fetch product doc for productId', pid, err);
                copy.displayImage = '/placeholder.jpg';
              }
            } else {
              copy.displayImage = '/placeholder.jpg';
            }
            return copy;
          }));

          const preview = (resolvedItems.length > 0 && resolvedItems[0].displayImage) ? resolvedItems[0].displayImage : '/placeholder.jpg';

          return { ...order, items: resolvedItems, previewImage: preview };
        }));

        if (!mounted) return;
        setOrders(ordersWithImages);

        // Fetch wishlist
        const wishlistItems = await getWishlist(user.uid);
        const wishlistWithImages = await Promise.all(wishlistItems.map(async (item) => {
          const copy = { ...item };
          try {
            const prodSnap = await getDoc(fsDoc(db, 'products', String(item.id)));
            if (prodSnap.exists()) {
              const pd = prodSnap.data();
              copy.image = pd.imageData || '/placeholder.jpg';
            } else {
              copy.image = '/placeholder.jpg';
            }
          } catch (err) {
            console.warn('BuyerDashboard: failed to fetch product doc for wishlist item', item.id, err);
            copy.image = '/placeholder.jpg';
          }
          return copy;
        }));
        if (mounted) setWishlist(wishlistWithImages);

        // Fetch recommended products
        const products = await getProducts();
        const recommendedWithImages = await Promise.all(products.slice(0, 4).map(async (product) => {
          const copy = { ...product };
          copy.displayImage = product.imageData || '/placeholder.jpg';
          return copy;
        }));
        if (mounted) setRecommendedProducts(recommendedWithImages);

        if (mounted) setLoading(false);
      } catch (err) {
        console.error('BuyerDashboard: Error fetching dashboard data:', {
          message: err.message,
          code: err.code,
          stack: err.stack
        });
        alert('Failed to load dashboard: ' + (err.message || err));
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  const getInitials = (name = '') => {
    const parts = (name || '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'B';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  return (
    <div className="buyer-dashboard">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand">MyEcom</div>
          <div className="brand-sub">Buyer Panel</div>
        </div>

        <nav className="side-nav" aria-label="Buyer navigation">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-label">Overview</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span className="nav-label">Orders</span>
            <span className="nav-badge">{orders.length}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('wishlist')}
          >
            <span className="nav-label">Wishlist</span>
            <span className="nav-badge">{wishlist.length}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveTab('cart')}
          >
            <span className="nav-label">Cart</span>
            <span className="nav-badge">{cart.length}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <span className="nav-label">Recommendations</span>
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
              <div className="avatar">{getInitials(displayName)}</div>
              <div className="shop-text">
                <div className="shop-title">Welcome, {displayName || 'Buyer'}</div>
              </div>
            </div>
          </div>

          <div className="right">
            <div className="kpi">
              <div className="kpi-item">
                <div className="kpi-label">Orders</div>
                <div className="kpi-value">{orders.length}</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-label">Wishlist</div>
                <div className="kpi-value">{wishlist.length}</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-label">Cart</div>
                <div className="kpi-value">{cart.length}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="content-area">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <section className="panel">
              <div className="panel-head">
                <h2>Overview</h2>
              </div>
              <div className="grid cards-grid">
                <div className="card">
                  <div className="metric-title">Recent Orders</div>
                  <div className="metric-value">{orders.length} active orders</div>
                  <button
                    className="primary"
                    onClick={() => navigate('/buyer/order-history')}
                  >
                    View All
                  </button>
                </div>
                <div className="card">
                  <div className="metric-title">Wishlist</div>
                  <div className="metric-value">{wishlist.length} saved items</div>
                  <button
                    className="primary"
                    onClick={() => navigate('/buyer/wishlist')}
                  >
                    View Wishlist
                  </button>
                </div>
                <div className="card">
                  <div className="metric-title">Cart</div>
                  <div className="metric-value">{cart.length} items</div>
                  <button
                    className="primary"
                    onClick={() => navigate('/buyer/cart')}
                  >
                    View Cart
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <section className="panel">
              <div className="panel-head">
                <h2>Recent Orders</h2>
                <div className="panel-actions">
                  <button
                    className="ghost"
                    onClick={() => navigate('/buyer/order-history')}
                  >
                    View All Orders
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="card empty">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="card empty">No recent orders.</div>
              ) : (
                <div className="grid cards-grid">
                  {orders.map(order => (
                    <div key={order.id} className="card order">
                      <img
                        src={order.previewImage || '/placeholder.jpg'}
                        alt="Order item"
                        className="order-img"
                        onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                      />
                      <div className="order-details">
                        <div className="order-id">#{order.id}</div>
                        <div className="order-meta">
                          <div>
                            <strong>Date:</strong>{' '}
                            {new Date(
                              order.createdAt?.toDate
                                ? order.createdAt.toDate()
                                : order.createdAt
                            ).toLocaleDateString()}
                          </div>
                          <div><strong>Total:</strong> ${Number(order.total || 0).toFixed(2)}</div>
                          <div><strong>Status:</strong> {order.status}</div>
                        </div>
                        <button
                          className="primary"
                          onClick={() => navigate(`/buyer/track-order/${order.id}`)}
                        >
                          Track Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <section className="panel">
              <div className="panel-head">
                <h2>Your Wishlist</h2>
                <div className="panel-actions">
                  <button
                    className="ghost"
                    onClick={() => navigate('/buyer/wishlist')}
                  >
                    View All Wishlist
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="card empty">Loading wishlist...</div>
              ) : wishlist.length === 0 ? (
                <div className="card empty">No items in wishlist.</div>
              ) : (
                <div className="grid cards-grid">
                  {wishlist.map(item => (
                    <div key={item.id} className="card product">
                      <img
                        src={item.image || '/placeholder.jpg'}
                        alt={item.name}
                        className="product-img"
                        onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                      />
                      <div className="product-name">{item.name}</div>
                      <div className="product-price">${(item.price || 0).toFixed(2)}</div>
                      <button
                        className="primary"
                        onClick={() => navigate('/buyer/wishlist')}
                      >
                        View All
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <section className="panel">
              <div className="panel-head">
                <h2>Your Cart</h2>
                <div className="panel-actions">
                  <button
                    className="ghost"
                    onClick={() => navigate('/buyer/cart')}
                  >
                    View Cart
                  </button>
                </div>
              </div>
              {cart.length === 0 ? (
                <div className="card empty">No items in cart.</div>
              ) : (
                <div className="grid cards-grid">
                  {cart.map(item => (
                    <div key={item.id} className="card product">
                      <img
                        src={item.displayImage || '/placeholder.jpg'}
                        alt={item.name}
                        className="product-img"
                        onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                      />
                      <div className="product-name">{item.name}</div>
                      <div className="product-price">${(item.price || 0).toFixed(2)}</div>
                      <div className="product-meta">Quantity: {item.quantity || 1}</div>
                      <button
                        className="primary"
                        onClick={() => navigate('/buyer/cart')}
                      >
                        View Cart
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <section className="panel">
              <div className="panel-head">
                <h2>Recommended for You</h2>
              </div>
              {loading ? (
                <div className="card empty">Loading recommendations...</div>
              ) : recommendedProducts.length === 0 ? (
                <div className="card empty">No recommendations available.</div>
              ) : (
                <div className="grid cards-grid">
                  {recommendedProducts.map(product => (
                    <div key={product.id} className="card product">
                      <img
                        src={product.displayImage || '/placeholder.jpg'}
                        alt={product.name}
                        className="product-img"
                        onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                      />
                      <div className="product-name">{product.name}</div>
                      <div className="product-price">${(product.price || 0).toFixed(2)}</div>
                      <button
                        className="primary"
                        onClick={() => navigate(`/buyer/product/${product.id}`)}
                      >
                        View Product
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
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

        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }

        body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #0f1724; }

        .buyer-dashboard {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 24px;
          padding: 20px;
          background: linear-gradient(180deg, #f7fafc 0%, var(--bg) 100%);
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          overflow: visible;
        }

        .sidebar {
          background: linear-gradient(180deg, #0b1223 0%, #0f1724 100%);
          border-radius: var(--card-radius);
          padding: 18px;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-soft);
          max-height: calc(100vh - 40px);
          overflow: auto;
          min-width: 0;
        }

        .brand-wrap .brand { font-size: 1.2rem; font-weight: 800; letter-spacing: 0.3px; }
        .brand-wrap .brand-sub { color: rgba(255,255,255,0.75); font-size: 0.9rem; margin-top: 6px; }

        .side-nav { display:flex; flex-direction:column; gap:8px; margin-top:18px; min-width: 0; }
        .nav-item {
          display:flex; justify-content:space-between; align-items:center; gap:8px;
          background:transparent; color:rgba(255,255,255,0.95); border:none;
          padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:700;
          transition: background 160ms ease, transform 120ms ease; white-space:nowrap;
        }
        .nav-item:hover { background: rgba(255,255,255,0.04); transform: translateY(-2px); }
        .nav-item.active { background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)); box-shadow: 0 6px 20px rgba(15,23,42,0.05); }
        .nav-badge { background: rgba(255,255,255,0.08); padding:6px 8px; border-radius:999px; font-size:0.8rem; color:#fff; }

        .sidebar-cta { display:flex; flex-direction:column; gap:10px; align-items:stretch; margin-top:18px; }
        .copyright { color: rgba(255,255,255,0.5); font-size:0.85rem; text-align:center; }

        .main {
          display:flex;
          flex-direction:column;
          gap:18px;
          min-height: 100vh;
          width: 100%;
        }

        .topbar {
          display:flex; justify-content:space-between; align-items:center; gap:12px; flex: 0 0 auto;
        }
        .shop-pill { display:flex; align-items:center; gap:12px; padding:8px 10px; border-radius:999px; background:transparent; }
        .avatar {
          width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center;
          color:white; background: linear-gradient(135deg, var(--accent), var(--accent-2)); font-weight:800; flex-shrink:0;
        }
        .shop-text { text-align:left; }
        .shop-title { font-weight:800; color:#0f1724; font-size:1.05rem; }

        .kpi { display:flex; gap:12px; align-items:center; }
        .kpi-item { background:var(--panel); padding:6px 12px; border-radius:10px; box-shadow:var(--shadow-soft); min-width:80px; text-align:center; }
        .kpi-label { color:var(--muted); font-size:0.8rem; } .kpi-value { font-weight:800; font-size:1rem; color:#0f1724; }

        .content-area {
          display:flex; flex-direction:column; gap:18px;
          overflow: auto;
          width: 100%;
          max-width: 100%;
          padding-right: 8px;
        }

        .panel-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .panel-head h2 { margin:0; font-size:1.1rem; color:#0f1724; }
        .panel-actions .ghost { background:transparent; border:1px solid #e6eefc; padding:8px 10px; border-radius:8px; cursor:pointer; color:var(--accent); font-weight:700; }

        .cards-grid {
          display:grid;
          gap:12px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          align-items:start;
          width: 100%;
        }

        .card {
          background:var(--panel); border-radius:12px; padding:14px; box-shadow:var(--shadow-soft);
          transition: transform 160ms ease, box-shadow 160ms ease; display:flex; flex-direction:column; gap:10px; min-width: 0;
        }
        .card:hover { transform: translateY(-6px); box-shadow: 0 20px 45px rgba(15,23,42,0.08); }
        .empty { text-align:center; color:var(--muted); padding:20px; }

        .order { display:flex; flex-direction:column; gap:10px; }
        .order-img { width:100%; height:140px; object-fit:cover; border-radius:8px; display:block; }
        .order-id { font-weight:800; color:#0f1724; }
        .order-details { display:flex; flex-direction:column; gap:8px; }
        .order-meta { color:var(--muted); font-size:0.95rem; word-break:break-word; overflow-wrap:break-word; }

        .product { display:flex; flex-direction:column; gap:8px; }
        .product-img { width:100%; height:140px; object-fit:cover; border-radius:8px; display:block; }
        .product-name { font-weight:800; color:#0f1724; font-size:1rem; word-break:break-word; overflow-wrap:break-word; }
        .product-price { color:var(--accent); font-weight:800; }
        .product-meta { color:var(--muted); font-size:0.95rem; }

        .primary {
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          color:white; border:none; padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:800;
          width: auto;
        }

        img { max-width:100%; height:auto; display:block; }
        .value, .product-name, .order-meta { word-break: break-word; overflow-wrap: break-word; }

        @media (max-width: 1100px) {
          .buyer-dashboard {
            grid-template-columns: 1fr;
            padding: 14px;
          }

          .sidebar {
            display:flex;
            flex-direction:row;
            align-items:center;
            gap:10px;
            padding:10px;
            border-radius:10px;
            max-height: none;
            overflow: visible;
            width: 100%;
            min-width: 0;
          }

          .brand-wrap { display:none; }

          .side-nav {
            flex-direction:row;
            gap:8px;
            overflow-x:auto;
            padding-bottom:4px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            min-width: 0;
          }

          .nav-item {
            flex: 0 0 auto;
            border-radius:999px;
            padding:8px 10px;
            font-size:0.92rem;
            white-space:nowrap;
          }

          .content-area { height: calc(100vh - 92px); }
          .cards-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px; }
          .order-img, .product-img { height:130px; }
        }

        @media (max-width: 900px) {
          .cards-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px; }
          .order-img, .product-img { height:120px; }
          .avatar { width:40px; height:40px; }
        }

        @media (max-width: 520px) {
          .cards-grid { grid-template-columns: 1fr; gap:10px; }
          .order-img, .product-img { height:110px; }
          .card { padding:12px; }
          .primary { width:100%; display:block; text-align:center; }
          .kpi { display:none; }
          .nav-badge { display:none; }
          .content-area { height: calc(100vh - 120px); }
        }

        @media (max-width: 420px) {
          .buyer-dashboard { padding: 8px; }
          .card { padding:10px; }
          .order-img, .product-img { height:90px; }
          .shop-title { font-size:0.95rem; }
        }
      `}</style>
    </div>
  );
};

export default BuyerDashboard;