import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getOrdersBySeller,
  updateOrderStatus,
  getCategories,
  getProductsBySeller
} from '../../services/firebase.js';
import { db } from '../../services/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesMap, setCategoriesMap] = useState({});

  // Normalize createdAt to JS Date (handles Firestore Timestamp, number, string)
  const toDate = (v) => {
    if (!v) return new Date(0);
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'number') return new Date(v);
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  // Resolve a single item's displayImage (prefers item.imageData, then product.imageData)
  const resolveSingleItemImage = (item, productsMap) => {
    const copy = { ...item };

    // Prefer imageData from the item
    if (copy.imageData && typeof copy.imageData === 'string' && copy.imageData.startsWith('data:image/')) {
      return { ...copy, displayImage: copy.imageData };
    }

    // Fallback to imageData from productsMap if productId exists
    const pid = copy.productId || copy.id;
    if (pid && productsMap[pid]?.imageData && typeof productsMap[pid].imageData === 'string' && productsMap[pid].imageData.startsWith('data:image/')) {
      return { ...copy, displayImage: productsMap[pid].imageData };
    }

    // Default to placeholder
    return { ...copy, displayImage: '/placeholder.jpg' };
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const fetchData = async () => {
      if (!user || !user.uid) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        // Categories
        const categories = (await getCategories()) || [];
        const catMap = {};
        categories.forEach((c) => (catMap[c.id] = c.name));
        if (!mounted) return;
        setCategoriesMap(catMap);

        // Seller products map
        const sellerProducts = (await getProductsBySeller(user.uid)) || [];
        const productsMap = {};
        sellerProducts.forEach((p) => {
          productsMap[p.id] = {
            name: p.name,
            category: p.category,
            categoryName: catMap[p.category] || p.category || '—',
            imageData: p.imageData // Use imageData from Firestore
          };
        });

        // Orders
        const sellerOrders = (await getOrdersBySeller(user.uid)) || [];

        // Collect unique customer ids for lookup
        const customerIds = Array.from(new Set(sellerOrders.map((o) => o.customerId).filter(Boolean)));
        const customerMap = {};
        if (customerIds.length > 0) {
          await Promise.all(customerIds.map(async (cid) => {
            try {
              const snap = await getDoc(doc(db, 'users', cid));
              if (snap.exists()) {
                const data = snap.data();
                customerMap[cid] = {
                  name: data.name || data.displayName || data.fullName || '',
                  email: data.email || '',
                  phone: data.phone || data.phoneNumber || ''
                };
              } else {
                customerMap[cid] = { name: '', email: '', phone: '' };
              }
            } catch (err) {
              console.warn('Orders: error fetching customer', cid, err);
              customerMap[cid] = { name: '', email: '', phone: '' };
            }
          }));
        }

        // Enrich orders: include customer info and resolve item images
        const enriched = await Promise.all(sellerOrders.map(async (o) => {
          // Prefer explicit order-level fields, otherwise fallback to shippingInfo or user map
          const shipping = o.shippingInfo || {};
          const customerName =
            o.customerName ||
            shipping.name ||
            (o.customerId ? (customerMap[o.customerId]?.name || '') : '') ||
            o.customerEmail ||
            '';
          const customerEmail = o.customerEmail || shipping.email || (o.customerId ? (customerMap[o.customerId]?.email || '') : '');
          const customerPhone = o.customerPhone || shipping.phone || (o.customerId ? (customerMap[o.customerId]?.phone || '') : '');

          const items = Array.isArray(o.items) ? o.items : [];
          const resolvedItems = items.map((it) => {
            // Populate productName and categoryName from productsMap if missing
            const base = {
              ...it,
              productName: it.productName || productsMap[it.productId]?.name || it.name || 'Product',
              categoryName: it.categoryName || productsMap[it.productId]?.categoryName || '—'
            };
            // Resolve image for this item
            return resolveSingleItemImage(base, productsMap);
          });

          return {
            ...o,
            customerName,
            customerEmail,
            customerPhone,
            items: resolvedItems
          };
        }));

        if (!mounted) return;

        // Sort enriched orders so newest/most-recent orders appear first
        enriched.sort((a, b) => {
          const da = toDate(a.createdAt).getTime();
          const db = toDate(b.createdAt).getTime();
          return db - da;
        });

        setOrders(enriched);
      } catch (err) {
        console.error('Orders: fetch error', err);
        alert('Failed to load orders: ' + (err.message || err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (['rejected', 'cancelled'].includes(newStatus)) {
      if (!window.confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return;
    }
    try {
      await updateOrderStatus(orderId, newStatus, user?.uid);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      alert(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Orders: update status failed', err);
      alert('Failed to update order status: ' + (err.message || err));
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
      <div className="orders-page">
        <header className="top">
          <div>
            <h1>Your Orders</h1>
            <p className="hint">Manage seller orders — buyer contact, shipping and product thumbnails shown below.</p>
          </div>
        </header>

        {loading ? (
          <div className="loading">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="cards-grid" role="list">
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
                  <div className="left-actions">
                    {/* View button intentionally removed */}
                  </div>

                  <div className="right-actions">
                    <label className="sr-only" htmlFor={`status-${o.id}`}>Change status</label>
                    <select
                      id={`status-${o.id}`}
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
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

        <style jsx>{`
          :root{
            --bg: #f7fafc;
            --panel: #ffffff;
            --muted: #6b7280;
            --accent: #0b69ff;
            --accent-2: #0753d1;
            --success: #10b981;
            --danger: #ef4444;
            --card-radius: 12px;
            --shadow: 0 10px 30px rgba(16,24,40,0.06);
          }

          .orders-page{
            padding: clamp(16px, 3vw, 28px);
            background: linear-gradient(180deg, var(--bg) 0%, #ffffff 40%);
            min-height: calc(100vh - 60px);
            font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
            color: #071327;
          }

          .top { margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center; gap:12px; }
          h1 { margin:0; font-size: clamp(1rem, 1.8vw, 1.25rem); color: #071327; }
          .hint { color: var(--muted); margin:4px 0 0 0; font-size:0.92rem; }

          .loading, .empty { text-align:center; color:var(--muted); padding:28px; }

          /* Grid: equal-height cards by using grid-auto-rows + stretch cards.
             Reduced card height and increased vertical gap as requested. */
          .cards-grid{
            display:grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 28px 18px; /* larger vertical gap between rows, modest horizontal gap */
            align-items:start;
            margin-top: 12px;
            grid-auto-rows: minmax(160px, 1fr); /* smaller base height so cards are shorter */
          }

          .order-card{
            background: var(--panel);
            border-radius: calc(var(--card-radius) - 2px);
            padding: 10px; /* further reduced padding to shrink height */
            border: 1px solid rgba(14, 57, 116, 0.06);
            box-shadow: var(--shadow);
            display:flex;
            flex-direction:column;
            gap:8px;
            height:100%;
            overflow: hidden;
            transition: transform 140ms ease, box-shadow 140ms ease;
          }
          .order-card:hover{
            transform: translateY(-6px);
            box-shadow: 0 18px 40px rgba(16,24,40,0.08);
          }

          .card-top{
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:10px;
          }
          .order-id{ font-weight:800; color:#071327; font-size:0.92rem; }
          .order-date{ color:var(--muted); font-size:0.8rem; margin-top:4px; }
          .order-total{ margin-top:6px; color:var(--accent); font-weight:800; text-align:right; font-size:0.95rem; }

          .status-pill{ display:inline-block; padding:6px 10px; border-radius:999px; font-weight:800; color:#fff; text-transform:capitalize; font-size:0.76rem; }
          .status-pill.pending{ background: linear-gradient(90deg,#ffb020,#ff8a00); }
          .status-pill.accepted{ background: linear-gradient(90deg,#59b8ff,#2b8cff); }
          .status-pill.processing{ background: linear-gradient(90deg,#7c5cff,#5b3bff); }
          .status-pill.shipped{ background: linear-gradient(90deg,#00bfa6,#0aa17a); }
          .status-pill.out_for_delivery{ background: linear-gradient(90deg,#f97316,#fb923c); }
          .status-pill.delivered{ background: linear-gradient(90deg,#10b981,#059669); }
          .status-pill.rejected, .status-pill.cancelled{ background: linear-gradient(90deg,#ef4444,#b91c1c); }
          .status-pill.unknown{ background:#6b7280; }

          .card-body{ display:flex; flex-direction:column; gap:8px; min-height:0; flex:1 1 auto; }

          .media-and-items{ display:flex; gap:10px; align-items:flex-start; min-height:0; }
          .media-col{ width:110px; display:flex; flex-direction:column; gap:8px; align-items:center; flex-shrink:0; }
          .items-thumb{ display:grid; grid-template-columns: repeat(2, 1fr); gap:6px; width:100%; }
          .thumb-wrap{ width:100%; aspect-ratio: 1 / 1; border-radius:8px; overflow:hidden; background: linear-gradient(180deg,#fff,#fbfbff); border:1px solid #eef6ff; display:flex; align-items:center; justify-content:center; }
          .thumb-wrap img{ width:100%; height:100%; object-fit:cover; display:block; }
          .thumb-empty{ width:100%; height:80px; display:flex; align-items:center; justify-content:center; color:var(--muted); border-radius:8px; border:1px dashed #eef6ff; font-size:0.9rem; }

          .items-col{ flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; max-height:140px; overflow:auto; padding-right:6px; }
          .items-list{ display:flex; flex-direction:column; gap:6px; min-width:0; }
          .item-row{ display:flex; gap:10px; align-items:center; padding:6px; border-radius:8px; background:#fbfdff; border:1px solid #eef6ff; }
          .item-thumb{ width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid #eef6ff; flex-shrink:0; }
          .item-info{ min-width:0; display:flex; flex-direction:column; gap:4px; }
          .item-name{ font-weight:700; color:#071327; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.92rem; }
          .item-cat{ color:var(--muted); font-size:0.82rem; }
          .item-meta{ margin-left:auto; text-align:right; color:var(--muted); font-size:0.88rem; }

          .buyer-block{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; }
          .buyer-left, .buyer-right{ flex:1; min-width:0; }
          .label{ color:var(--muted); font-weight:700; font-size:0.8rem; margin-bottom:6px; }
          .buyer-name{ font-weight:800; margin-bottom:4px; font-size:0.92rem; }
          .buyer-contact .muted{ color:var(--muted); font-size:0.86rem; display:flex; gap:8px; align-items:center; }

          .address{ color:#334155; line-height:1.25; font-size:0.9rem; }

          .card-footer{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:6px; }
          .left-actions{ display:flex; gap:8px; }
          .right-actions{ display:flex; gap:8px; align-items:center; }

          .btn{ background: linear-gradient(90deg,var(--accent),var(--accent-2)); color:#fff; border:none; padding:8px 10px; border-radius:8px; cursor:pointer; font-weight:700; }
          .btn.ghost{ background:transparent; color:var(--accent); border:1px solid #e6eefb; }

          select{ padding:8px 10px; border-radius:8px; border:1px solid #e6eefb; background:#fff; font-weight:700; font-size:0.9rem; }

          .muted{ color:var(--muted); }

          .sr-only{ position:absolute !important; height:1px; width:1px; overflow:hidden; clip:rect(1px,1px,1px,1px); white-space:nowrap; }

          @media (max-width: 980px){
            .cards-grid{ grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:24px 14px; }
            .media-and-items{ flex-direction:row; }
            .items-col{ max-height:120px; }
            .media-col{ width:100px; }
          }

          @media (max-width: 680px){
            .cards-grid{ grid-template-columns: 1fr; gap:20px; }
            .media-and-items{ flex-direction:column; }
            .media-col{ width:100%; }
            .items-col{ max-height:110px; }
            .card-top{ flex-direction:row; align-items:flex-start; gap:10px; }
          }

          @media (max-width: 420px){
            .item-thumb{ width:40px; height:40px; }
            select{ padding:6px 8px; font-size:0.86rem; }
          }
        `}</style>
      </div>
    </>
  );
};

export default Orders;