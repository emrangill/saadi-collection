import React, { useEffect, useState, useMemo } from "react";
import { getOrders, updateOrder, deleteOrder, getSellerProfile, getProducts } from "../../services/firebase.js";

/*
  Admin Orders page
  - Expanded order view uses a 3-column grid: Items | Buyer (account + checkout) | Sellers + Actions
  - Shows both buyer account profile and checkout/shipping info (robust extraction)
  - Shows seller details (one card per seller)
  - Professional responsive design: 3-cols on desktop, 2-cols on tablet, stacked on small screens
  - Uses getOrders, updateOrder, deleteOrder, getSellerProfile from services/firebase.js
  - Shows paymentStatus and transactionId; allows admin to verify (mark as paid)
*/

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const formatDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleString() : "N/A";
};
const currency = (n) =>
  n == null || isNaN(n) ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];

function getCheckoutInfo(order) {
  const candidates = [
    order.shippingInfo,
    order.shipping,
    order.checkoutInfo,
    order.orderShipping,
    order.deliveryInfo,
    order.checkout,
  ];
  let src = candidates.find((c) => c && typeof c === "object");
  if (!src) {
    src = {
      name: order.shippingName || order.checkoutName || order.customerName || order.name || "",
      phone: order.shippingPhone || order.checkoutPhone || order.phone || order.customerPhone || "",
      address: order.shippingAddress || order.address || order.addr || "",
      city: order.shippingCity || order.city || "",
      postalCode: order.shippingPostalCode || order.postalCode || order.zip || "",
      country: order.shippingCountry || order.country || "",
      notes: order.shippingNotes || order.notes || order.buyerNotes || "",
    };
  } else {
    src = {
      name: src.name || src.fullName || src.recipient || src.contactName || "",
      phone: src.phone || src.contactPhone || src.mobile || src.telephone || "",
      address: src.address || src.line1 || src.street || src.streetAddress || src.addressLine || "",
      city: src.city || src.town || src.locality || "",
      postalCode: src.postalCode || src.postal_code || src.zip || src.zipcode || "",
      country: src.country || src.countryCode || src.country_name || "",
      notes: src.notes || src.instructions || src.delivery_instructions || "",
    };
  }

  Object.keys(src).forEach((k) => {
    if (typeof src[k] === "string") src[k] = src[k].trim();
    if (src[k] === undefined || src[k] === null) src[k] = "";
  });

  const addressParts = [];
  if (src.address) addressParts.push(src.address);
  if (src.city) addressParts.push(src.city);
  if (src.postalCode) addressParts.push(src.postalCode);
  if (src.country) addressParts.push(src.country);
  const fullAddress = addressParts.filter(Boolean).join(", ");

  return {
    name: src.name || "",
    phone: src.phone || "",
    address: src.address || "",
    city: src.city || "",
    postalCode: src.postalCode || "",
    country: src.country || "",
    notes: src.notes || "",
    fullAddress,
    raw: src,
  };
}

