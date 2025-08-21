import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { db } from "../../services/firebase.js";
import { doc, onSnapshot } from "firebase/firestore";
import { getProducts } from "../../services/firebase.js";

const TrackOrder = () => {
  const { user } = useAuth();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemsWithImages, setItemsWithImages] = useState([]);
  const [productsMap, setProductsMap] = useState({});

  // Safely convert different createdAt formats (Firestore Timestamp, number, string)
  const toDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value === "number") return new Date(value);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  useEffect(() => {
    console.log("TrackOrder.jsx: useEffect triggered, user:", user, "orderId:", orderId);
    if (!user) {
      console.log("TrackOrder.jsx: No user logged in, proceeding for testing");
    }

    let mounted = true;
    const orderRef = doc(db, "orders", orderId);

    const loadProducts = async () => {
      try {
        const products = await getProducts();
        const prodMap = {};
        products.forEach((p) => {
          prodMap[p.id] = {
            name: p.name,
            imageData: p.imageData && typeof p.imageData === 'string' && p.imageData.startsWith('data:image/') ? p.imageData : (p.localImageId ? `/images/${p.localImageId}` : '/placeholder.jpg')
          };
        });
        if (mounted) setProductsMap(prodMap);
      } catch (err) {
        console.warn("TrackOrder: getProducts failed", err);
      }
    };

    loadProducts();

    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.log("TrackOrder.jsx: Order not found for ID:", orderId);
          setOrder(null);
          setItemsWithImages([]);
          setLoading(false);
          return;
        }
        const data = snapshot.data();
        if (user && data.userId !== user.uid) {
          console.log("TrackOrder.jsx: Unauthorized access, redirecting to order history");
          navigate("/buyer/order-history");
          return;
        }
        const normalizedOrder = {
          id: snapshot.id,
          ...data,
          items: Array.isArray(data.items) ? data.items.map((it) => ({
            ...it,
            name: it.name || productsMap[it.productId]?.name || 'Product',
            displayImage: it.imageData && typeof it.imageData === 'string' && it.imageData.startsWith('data:image/') ? it.imageData : (it.localImageId ? `/images/${it.localImageId}` : (productsMap[it.productId]?.imageData || '/placeholder.jpg'))
          })) : []
        };
        if (mounted) {
          setOrder(normalizedOrder);
          setItemsWithImages(normalizedOrder.items);
          console.log("TrackOrder.jsx: Order fetched:", normalizedOrder);
          setLoading(false);
        }
      },
      (error) => {
        console.error("TrackOrder.jsx: Error fetching order:", error);
        alert("Failed to load order: " + error.message);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      try {
        unsubscribe();
      } catch (e) {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orderId, navigate]);

  const getTrackingStatus = (status) => {
    switch (status) {
      case "pending":
        return { step: 1, text: "Order Placed" };
      case "accepted":
        return { step: 2, text: "Accepted" };
      case "processing":
        return { step: 3, text: "Processing" };
      case "shipped":
        return { step: 4, text: "Shipped" };
      case "out_for_delivery":
        return { step: 5, text: "Out for Delivery" };
      case "delivered":
        return { step: 6, text: "Delivered" };
      case "rejected":
        return { step: 0, text: "Rejected" };
      case "cancelled":
        return { step: 0, text: "Cancelled" };
      default:
        return { step: 0, text: "Unknown" };
    }
  };

  const trackingSteps = [
    { key: "pending", label: "Order Placed" },
    { key: "accepted", label: "Accepted" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "out_for_delivery", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" }
  ];

  const currentStep = order ? getTrackingStatus(order.status).step : 0;
  const createdAtDate = order ? toDate(order.createdAt) : null;
  const previewImage = itemsWithImages?.[0]?.displayImage || "/placeholder.jpg";

  return (
    <>
      <div className="track-order">
        <div className="page-header">
          <h1>Track Order</h1>
          <div className="order-badge">
            <div className="order-id">#{orderId}</div>
            <div className={`status-pill ${order?.status || "unknown"}`}>{order ? getTrackingStatus(order.status).text : "Loading..."}</div>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading tracking...</div>
        ) : !order ? (
          <div className="not-found">
            <p>Order not found.</p>
            <button onClick={() => navigate("/buyer/order-history")}>Back to Orders</button>
          </div>
        ) : (
          <div className="tracking-layout">
            <aside className="order-summary">
              <div className="summary-top">
                <div className="summary-left">
                  <h2>Order Summary</h2>
                  <p className="muted">Order ID: <strong>{order.id}</strong></p>
                  <p className="muted">Placed: <strong>{createdAtDate ? createdAtDate.toLocaleString() : "N/A"}</strong></p>
                </div>
                <div className="summary-right">
                  <div className="preview-media">
                    <img src={previewImage} alt="Order preview" />
                  </div>
                  <div className="total">Rs. {Number(order.total || 0).toFixed(2)}</div>
                  <div className={`status-compact ${order.status || "unknown"}`}>{order.status || "N/A"}</div>
                </div>
              </div>

              <div className="items-list">
                <h3>Items</h3>
                {itemsWithImages && itemsWithImages.length > 0 ? (
                  itemsWithImages.map((item, i) => (
                    <div className="item-row" key={i}>
                      <div className="item-left">
                        <img className="item-thumb" src={item.displayImage || "/placeholder.jpg"} alt={item.name} onError={(e) => { if (e?.target) e.target.src = "/placeholder.jpg"; }} />
                        <div className="item-info">
                          <div className="item-name">{item.name}</div>
                          <div className="item-meta">Qty: {item.quantity}</div>
                        </div>
                      </div>
                      <div className="item-sub">Rs. {(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No items available</p>
                )}
              </div>

              <div className="address-block">
                <h4>Shipping Address</h4>
                <p className="muted">{order.shippingInfo ? (
                  <>
                    {order.shippingInfo.address}<br />
                    {order.shippingInfo.city} • {order.shippingInfo.postalCode}<br />
                    {order.shippingInfo.country}
                  </>
                ) : "N/A"}</p>
              </div>

              <div className="actions">
                <button className="btn-outline" onClick={() => navigate("/buyer/order-history")}>Back to Orders</button>
                <button className="btn-primary" onClick={() => {
                  // refresh snapshot read by forcing a short reload of order data
                  setLoading(true);
                  // unsubscribe/re-subscribe is handled by Firestore snapshot; quickly toggle loading to indicate refresh
                  setTimeout(() => setLoading(false), 600);
                }}>Refresh</button>
              </div>
            </aside>

            <main className="tracking-main">
              {order.status !== "rejected" && order.status !== "cancelled" ? (
                <>
                  <div className="progress-wrapper">
                    <div className="progress-line" style={{ "--progress": Math.max(0, (currentStep - 1) / (trackingSteps.length - 1)) }} />
                    <div className="steps">
                      {trackingSteps.map((s, idx) => {
                        const stepIndex = idx + 1;
                        const completed = stepIndex <= currentStep;
                        const active = stepIndex === currentStep;
                        const timestampEntry = order.statusHistory?.find(h => {
                          return (h.status === s.key || h.status?.toLowerCase() === s.label.toLowerCase() || (h.status?.replace(/_/g,' ').toLowerCase() === s.label.toLowerCase()));
                        });
                        const tsDate = timestampEntry ? toDate(timestampEntry.timestamp || timestampEntry.time || entry.at) : null;
                        return (
                          <div className={`step-card ${completed ? "completed" : ""} ${active ? "active" : ""}`} key={s.key}>
                            <div className="step-dot">{completed ? "✓" : (active ? <span className="dot-active" /> : <span className="dot" />)}</div>
                            <div className="step-body">
                              <div className="step-title">{s.label}</div>
                              <div className="step-time muted">{tsDate ? tsDate.toLocaleString() : (completed ? "Completed" : "Pending")}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {order.statusHistory && order.statusHistory.length > 0 && (
                    <div className="history-panel">
                      <h3>Status History</h3>
                      <div className="history-list">
                        {order.statusHistory.map((entry, idx) => {
                          const t = toDate(entry.timestamp || entry.time || entry.at);
                          return (
                            <div className="history-item" key={idx}>
                              <div className="history-status">{entry.status?.replace(/_/g, " ")}</div>
                              <div className="history-time muted">{t ? t.toLocaleString() : "N/A"}</div>
                              {entry.note && <div className="history-note">{entry.note}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="cancelled-box">
                  <div className="cancelled-emoji">❌</div>
                  <h2>{order.status === "rejected" ? "Order Rejected" : "Order Cancelled"}</h2>
                  <p className="muted">If you think this is a mistake, contact support.</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      <style jsx>{`
        .track-order {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: calc(100vh - 120px);
          background: linear-gradient(180deg, #f7f9fc 0%, #ffffff 40%);
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }

        /* Allow header to wrap on narrow screens and prevent badge overflow */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        .page-header h1 {
          font-size: 1.6rem;
          margin: 0;
          color: #071327;
          min-width: 0;
        }
        .order-badge {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          min-width: 0;
          flex-shrink: 1;
        }
        .order-id {
          font-weight: 700;
          color: #0b1721;
          background: #fff;
          padding: 0.45rem 0.6rem;
          border-radius: 8px;
          border: 1px solid #eef2f7;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status-pill {
          padding: 0.35rem 0.55rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.9rem;
          color: #fff;
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status-pill.pending { background: linear-gradient(90deg,#ffb020,#ff8a00); }
        .status-pill.accepted { background: linear-gradient(90deg,#59b8ff,#2b8cff); }
        .status-pill.processing { background: linear-gradient(90deg,#7c5cff,#5b3bff); }
        .status-pill.shipped { background: linear-gradient(90deg,#00bfa6,#0aa17a); }
        .status-pill.out_for_delivery { background: linear-gradient(90deg,#f97316,#fb923c); }
        .status-pill.delivered { background: linear-gradient(90deg,#10b981,#059669); }
        .status-pill.rejected, .status-pill.cancelled { background: linear-gradient(90deg,#ef4444,#b91c1c); }
        .status-pill.unknown { background: #6b7280; }

        .loading, .not-found { text-align: center; padding: 2rem; color: #6b7280; }

        /* Layout - keep desktop column widths the same as before but ensure they can shrink */
        .tracking-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 1.25rem;
          align-items: start;
          width: 100%;
        }

        /* Order Summary (left) */
        .order-summary {
          background: #fff;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 8px 24px rgba(11,23,39,0.04);
          border: 1px solid #eef2f7;
          min-width: 0;
        }
        .summary-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .summary-left h2 { margin: 0; font-size: 1.1rem; color: #071327; }
        .muted { color: #6b7280; font-size: 0.95rem; }
        .summary-right { text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:8px; min-width: 0; }
        .preview-media { width:84px; height:84px; border-radius:8px; overflow:hidden; border:1px solid #eef6ff; background:#fff; display:flex; align-items:center; justify-content:center; }
        .preview-media img { width:100%; height:100%; object-fit:cover; display:block; }
        .total { font-size: 1.25rem; font-weight: 800; color: #071327; }
        .status-compact { margin-top: 0.25rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 6px; color: #fff; display: inline-block; font-size: 0.85rem; }
        .status-compact.pending { background: linear-gradient(90deg,#ffb020,#ff8a00); }
        .status-compact.accepted { background: linear-gradient(90deg,#59b8ff,#2b8cff); }
        .status-compact.processing { background: linear-gradient(90deg,#7c5cff,#5b3bff); }
        .status-compact.shipped { background: linear-gradient(90deg,#00bfa6,#0aa17a); }
        .status-compact.out_for_delivery { background: linear-gradient(90deg,#f97316,#fb923c); }
        .status-compact.delivered { background: linear-gradient(90deg,#10b981,#059669); }
        .status-compact.rejected, .status-compact.cancelled { background: linear-gradient(90deg,#ef4444,#b91c1c); }

        .items-list { margin-top: 0.75rem; }
        .item-row { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.6rem; border-radius: 8px; align-items: center; min-width: 0; }
        .item-row + .item-row { margin-top: 0.4rem; }
        .item-left { display:flex; gap:0.75rem; align-items:center; min-width:0; }
        .item-thumb { width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid #eef6ff; background:#fff; flex-shrink:0; }
        .item-info { min-width:0; display:flex; flex-direction:column; gap:4px; overflow:hidden; }
        .item-name { font-weight: 700; color: #071327; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .item-meta { color: #6b7280; font-size:0.9rem; }
        .item-sub { font-weight: 700; color: #071327; min-width:70px; text-align:right; }

        .address-block { margin-top: 1rem; background: linear-gradient(180deg,#fff,#fbfbff); padding: 0.75rem; border-radius: 8px; border: 1px solid #eef2f7; }
        .actions { display:flex; gap: 0.5rem; margin-top: 1rem; }
        .btn-primary { flex:1; background: linear-gradient(90deg,#0bb37a,#0a9d64); color:#fff; border:none; padding:0.6rem; border-radius:8px; cursor:pointer; font-weight:700; }
        .btn-outline { flex:1; background:#fff; border: 1px solid #dbeafe; padding:0.55rem; border-radius:8px; cursor:pointer; font-weight:700; }

        /* Tracking main (right) */
        .tracking-main {
          background: #fff;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 8px 24px rgba(11,23,39,0.04);
          border: 1px solid #eef2f7;
          min-width: 0;
        }

        .progress-wrapper { position: relative; padding: 0.5rem 0 0; }
        .progress-line {
          position: absolute;
          left: 12%;
          right: 12%;
          top: 30px;
          height: 6px;
          background: linear-gradient(90deg,#e6eefb,#f1f8f4);
          border-radius: 6px;
          z-index: 0;
        }
        .steps {
          display: flex;
          justify-content: space-between;
          gap: 0.6rem;
          position: relative;
          z-index: 1;
          padding: 0.6rem 0;
        }
        .step-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          text-align: center;
          gap: 0.5rem;
          padding: 0.4rem;
          transition: transform 160ms ease;
          min-width: 0;
        }
        .step-card .step-dot {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #e6eefb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #6b7280;
          box-shadow: 0 6px 18px rgba(11,23,39,0.03);
        }
        .step-card.completed .step-dot {
          background: linear-gradient(90deg,#10b981,#059669);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 8px 24px rgba(16,185,129,0.18);
        }
        .step-card.active { transform: translateY(-6px); }
        .step-title { font-weight: 700; color: #071327; font-size: 0.95rem; }
        .step-time { color: #6b7280; font-size: 0.85rem; }

        .history-panel { margin-top: 1rem; }
        .history-list { display:flex; flex-direction:column; gap:0.6rem; margin-top:0.5rem; }
        .history-item { background:#f8fafc; padding:0.6rem; border-radius:8px; border:1px solid #eef2f7; }
        .history-status { font-weight:700; color:#071327; }
        .history-note { margin-top:0.45rem; color:#334155; font-size:0.95rem; }

        .cancelled-box { text-align:center; padding:2rem; }
        .cancelled-emoji { font-size:3.6rem; margin-bottom:0.5rem; }

        /* ---------- Responsive tweaks ---------- */

        /* Tablet and narrow desktops: stack layout, make step cards vertical to avoid overflowing horizontally */
        @media (max-width: 880px) {
          .tracking-layout { grid-template-columns: 1fr; }
          .progress-line { display: none; }
          .steps { flex-direction: column; align-items: stretch; gap: 0.6rem; }
          .step-card { flex-direction: row; align-items: center; gap: 1rem; padding: 0.6rem; }
          .step-card .step-dot { width: 44px; height: 44px; border-width: 2px; font-size: 0.9rem; }
          .step-title { text-align: left; font-size: 0.95rem; }
          .step-time { font-size: 0.85rem; }
          .summary-right { align-items:flex-start; text-align:left; }
          .preview-media { width:64px; height:64px; }
          .item-thumb { width:48px; height:48px; }
          .item-sub { min-width:60px; font-size:0.95rem; }
          .status-pill { font-size: 0.85rem; max-width: 160px; }
          .order-id { max-width: 120px; }
          .track-order { padding: 1rem; }
        }

        /* Small phones: reduce sizes further so no horizontal overflow, make buttons full width */
        @media (max-width: 520px) {
          .step-card .step-dot { width: 38px; height: 38px; }
          .step-title { font-size: 0.9rem; }
          .step-time { font-size: 0.8rem; }
          .preview-media { width:56px; height:56px; }
          .item-thumb { width:44px; height:44px; }
          .order-id { font-size: 0.9rem; padding: 0.35rem 0.45rem; max-width: 110px; }
          .status-pill { font-size: 0.8rem; padding: 0.3rem 0.45rem; max-width: 140px; }
          .actions { flex-direction: column; gap: 0.5rem; }
          .btn-primary, .btn-outline { width: 100%; }
          .history-item { padding: 0.5rem; font-size: 0.92rem; }
          .tracking-layout { gap: 0.9rem; }
          .track-order { padding: 0.75rem; }
        }

        /* Very small devices */
        @media (max-width: 420px) {
          .step-card .step-dot { width: 34px; height: 34px; }
          .step-title { font-size: 0.88rem; }
          .item-thumb { width:40px; height:40px; }
          .preview-media { width:48px; height:48px; }
          .order-id { max-width: 90px; }
          .status-pill { max-width: 120px; }
        }
      `}</style>
    </>
  );
};

export default TrackOrder;