import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import { addOrder } from '../../services/firebase.js';
import { getImageUrl } from '../../utils/localImageStore.js';
import { getDoc, doc as fsDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.js';

// JazzCash Admin Account Details (replace with actual)
const ADMIN_JAZZCASH_ACCOUNT = "03409751709"; // replace with real JazzCash number

const Checkout = () => {
  const { user } = useAuth();
  const { cart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [amountToPay, setAmountToPay] = useState(0);

  // Resolved cart items with displayImage (object URLs or remote URLs)
  const [itemsWithImages, setItemsWithImages] = useState([]);
  const createdObjectUrls = useRef(new Set());

  const normalizeCart = (rawCart) => {
    if (!rawCart) return [];
    if (Array.isArray(rawCart)) return rawCart;
    if (typeof rawCart === 'object') return Object.values(rawCart);
    return [];
  };

  const revokeAll = () => {
    createdObjectUrls.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    createdObjectUrls.current.clear();
  };

  const isSafeUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return /^data:|^https?:\/\//i.test(url);
  };

  const resolveSingleItemImage = async (item) => {
    const copy = { ...item };

    if (copy.displayImage && isSafeUrl(copy.displayImage)) {
      return copy;
    }
    if (copy.imageUrl && isSafeUrl(copy.imageUrl)) {
      copy.displayImage = copy.imageUrl;
      return copy;
    }
    if (copy.image && isSafeUrl(copy.image)) {
      copy.displayImage = copy.image;
      return copy;
    }

    if (copy.localImageId) {
      try {
        const res = await getImageUrl(copy.localImageId);
        if (res) {
          if (typeof res === 'string') {
            if (res.startsWith('blob:')) {
              createdObjectUrls.current.add(res);
              copy.displayImage = res;
            } else {
              copy.displayImage = res;
            }
          } else if (res instanceof Blob) {
            const url = URL.createObjectURL(res);
            createdObjectUrls.current.add(url);
            copy.displayImage = url;
          } else if (res.url) {
            copy.displayImage = res.url;
          } else {
            copy.displayImage = '/placeholder.jpg';
          }
          return copy;
        }
      } catch (err) {
        // ignore error
      }
    }

    const productId = copy.productId || copy.id;
    if (productId) {
      try {
        const prodSnap = await getDoc(fsDoc(db, 'products', String(productId)));
        if (prodSnap.exists()) {
          const pd = prodSnap.data();
          if (pd.imageUrl && isSafeUrl(pd.imageUrl)) {
            copy.displayImage = pd.imageUrl;
            return copy;
          }
          if (pd.image && isSafeUrl(pd.image)) {
            copy.displayImage = pd.image;
            return copy;
          }
          if (pd.localImageId) {
            try {
              const res = await getImageUrl(pd.localImageId);
              if (res) {
                if (typeof res === 'string') {
                  if (res.startsWith('blob:')) {
                    createdObjectUrls.current.add(res);
                    copy.displayImage = res;
                  } else {
                    copy.displayImage = res;
                  }
                } else if (res instanceof Blob) {
                  const url = URL.createObjectURL(res);
                  createdObjectUrls.current.add(url);
                  copy.displayImage = url;
                } else if (res.url) {
                  copy.displayImage = res.url;
                } else {
                  copy.displayImage = '/placeholder.jpg';
                }
                return copy;
              }
            } catch (err) {}
          }
        }
      } catch (err) {}
    }

    copy.displayImage = '/placeholder.jpg';
    return copy;
  };

  useEffect(() => {
    if (user) {
      setShippingInfo((prev) => ({
        ...prev,
        name: prev.name || user.displayName || '',
        phone: prev.phone || (user.phoneNumber || '')
      }));
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      revokeAll();
      const items = normalizeCart(cart);
      if (!items || items.length === 0) {
        if (mounted) setItemsWithImages([]);
        return;
      }
      try {
        const resolved = await Promise.all(items.map((it) => resolveSingleItemImage(it)));
        if (mounted) setItemsWithImages(resolved);
      } catch (err) {
        if (mounted) setItemsWithImages(items.map((c) => ({ ...c, displayImage: isSafeUrl(c.displayImage) ? c.displayImage : (c.imageUrl || c.image || '/placeholder.jpg') })));
      }
    };
    resolve();
    return () => {
      mounted = false;
      revokeAll();
    };
  }, [cart]);

  useEffect(() => {
    setAmountToPay(calculateTotal());
  }, [cart]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo((prev) => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    const items = normalizeCart(cart);
    return (items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0)).toFixed(2);
  };

  // Buyer enters JazzCash transaction id and places order
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    const items = normalizeCart(cart);
    if (items.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || !shippingInfo.city || !shippingInfo.postalCode || !shippingInfo.country) {
      alert('Please fill in all shipping details including your name and phone number.');
      return;
    }
    if (!transactionId || transactionId.length < 8) {
      alert('Please enter a valid JazzCash Transaction ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orderItems = await Promise.all(items.map(async (item) => {
        const pid = item.productId || item.id;
        let sellerId = item.sellerId ?? item.vendorId ?? null;
        if (!sellerId && pid) {
          try {
            const prodSnap = await getDoc(fsDoc(db, 'products', String(pid)));
            if (prodSnap.exists()) {
              const pd = prodSnap.data();
              sellerId = pd.sellerId ?? pd.vendorId ?? null;
            }
          } catch (err) {}
        }
        if (!sellerId) {
          throw new Error(`Missing sellerId for product: ${item.name || pid}`);
        }
        return {
          productId: pid,
          sellerId,
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1)
        };
      }));

      const total = parseFloat(calculateTotal());
      const shipping = { ...shippingInfo };

      // PAYMENT STATUS is always pending, admin will verify
      await addOrder(
        user.uid,
        orderItems,
        total,
        user.email,
        shipping,
        {
          paymentMethod: 'Easypaisa',
          paymentStatus: 'pending', // Always pending when order is placed
          transactionId
        }
      );

      clearCart();
      alert('Order placed! Your payment will be verified by admin.');
      navigate('/buyer/order-history');
    } catch (err) {
      setError('Failed to place order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="error">
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="checkout-page">
        <h1>Checkout</h1>
        <div className="checkout-container">
          <div className="order-summary">
            <h2>Order Summary</h2>
            {normalizeCart(cart).length === 0 ? (
              <p className="empty">Your cart is empty.</p>
            ) : (
              <>
                <div className="items-list">
                  {itemsWithImages.map((item) => (
                    <div key={item.id || item.productId} className="order-item">
                      <div className="thumb">
                        <img
                          src={item.displayImage || '/placeholder.jpg'}
                          alt={item.name}
                          onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                        />
                      </div>
                      <div className="item-details">
                        <p className="item-name">{item.name}</p>
                        <p className="item-meta">Qty: {item.quantity} · Rs. {Number(item.price).toFixed(2)}</p>
                        <p className="item-sub">Subtotal: Rs. {(Number(item.price) * Number(item.quantity)).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="summary-box">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>Rs. {calculateTotal()}</span>
                  </div>
                  <div className="summary-row total">
                    <strong>Total</strong>
                    <strong>Rs. {calculateTotal()}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="shipping-form">
            <h2>Shipping Information</h2>
            <form onSubmit={handleCheckout}>
              <div className="input-group">
                <label htmlFor="name">Full name</label>
                <input id="name" type="text" name="name" value={shippingInfo.name} onChange={handleInputChange} placeholder="Full name" required />
              </div>
              <div className="input-group">
                <label htmlFor="phone">Contact number</label>
                <input id="phone" type="text" name="phone" value={shippingInfo.phone} onChange={handleInputChange} placeholder="Phone number" required />
              </div>
              <div className="input-group">
                <label htmlFor="address">Address</label>
                <input id="address" type="text" name="address" value={shippingInfo.address} onChange={handleInputChange} placeholder="Enter your address" required />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label htmlFor="city">City</label>
                  <input id="city" type="text" name="city" value={shippingInfo.city} onChange={handleInputChange} placeholder="City" required />
                </div>
                <div className="input-group">
                  <label htmlFor="postalCode">Postal Code</label>
                  <input id="postalCode" type="text" name="postalCode" value={shippingInfo.postalCode} onChange={handleInputChange} placeholder="Postal Code" required />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="country">Country</label>
                <input id="country" type="text" name="country" value={shippingInfo.country} onChange={handleInputChange} placeholder="Country" required />
              </div>
              <h2 style={{marginTop:"2rem"}}>Payment Method</h2>
              <div className="payment-method-box">
                <p>
                  <strong>JazzCash (Direct to Admin)</strong><br/>
                  Please pay <b>Rs. {amountToPay}</b> to JazzCash Account: <span className="jazzcash-account">{ADMIN_JAZZCASH_ACCOUNT}</span>
                </p>
                <label htmlFor="transactionId">JazzCash Transaction ID (after payment):</label>
                <input
                  id="transactionId"
                  name="transactionId"
                  type="text"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="Enter JazzCash Transaction ID"
                  required
                />
                <div className="payment-status payment-status-pending">
                  Status: Pending (Admin will verify)
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || normalizeCart(cart).length === 0}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style jsx>{`
        .checkout-page { padding: 2rem; max-width: 1200px; margin: 0 auto; min-height: calc(100vh - 120px); background: linear-gradient(180deg,#f7fafc 0%,#fff 60%); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
        h1 { font-size: 2rem; color: #0b1721; text-align: center; margin-bottom: 1.5rem; }
        .checkout-container { display: grid; grid-template-columns: 1fr 420px; gap: 2rem; align-items: start; }
        .order-summary, .shipping-form { background: #fff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 8px 24px rgba(11,23,39,0.06); }
        .items-list { display:flex; flex-direction:column; gap:0.75rem; max-height:420px; overflow:auto; padding-right:8px; }
        .order-item { display:flex; gap:0.75rem; align-items:center; padding:0.6rem; border-radius:10px; transition:background 0.15s ease; }
        .thumb { width:84px; height:84px; border-radius:8px; overflow:hidden; flex:0 0 84px; display:flex; align-items:center; justify-content:center; background:#f6f7fb; border:1px solid #eef2f7; }
        .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .item-details { flex:1; min-width:0; }
        .item-name { margin:0 0 0.25rem 0; font-weight:700; color:#0b1721; font-size:0.98rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .item-meta { margin:0; color:#6b7280; font-size:0.86rem; }
        .item-sub { margin:0.25rem 0 0 0; color:#0b1721; font-weight:700; font-size:0.95rem; }
        .summary-box { margin-top: 1rem; padding: 0.9rem; border-radius: 10px; background: linear-gradient(180deg,#ffffff,#fbfbff); border: 1px solid #eef2f7; }
        .summary-row { display:flex; justify-content:space-between; color:#475569; padding: 0.25rem 0; }
        .summary-row.total { margin-top: 0.6rem; font-size: 1.05rem; color: #071327; }
        .shipping-form form { display:flex; flex-direction:column; gap: 0.9rem; }
        .input-group { display:flex; flex-direction:column; gap:6px; }
        .input-row { display:flex; gap:0.75rem; }
        input[type="text"], input[type="number"] { padding: 0.65rem; border-radius: 8px; border: 1px solid #e6e9ef; font-size: 0.96rem; background: #fff; outline: none; width:100%; }
        button { width: 100%; background: linear-gradient(90deg,#0bb37a,#0a9d64); color:#fff; border:none; padding:0.75rem; border-radius:10px; font-size:1rem; cursor:pointer; transition: transform 120ms ease, box-shadow 120ms ease; }
        button:disabled { background:#cfcfcf; cursor:not-allowed; }
        .payment-method-box { background: #f5f7fa; border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem; border:1px solid #edf2f7; }
        .jazzcash-account { font-weight:bold; color:#e91e63; font-size:1.04rem; }
        .payment-status { margin-top: 0.5rem; font-weight: bold; }
        .payment-status-paid { color: #28a745; }
        .payment-status-pending { color: #e91e63; }
        @media (max-width:980px) { .checkout-container { grid-template-columns: 1fr; } .thumb { width:68px; height:68px; } .input-row { flex-direction:column; } }
      `}</style>
    </>
  );
};

export default Checkout;