const CSVDownload = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv =
    headers.join(",") +
    "\n" +
    rows
      .map((r) =>
        headers
          .map((h) => {
            const val = r[h] === undefined || r[h] === null ? "" : String(r[h]);
            if (val.includes('"') || val.includes(",") || val.includes("\n")) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(",")
      )
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [sellerProfiles, setSellerProfiles] = useState({});
  const [buyerProfiles, setBuyerProfiles] = useState({});
  const [productsMap, setProductsMap] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Toast helpers
  const pushToast = (message, type = "info", ttl = 4200) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setNotifications((s) => [...s, { id, message, type }]);
    setTimeout(() => setNotifications((s) => s.filter((t) => t.id !== id)), ttl);
  };
  const removeToast = (id) => setNotifications((s) => s.filter((t) => t.id !== id));

  // Load orders, profiles, and products
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Fetch products
        const products = (await getProducts()) || [];
        const prodMap = {};
        products.forEach((p) => {
          prodMap[p.id] = {
            name: p.name,
            imageData: p.imageData && typeof p.imageData === 'string' && p.imageData.startsWith('data:image/') ? p.imageData : (p.localImageId ? `/images/${p.localImageId}` : '/placeholder.jpg')
          };
        });
        if (!mounted) return;
        setProductsMap(prodMap);

        // Fetch orders
        const data = await getOrders();
        const normalized = (data || []).map((o) => ({
          ...o,
          id: o.id ?? o.orderId ?? Math.random().toString(36).slice(2, 9),
          createdAt: o.createdAt ?? o.date ?? new Date().toISOString(),
          items: Array.isArray(o.items) ? o.items.map((it) => ({
            ...it,
            name: it.name || prodMap[it.productId]?.name || 'Product',
            displayImage: it.imageData && typeof it.imageData === 'string' && it.imageData.startsWith('data:image/') ? it.imageData : (it.localImageId ? `/images/${it.localImageId}` : (prodMap[it.productId]?.imageData || '/placeholder.jpg'))
          })) : [],
          total:
            o.total ??
            o.amount ??
            (Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0) : 0),
        }));
        if (!mounted) return;
        setOrders(normalized);

        // Gather unique seller/buyer ids
        const sellerIds = new Set();
        const buyerIds = new Set();
        normalized.forEach((o) => {
          (o.sellerIds || []).forEach((s) => s && sellerIds.add(s));
          if (o.userId) buyerIds.add(o.userId);
        });

        const sellersToFetch = Array.from(sellerIds).filter((id) => id && sellerProfiles[id] === undefined);
        const buyersToFetch = Array.from(buyerIds).filter((id) => id && buyerProfiles[id] === undefined);

        const sellerPromises = sellersToFetch.map((id) =>
          getSellerProfile(id).then((p) => ({ id, p })).catch(() => ({ id, p: null }))
        );
        const buyerPromises = buyersToFetch.map((id) =>
          getSellerProfile(id).then((p) => ({ id, p })).catch(() => ({ id, p: null }))
        );

        const [sellerResults, buyerResults] = await Promise.all([Promise.all(sellerPromises), Promise.all(buyerPromises)]);
        setSellerProfiles((prev) => {
          const next = { ...prev };
          sellerResults.forEach(({ id, p }) => (next[id] = p || null));
          return next;
        });
        setBuyerProfiles((prev) => {
          const next = { ...prev };
          buyerResults.forEach(({ id, p }) => (next[id] = p || null));
          return next;
        });
      } catch (err) {
        console.error("Orders: fetch error", err);
        pushToast("Failed to load orders (see console).", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When orders change, fetch missing profiles if any
  useEffect(() => {
    const missingSellers = new Set();
    const missingBuyers = new Set();
    orders.forEach((o) => {
      (o.sellerIds || []).forEach((sid) => {
        if (sid && sellerProfiles[sid] === undefined) missingSellers.add(sid);
      });
      if (o.userId && buyerProfiles[o.userId] === undefined) missingBuyers.add(o.userId);
    });
    if (missingSellers.size === 0 && missingBuyers.size === 0) return;

    let mounted = true;
    (async () => {
      try {
        const sellerFetch = await Promise.all(
          Array.from(missingSellers).map((id) => getSellerProfile(id).then((p) => ({ id, p })).catch(() => ({ id, p: null })))
        );
        const buyerFetch = await Promise.all(
          Array.from(missingBuyers).map((id) => getSellerProfile(id).then((p) => ({ id, p })).catch(() => ({ id, p: null })))
        );
        if (!mounted) return;
        setSellerProfiles((prev) => {
          const next = { ...prev };
          sellerFetch.forEach(({ id, p }) => (next[id] = p || null));
          return next;
        });
        setBuyerProfiles((prev) => {
          const next = { ...prev };
          buyerFetch.forEach(({ id, p }) => (next[id] = p || null));
          return next;
        });
      } catch (err) {
        console.warn("Profile fetch error", err);
      }
    })();
    return () => (mounted = false);
  }, [orders, sellerProfiles, buyerProfiles]);

  const sellersList = useMemo(() => {
    const s = new Set();
    orders.forEach((o) => {
      (o.sellerIds || []).forEach((sid) => {
        const name = sellerProfiles[sid]?.name ?? sid;
        s.add(name);
      });
    });
    return ["all", ...Array.from(s)];
  }, [orders, sellerProfiles]);

  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        if (statusFilter !== "all" && (o.status || "pending") !== statusFilter) return false;
        if (sellerFilter !== "all") {
          const sellerNames = (o.sellerIds || []).map((sid) => sellerProfiles[sid]?.name ?? sid);
          if (!sellerNames.includes(sellerFilter)) return false;
        }
        if (dateFrom) {
          const d = new Date(dateFrom);
          const od = toDate(o.createdAt) || new Date(o.createdAt);
          if (!od || od < d) return false;
        }
        if (dateTo) {
          const d = new Date(dateTo);
          const od = toDate(o.createdAt) || new Date(o.createdAt);
          if (!od || od > new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          const inOrderId = String(o.id || "").toLowerCase().includes(q);
          const inName = String(o.customerName || o.name || buyerProfiles[o.userId]?.name || "").toLowerCase().includes(q);
          const inEmail = String(o.customerEmail || o.email || buyerProfiles[o.userId]?.email || "").toLowerCase().includes(q);
          const inItems = (o.items || []).some(
            (it) => (it.name || "").toLowerCase().includes(q) || (it.sku || "").toLowerCase().includes(q)
          );
          if (!(inOrderId || inName || inEmail || inItems)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = toDate(a.createdAt) || new Date(0);
        const db = toDate(b.createdAt) || new Date(0);
        return db - da;
      });
  }, [orders, statusFilter, sellerFilter, dateFrom, dateTo, search, buyerProfiles, sellerProfiles]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageOrders = filtered.slice((page - 1) * pageSize, page * pageSize);

  const summary = useMemo(() => {
    const totalOrders = filtered.length;
    const totalRevenue = filtered.reduce((s, o) => s + (o.total || 0), 0);
    const byStatus = {};
    STATUSES.forEach((st) => (byStatus[st] = 0));
    filtered.forEach((o) => {
      const st = o.status || "pending";
      byStatus[st] = (byStatus[st] || 0) + 1;
    });
    return { totalOrders, totalRevenue, byStatus };
  }, [filtered]);

  const setActionFor = (id, val) => setActionLoading((s) => ({ ...s, [id]: val }));
  const changeOrderStatus = async (orderId, newStatus) => {
    const prev = orders.slice();
    setActionFor(orderId, "updating");
    setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    try {
      if (typeof updateOrder === "function") {
        await updateOrder(orderId, { status: newStatus });
      }
      pushToast(`Order ${orderId} updated to ${newStatus}`, "success");
    } catch (err) {
      console.error("changeOrderStatus error", err);
      setOrders(prev);
      pushToast("Failed to update order (see console).", "error");
    } finally {
      setActionFor(orderId, null);
    }
  };
  const removeOrder = async (orderId) => {
    if (!window.confirm("Delete this order? This action cannot be undone.")) return;
    const prev = orders.slice();
    setActionFor(orderId, "deleting");
    setOrders((list) => list.filter((o) => o.id !== orderId));
    try {
      if (typeof deleteOrder === "function") {
        await deleteOrder(orderId);
      }
      pushToast("Order deleted", "success");
    } catch (err) {
      console.error("removeOrder error", err);
      setOrders(prev);
      pushToast("Failed to delete order (see console).", "error");
    } finally {
      setActionFor(orderId, null);
    }
  };

  // exports & invoice
  const exportOrdersCSV = () => {
    const rows = filtered.map((o) => {
      const ch = getCheckoutInfo(o);
      return {
        id: o.id,
        status: o.status || "pending",
        payment_status: o.paymentStatus || "pending",
        transaction_id: o.payment?.transactionId || o.transactionId || "",
        account_name: buyerProfiles[o.userId]?.name || "",
        order_name: ch.name || "",
        email_on_order: o.customerEmail || o.email || "",
        phone_on_order: ch.phone || "",
        shipping_address: ch.fullAddress || "",
        sellers: (o.sellerIds || []).map((sid) => sellerProfiles[sid]?.name || sid).join(" | "),
        total: o.total,
        createdAt: formatDate(o.createdAt),
        items: (o.items || []).map((it) => `${it.name} x${it.quantity || 1}`).join(" | "),
      };
    });
    CSVDownload(`orders_export_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const openInvoice = (order) => {
    const ch = getCheckoutInfo(order);
    const html = `
      <html>
        <head><title>Invoice ${order.id}</title>
          <style>
            body{font-family:Inter, Arial, sans-serif;padding:22px;color:#111}
            h1{font-size:18px;margin-bottom:8px}
            .muted{color:#666;font-size:13px}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}
            .total{font-weight:800}
            .thumb-wrap{width:48px;height:48px;border-radius:8px;overflow:hidden;border:1px solid #eee;display:inline-block}
            .thumb-wrap img{width:100%;height:100%;object-fit:cover}
          </style>
        </head>
        <body>
          <h1>Invoice — Order ${order.id}</h1>
          <div class="muted">Date: ${formatDate(order.createdAt)}</div>
          <div style="margin-top:12px;">
            <strong>Account name:</strong> ${buyerProfiles[order.userId]?.name || "—"}<br/>
            <strong>Checkout name:</strong> ${ch.name || "—"}<br/>
            <strong>Email:</strong> ${order.customerEmail || order.email || "—"}<br/>
            <strong>Phone:</strong> ${ch.phone || "—"}<br/>
            <strong>Address:</strong> ${ch.fullAddress || "—"}
          </div>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${(order.items || [])
                .map(
                  (it) =>
                    `<tr><td>${it.name || "Item"}<br/><div class="thumb-wrap"><img src="${it.displayImage}" onerror="this.src='/placeholder.jpg'"/></div></td><td>${it.quantity || 1}</td><td>${currency(it.price)}</td><td>${currency(
                      (it.price || 0) * (it.quantity || 1)
                    )}</td></tr>`
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr><td colspan="3" class="total">Total</td><td class="total">${currency(order.total)}</td></tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) {
      pushToast("Popup blocked. Allow popups to open invoice.", "warning");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  useEffect(() => {
    setExpandedOrderId(null);
    setPage(1);
  }, [statusFilter, sellerFilter, dateFrom, dateTo, search, pageSize]);

  return (
    <>
      <div className="orders-page" role="region" aria-label="Admin orders">
        <header className="topbar">
          <div className="title">
            <h1>Orders</h1>
            <p className="subtitle">Detailed admin view — items, buyer (account + checkout) and sellers side-by-side.</p>
          </div>

          <div className="kpis" aria-hidden>
            <div className="kpi"><div className="num">{summary.totalOrders}</div><div className="lab">Orders</div></div>
            <div className="kpi"><div className="num">{currency(summary.totalRevenue)}</div><div className="lab">Revenue</div></div>
            <div className="kpi small"><div className="num">{summary.byStatus.pending || 0}</div><div className="lab">Pending</div></div>
          </div>
        </header>

        <section className="controls">
          <div className="filters">
            <input className="search" placeholder="Search order id, customer or item..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>

            <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}>
              {sellersList.map((s) => <option key={s} value={s}>{s === "all" ? "All sellers" : s}</option>)}
            </select>

            <label className="date"><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label className="date"><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
          </div>

          <div className="actions">
            <button className="btn ghost" onClick={() => { setSearch(""); setStatusFilter("all"); setSellerFilter("all"); setDateFrom(""); setDateTo(""); }}>Reset</button>
            <button className="btn" onClick={exportOrdersCSV}>Export CSV</button>
            <button className="btn ghost" onClick={exportOrdersCSV}>Report</button>
            <button className="btn primary" onClick={() => { 
              setLoading(true); 
              Promise.all([getOrders(), getProducts()])
                .then(([orders, products]) => {
                  const prodMap = {};
                  products.forEach((p) => {
                    prodMap[p.id] = {
                      name: p.name,
                      imageData: p.imageData && typeof p.imageData === 'string' && p.imageData.startsWith('data:image/') ? p.imageData : (p.localImageId ? `/images/${p.localImageId}` : '/placeholder.jpg')
                    };
                  });
                  const normalized = (orders || []).map((o) => ({
                    ...o,
                    id: o.id ?? o.orderId ?? Math.random().toString(36).slice(2, 9),
                    createdAt: o.createdAt ?? o.date ?? new Date().toISOString(),
                    items: Array.isArray(o.items) ? o.items.map((it) => ({
                      ...it,
                      name: it.name || prodMap[it.productId]?.name || 'Product',
                      displayImage: it.imageData && typeof it.imageData === 'string' && it.imageData.startsWith('data:image/') ? it.imageData : (it.localImageId ? `/images/${it.localImageId}` : (prodMap[it.productId]?.imageData || '/placeholder.jpg'))
                    })) : [],
                    total: o.total ?? o.amount ?? (Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0) : 0),
                  }));
                  setOrders(normalized);
                  setProductsMap(prodMap);
                  pushToast("Refreshed", "success");
                })
                .catch(() => pushToast("Refresh failed", "error"))
                .finally(() => setLoading(false));
            }}>Refresh</button>
          </div>
        </section>

        <main className="orders-list" role="list">
          {loading ? (
            <div className="empty">Loading orders...</div>
          ) : pageOrders.length === 0 ? (
            <div className="empty">No orders found for current filters.</div>
          ) : (
            pageOrders.map((order) => {
              const expanded = expandedOrderId === order.id;
              const accountBuyer = buyerProfiles[order.userId] || null;
              const checkout = getCheckoutInfo(order);

              return (
                <article key={order.id} className={`order-card ${expanded ? "expanded" : ""}`} onClick={() => setExpandedOrderId(expanded ? null : order.id)} role="listitem" tabIndex={0}>
                  <div className="order-top">
                    <div className="left">
                      <div className="id">#{order.id}</div>
                      <div className="customer">{checkout.name || accountBuyer?.name || order.customerName || "Guest"}</div>
                      <div className="email">{order.customerEmail || accountBuyer?.email || ""}</div>
                    </div>

                    <div className="center">
                      <div className="amount">{currency(order.total)}</div>
                      <div className={`status ${order.status || "pending"}`}>{(order.status || "pending").toUpperCase()}</div>
                    </div>

                    <div className="right">
                      <div className="date">{formatDate(order.createdAt)}</div>
                      <div className="chev" aria-hidden>{expanded ? "▴" : "▾"}</div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="order-expanded" onClick={(e) => e.stopPropagation()}>
                      {/* GRID: items | buyer combined | sellers & actions */}
                      <div className="items-panel">
                        <h4 className="section-title">Items</h4>
                        <div className="items">
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} className="item-row">
                              <div className="item-thumb">
                                <img
                                  src={it.displayImage}
                                  alt={it.name || "Item"}
                                  onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                                  loading="lazy"
                                />
                              </div>
                              <div className="item-left">
                                <div className="item-name">{it.name}</div>
                                {it.description && <div className="item-desc">{it.description}</div>}
                              </div>
                              <div className="item-meta">
                                <div>Qty: <strong>{it.quantity || 1}</strong></div>
                                <div>{currency(it.price)}</div>
                                <div className="sub">{currency((it.price || 0) * (it.quantity || 1))}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="buyer-panel">
                        <h4 className="section-title">Buyer — Account & Checkout</h4>

                        <div className="buyer-grid">
                          <div className="card small">
                            <div className="card-head">
                              <div className="avatar">{(accountBuyer?.name || checkout.name || "U").charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="card-title">Account</div>
                                <div className="card-sub">{accountBuyer?.name || "—"}</div>
                              </div>
                            </div>
                            <div className="card-body">
                              <div className="row"><strong>Email:</strong> {accountBuyer?.email || "—"}</div>
                              <div className="row"><strong>Phone:</strong> {accountBuyer?.phone || "—"}</div>
                              {accountBuyer?.createdAt && <div className="row"><strong>Member since:</strong> {formatDate(accountBuyer.createdAt)}</div>}
                            </div>
                          </div>

                          <div className="card small">
                            <div className="card-head">
                              <div className="avatar alt">{(checkout.name || "O").charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="card-title">Checkout (on order)</div>
                                <div className="card-sub">{checkout.name || "—"}</div>
                              </div>
                            </div>
                            <div className="card-body">
                              <div className="row"><strong>Email (order):</strong> {order.customerEmail || order.email || "—"}</div>
                              <div className="row"><strong>Phone (order):</strong> {checkout.phone || "—"}</div>
                              <div className="row"><strong>Address:</strong> {checkout.fullAddress || "—"}</div>
                              {checkout.notes && <div className="row"><strong>Notes:</strong> {checkout.notes}</div>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <aside className="sellers-panel">
                        <div className="card headless">
                          <div className="card-head">
                            <div>
                              <div className="card-title">Sellers in this order</div>
                              <div className="card-sub small muted">{(order.sellerIds || []).length} seller(s)</div>
                            </div>
                          </div>

                          <div className="sellers-list">
                            {(order.sellerIds || []).map((sid) => {
                              const s = sellerProfiles[sid] || null;
                              return (
                                <div key={sid} className="seller-row">
                                  <div className="s-left">
                                    <div className="s-avatar">{(s?.name || sid || "S").charAt(0).toUpperCase()}</div>
                                    <div>
                                      <div className="s-name">{s?.name || sid}</div>
                                      {s?.shopName && <div className="s-shop">{s.shopName}</div>}
                                    </div>
                                  </div>
                                  <div className="s-meta">
                                    <div className="s-email">{s?.email || "—"}</div>
                                    <div className="s-phone">{s?.phone || "—"}</div>
                                  </div>
                                </div>
                              );
                            })}
                            {(order.sellerIds || []).length === 0 && <div className="muted">No sellers listed on this order.</div>}
                          </div>
                        </div>

                        <div className="card actions">
                          <div className="row"><strong>Order total:</strong> {currency(order.total)}</div>
                          <div className="row"><strong>Created:</strong> {formatDate(order.createdAt)}</div>
                          <div className="row"><strong>Easypaisa Txn ID:</strong> {order.payment?.transactionId || order.transactionId || "—"}</div>
                          <div className="row"><strong>Payment Status:</strong> <span style={{color: order.paymentStatus === "paid" ? "green" : "#f59e0b"}}>{order.paymentStatus || "pending"}</span></div>
                          <div className="controls">
                            {order.paymentStatus !== "paid" && (
                              <button
                                className="btn primary"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setActionLoading((a) => ({ ...a, [order.id]: true }));
                                  await updateOrder(order.id, { paymentStatus: "paid" });
                                  setOrders((os) => os.map((o) => o.id === order.id ? { ...o, paymentStatus: "paid" } : o));
                                  setActionLoading((a) => ({ ...a, [order.id]: false }));
                                  pushToast(`Order ${order.id} marked as paid`, "success");
                                }}
                                disabled={!!actionLoading[order.id]}
                              >
                                Mark Payment Paid
                              </button>
                            )}
                            <select value={order.status || "pending"} onChange={(e) => changeOrderStatus(order.id, e.target.value)} disabled={!!actionLoading[order.id]}>
                              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                            </select>
                            <button className="btn ghost" onClick={(e) => { e.stopPropagation(); openInvoice(order); }}>Invoice</button>
                            <button className="btn danger" onClick={(e) => { e.stopPropagation(); removeOrder(order.id); }}>Delete</button>
                          </div>
                        </div>
                      </aside>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </main>

        <footer className="pagination">
          <div className="left">
            <label>Page size
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 40, 80].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <div className="center">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
            <span>Page {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
          </div>

          <div className="right">
            <div className="muted">{filtered.length} orders matched</div>
          </div>
        </footer>
      </div>

      {/* toasts */}
      <div className="toasts" aria-live="polite">
        {notifications.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="msg">{t.message}</div>
            <button className="close" onClick={() => removeToast(t.id)}>×</button>
          </div>
        ))}
      </div>

      <style jsx>{`
        :root{
          --bg: #f7fbff;
          --card: #ffffff;
          --muted: #6b7280;
          --text: #071130;
          --accent-1: #4f46e5;
          --accent-2: #06b6d4;
          --success: #10b981;
          --danger: #ef4444;
        }
        *{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial}
        html,body,#root{overflow-x:hidden}
        .orders-page{padding:20px;background:linear-gradient(180deg,var(--bg),#eef6ff);min-height:100vh}

        .topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:12px}
        .title h1{margin:0;font-size:1.4rem;color:var(--text)}
        .subtitle{margin:6px 0 0;color:var(--muted)}

        .kpis{display:flex;gap:10px;align-items:center}
        .kpi{background:var(--card);padding:10px 12px;border-radius:10px;box-shadow:0 10px 28px rgba(11,20,40,0.04);text-align:center;min-width:100px}
        .kpi .num{font-weight:800}
        .kpi .lab{color:var(--muted);font-size:0.85rem}

        .controls{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        .filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .search{padding:9px 12px;border-radius:10px;border:1px solid rgba(11,20,40,0.06);min-width:220px}
        .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .btn{padding:8px 12px;border-radius:10px;background:var(--card);border:1px solid rgba(11,20,40,0.06);cursor:pointer;font-weight:700}
        .btn.primary{background:linear-gradient(90deg,var(--accent-1),var(--accent-2));color:#fff;border:none;box-shadow:0 10px 30px rgba(79,70,229,0.12)}
        .btn.ghost{background:transparent;border:1px solid rgba(11,20,40,0.06)}
        .btn.danger{background:linear-gradient(90deg,#ef4444,#c026d3);color:#fff;border:none}

        .orders-list{display:flex;flex-direction:column;gap:12px}
        .empty{padding:16px;background:var(--card);border-radius:12px;text-align:center;color:var(--muted);box-shadow:0 10px 28px rgba(11,20,40,0.04)}

        .order-card{background:linear-gradient(180deg,var(--card),#fbfdff);border-radius:14px;padding:12px;border:1px solid rgba(11,20,40,0.03);box-shadow:0 12px 36px rgba(11,20,40,0.04);cursor:pointer;transition:transform 160ms ease}
        .order-card:hover{transform:translateY(-4px)}
        .order-top{display:flex;align-items:center;gap:12px}
        .order-top .left{flex:0 0 40%;min-width:0}
        .order-top .center{flex:1;text-align:center}
        .order-top .right{flex:0 0 200px;text-align:right}
        .id{font-weight:800;color:var(--text)}
        .customer{color:var(--muted);font-weight:700}
        .email{color:var(--muted);font-size:0.9rem}
        .amount{font-weight:900;font-size:1.05rem}
        .status{display:inline-block;padding:6px 10px;border-radius:999px;color:white;font-weight:800}
        .status.pending{background:#f59e0b}
        .status.processing{background:#0ea5a0}
        .status.shipped{background:#2563eb}
        .status.delivered{background:var(--success)}
        .status.cancelled{background:#ef4444}
        .chev{font-size:14px;color:var(--muted)}

        /* Expanded grid */
        .order-expanded{display:grid;grid-template-columns: 1fr 420px 320px;gap:18px;padding-top:14px;align-items:start}
        .items-panel{min-width:0}
        .buyer-panel{min-width:0}
        .sellers-panel{min-width:0}

        .section-title{margin:0 0 8px 0;font-size:0.95rem;color:var(--text);font-weight:800}
        .items{display:flex;flex-direction:column;gap:10px}
        .item-row{display:flex;gap:12px;padding:10px;border-radius:10px;background:linear-gradient(180deg,#fff,#fbfdff);border:1px solid rgba(11,20,40,0.03);align-items:center}
        .item-thumb{width:48px;height:48px;border-radius:8px;overflow:hidden;border:1px solid #eee;flex-shrink:0}
        .item-thumb img{width:100%;height:100%;object-fit:cover}
        .item-left{flex:1;min-width:0}
        .item-name{font-weight:800;color:var(--text)}
        .item-desc{color:var(--muted);font-size:0.92rem}
        .item-meta{display:flex;gap:12px;align-items:center;color:var(--muted);min-width:160px;justify-content:flex-end}
        .item-meta .sub{font-weight:800;color:var(--text)}

        .buyer-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .card{background:var(--card);border-radius:12px;padding:12px;border:1px solid rgba(11,20,40,0.04);box-shadow:0 10px 30px rgba(11,20,40,0.04)}
        .card.small{padding:10px}
        .card-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .avatar{width:44px;height:44px;border-radius:10px;background:linear-gradient(90deg,var(--accent-2),var(--accent-1));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}
        .avatar.alt{background:linear-gradient(90deg,#06b6d4,#4f46e5)}
        .card-title{font-weight:800}
        .card-sub{color:var(--muted);font-size:0.92rem}
        .card-body .row{margin:6px 0;color:#374151;word-break:break-word}

        .sellers-list{display:flex;flex-direction:column;gap:8px}
        .seller-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px;border-radius:8px;border:1px solid rgba(11,20,40,0.02);background:linear-gradient(180deg,#fff,#fbfdff)}
        .s-left{display:flex;gap:10px;align-items:center}
        .s-avatar{width:36px;height:36px;border-radius:8px;background:#eef2ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-weight:800}
        .s-name{font-weight:800}
        .s-shop{color:var(--muted);font-size:0.9rem}
        .s-meta{text-align:right;color:var(--muted);font-size:0.9rem}

        .card.actions .controls{display:flex;gap:8px;align-items:center;margin-top:10px}
        .card.actions select{min-width:140px;padding:8px;border-radius:8px}
        .card.actions .btn{padding:8px 10px}

        .pagination{display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:12px;flex-wrap:wrap}
        .pagination .center{display:flex;gap:8px;align-items:center}
        .muted{color:var(--muted)}

        /* Responsive: 2 columns on medium screens, stacked on narrow screens */
        @media (max-width: 1200px) {
          .order-expanded{grid-template-columns: 1fr 360px; grid-auto-rows: auto}
          .sellers-panel{order:3}
        }
        @media (max-width: 880px) {
          .order-top{flex-direction:column;align-items:flex-start;gap:8px}
          .order-expanded{grid-template-columns: 1fr;gap:12px}
          .order-top .right{text-align:left}
        }
        @media (max-width: 560px) {
          .search{min-width:140px}
          .item-desc{max-width:100%}
          .item-row{flex-wrap:wrap}
          .item-meta{flex:0 0 100%;justify-content:flex-start}
        }
      `}</style>
    </>
  );
}

/* helpers */
function computeTotalFromItems(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
}