import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  doc as fsDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase.js';

const OrderHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rawOrders, setRawOrders] = useState([]); // orders as received from Firestore (with preview image attached)
  const [filters, setFilters] = useState({ status: '' }); // only status filter
  const [loading, setLoading] = useState(true);

  // normalize createdAt to JS Date
  const toDate = (createdAt) => {
    if (!createdAt) return null;
    if (typeof createdAt.toDate === 'function') return createdAt.toDate(); // Firestore Timestamp
    if (typeof createdAt === 'number') return new Date(createdAt);
    if (typeof createdAt === 'string') {
      const d = new Date(createdAt);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  // Client-side filter function - only status remains
  const orderMatchesFilters = (order, { status }) => {
    if (!order) return false;
    if (status && String(order.status || '').toLowerCase() !== String(status).toLowerCase()) return false;
    return true;
  };

  // Subscribe to user's orders in realtime and resolve preview image for each order's first item
  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/');
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          // Resolve preview images concurrently
          const withImages = await Promise.all(docs.map(async (order) => {
            let image = '/placeholder.jpg';
            if (order.items && order.items.length > 0) {
              const firstItem = order.items[0];
              try {
                const prodSnap = await getDoc(fsDoc(db, 'products', firstItem.productId));
                if (prodSnap.exists()) {
                  const pd = prodSnap.data();
                  image = pd.imageData || '/placeholder.jpg';
                }
              } catch (err) {
                console.warn('OrderHistory: failed to fetch product for order preview', err);
              }
            }
            return { ...order, image };
          }));

          setRawOrders(withImages);
        } catch (err) {
          console.error('OrderHistory: error processing snapshot', err);
          setRawOrders([]);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('OrderHistory: snapshot error', err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, navigate]);

  // Derived filtered list (always up-to-date when filters change)
  const orders = useMemo(() => {
    if (!rawOrders || rawOrders.length === 0) return [];
    return rawOrders.filter((o) => orderMatchesFilters(o, filters));
  }, [rawOrders, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const formatDate = (d) => {
    const dt = toDate(d);
    if (!dt) return 'N/A';
    return dt.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <>
      <div className="order-history">
        <div className="page-head">
          <div>
            <h1>Order History</h1>
          </div>

          <div className="controls" role="region" aria-label="Order filters">
            <div className="filters">
              <label className="filter-field">
                <span className="sr-only">Status</span>
                <select name="status" value={filters.status} onChange={handleFilterChange} aria-label="Filter by status">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="muted center">Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No orders found.</p>
            <button className="primary" onClick={() => navigate('/buyer/products')}>Browse Products</button>
          </div>
        ) : (
          <div className="orders-grid" role="list" aria-label="Orders list">
            {orders.map(order => (
              <article key={order.id} className="order-card" aria-labelledby={`order-${order.id}`} role="listitem">
                <div className="card-media" aria-hidden="true">
                  <img src={order.image || '/placeholder.jpg'} alt={`Order ${order.id} preview`} loading="lazy" />
                  <div className="chip">#{String(order.id).slice(-6)}</div>
                </div>

                <div className="card-body">
                  <header className="card-header">
                    <div className="order-title">
                      <div id={`order-${order.id}`} className="order-id" title={`Order #${order.id}`}>Order #{String(order.id)}</div>
                      <div className="order-date">{formatDate(order.createdAt)}</div>
                    </div>

                    <div className="order-summary" aria-hidden="true">
                      <div className="order-total">Rs. {Number(order.total || 0).toFixed(2)}</div>
                      <div className={`status-pill ${order.status || 'unknown'}`}>{order.status || 'N/A'}</div>
                    </div>
                  </header>

                  <div className="items-preview" aria-live="polite">
                    <p className="muted small-label">Items</p>
                    <ul>
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) => (
                          <li key={index} className="item-row">
                            <div className="item-info" title={item.name}>
                              <div className="item-name">{item.name.length > 60 ? `${item.name.slice(0, 57)}…` : item.name}</div>
                              <div className="item-meta">Qty: {item.quantity}</div>
                            </div>
                            <div className="item-price">Rs. {Number(item.price || 0).toFixed(2)}</div>
                          </li>
                        ))
                      ) : (
                        <li className="muted">No items available</li>
                      )}
                    </ul>
                  </div>

                  <footer className="card-footer">
                    <div className="footer-left">
                      <div className="muted">Items: <strong>{(order.items || []).length}</strong></div>
                      <div className="muted">Payment: <strong>{order.paymentMethod || 'N/A'}</strong></div>
                    </div>

                    <div className="footer-actions">
                      <button className="primary" onClick={() => navigate(`/buyer/track-order/${order.id}`)}>Track</button>
                    </div>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        :root{
          --bg: #f7f9fc;
          --panel: #ffffff;
          --muted: #6b7280;
          --accent: #1f6feb;
          --accent-2: #7c3aed;
          --card-radius: 14px;
          --shadow: 0 12px 30px rgba(16,24,40,0.06);
        }

        .order-history{
          padding: clamp(16px, 3vw, 32px);
          max-width: 1220px;
          margin: 0 auto;
          min-height: calc(100vh - 120px);
          background: linear-gradient(180deg, var(--bg) 0%, #ffffff 40%);
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #071327;
        }

        .page-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:16px;
          margin-bottom:18px;
          flex-wrap:wrap;
        }

        h1{
          margin:0;
          font-size: clamp(1.1rem, 2vw, 1.5rem);
          color:#071327;
          line-height:1.05;
          letter-spacing: -0.2px;
        }

        .controls{
          display:flex;
          gap:12px;
          align-items:center;
          min-width:0;
        }

        .filters{
          display:flex;
          gap:10px;
          align-items:center;
          background:#fff;
          padding:8px;
          border-radius:10px;
          box-shadow: 0 4px 18px rgba(16,24,40,0.04);
          flex-wrap:wrap;
          min-width:0;
          max-width:100%;
        }
        .filter-field { display:inline-flex; min-width:0; align-items:center; }

        .filters select{
          padding:8px 10px;
          border-radius:8px;
          border:1px solid #e6eefb;
          background:#fff;
          font-weight:600;
          min-width:0;
          width: auto;
          flex: 0 0 auto;
          max-width: 220px;
        }

        .sr-only{
          position:absolute !important;
          height:1px; width:1px;
          overflow:hidden;
          clip:rect(1px, 1px, 1px, 1px);
          white-space:nowrap;
        }

        .empty-state { text-align:center; padding:48px 8px; }
        .empty-state .primary { margin-top:12px; }

        .orders-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap:20px;
        }

        .order-card{
          display:grid;
          grid-template-columns: 140px minmax(0, 1fr);
          gap:16px;
          background: var(--panel);
          border-radius: var(--card-radius);
          padding:16px;
          border:1px solid #eef4ff;
          box-shadow: var(--shadow);
          align-items:start;
          transition: transform 160ms ease, box-shadow 160ms ease;
          overflow: hidden;
        }
        .order-card:hover{
          transform: translateY(-6px);
          box-shadow: 0 34px 80px rgba(16,24,40,0.08);
        }

        .card-media{
          width:100%;
          height:120px;
          border-radius: 10px;
          overflow: hidden;
          background: linear-gradient(180deg,#fff,#fbfbff);
          border:1px solid #eef6ff;
          display:flex;
          align-items:center;
          justify-content:center;
          position:relative;
        }
        .card-media img{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .card-media .chip{
          position:absolute;
          left:10px;
          top:10px;
          background: rgba(0,0,0,0.6);
          color:#fff;
          font-size:0.78rem;
          padding:6px 8px;
          border-radius:999px;
          font-weight:700;
        }

        .card-body{
          display:flex;
          flex-direction:column;
          gap:10px;
          min-width:0;
        }

        .card-header{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
        }

        .order-title{ display:flex; flex-direction:column; gap:6px; min-width:0; }
        .order-id{
          font-weight:800;
          color:#071327;
          font-size:0.98rem;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .order-date{ color:var(--muted); font-size:0.86rem; }

        .order-summary{ display:flex; flex-direction:column; align-items:flex-end; gap:8px; min-width:120px; }
        .order-total{ font-weight:800; color:#071327; font-size:1rem; }

        .status-pill{
          padding:6px 10px;
          border-radius:999px;
          font-weight:700;
          color:#fff;
          font-size:0.82rem;
          text-transform:capitalize;
          white-space:nowrap;
        }
        .status-pill.pending { background: linear-gradient(90deg,#ffb020,#ff8a00); }
        .status-pill.accepted { background: linear-gradient(90deg,#59b8ff,#2b8cff); }
        .status-pill.processing { background: linear-gradient(90deg,#7c5cff,#5b3bff); }
        .status-pill.shipped { background: linear-gradient(90deg,#00bfa6,#0aa17a); }
        .status-pill.out_for_delivery { background: linear-gradient(90deg,#f97316,#fb923c); }
        .status-pill.delivered { background: linear-gradient(90deg,#10b981,#059669); }
        .status-pill.rejected, .status-pill.cancelled { background: linear-gradient(90deg,#ef4444,#b91c1c); }
        .status-pill.unknown { background:#6b7280; }

        .items-preview{ margin-top:6px; }
        .items-preview .small-label{ margin:0 0 6px 0; color:var(--muted); font-size:0.8rem; }
        .items-preview ul{
          list-style:none;
          padding:0;
          margin:0;
          display:flex;
          flex-direction:column;
          gap:8px;
          max-height: 150px;
          overflow:auto;
          padding-right: 6px;
        }
        .items-preview ul::-webkit-scrollbar{ width:8px; height:8px; }
        .items-preview ul::-webkit-scrollbar-thumb{ background:rgba(11,23,39,0.06); border-radius:8px; }
        .item-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:36px; }
        .item-info{ display:flex; flex-direction:column; gap:4px; min-width:0; }
        .item-name{
          font-weight:700;
          color:#071327;
          font-size:0.95rem;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .item-meta{ color:var(--muted); font-size:0.85rem; }

        .item-price{
          color:var(--muted);
          font-size:0.92rem;
          font-weight:700;
          min-width:85px;
          text-align:right;
        }

        .card-footer{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          margin-top:auto;
          flex-wrap:wrap;
        }
        .footer-left .muted{ color:var(--muted); font-size:0.88rem; }
        .footer-actions{ display:flex; gap:8px; flex-wrap:wrap; }

        .ghost{
          background: transparent;
          border: 1px solid #e6eefb;
          color: #0b69ff;
          padding:8px 10px;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        }
        .primary{
          background: linear-gradient(90deg,var(--accent),var(--accent-2));
          color: white;
          border: none;
          padding:8px 12px;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        }

        @media (max-width: 880px) {
          .order-card{ grid-template-columns: 120px 1fr; gap:12px; padding:12px; }
          .card-media{ height:100px; }
          .items-preview ul{ max-height: 130px; }
        }

        @media (max-width: 720px) {
          .page-head{ flex-direction:column; align-items:flex-start; gap:12px; }
          .orders-grid{ grid-template-columns: 1fr; }
          .order-card{ grid-template-columns: 1fr; }
          .card-media{ width:100%; height:220px; }
          .card-header{ align-items:flex-start; gap:10px; }
          .order-summary{ flex-direction:row; align-items:center; gap:10px; }
          .items-preview ul{ max-height: 120px; }
          .item-price{ text-align:left; min-width:0; }
          .card-footer{ flex-direction:column; align-items:flex-start; gap:10px; }
          .footer-actions{ width:100%; display:flex; justify-content:flex-end; gap:8px; }
          .filters { width:100%; padding:8px; box-sizing:border-box; }
          .filter-field { flex: 1 1 auto; min-width: 0; }
          .filters select{ flex: 0 1 240px; max-width:100%; }
        }

        @media (max-width: 420px){
          .card-media{ height:180px; }
          .items-preview ul{ gap:6px; }
          .item-name{ font-size:0.9rem; }
          .filters select{ padding:6px 8px; font-size:0.92rem; }
        }
      `}</style>
    </>
  );
};

export default OrderHistory;