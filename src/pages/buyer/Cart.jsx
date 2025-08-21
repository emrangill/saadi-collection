import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../../context/CartContext.jsx';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils/localImageStore.js';
import { getDoc, doc as fsDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.js';

const Cart = () => {
  // useCart now provides cart (map), cartItems (array), updateQuantity, removeFromCart
  const { cart, cartItems, updateQuantity, removeFromCart } = useCart();
  const [itemsWithImages, setItemsWithImages] = useState([]);
  const createdObjectUrls = useRef(new Set());

  // normalize cart to an array (support array or object map)
  const normalizeCart = (rawCart) => {
    if (!rawCart) return [];
    if (Array.isArray(rawCart)) return rawCart;
    if (typeof rawCart === 'object') return Object.values(rawCart);
    return [];
  };

  // revoke any object URLs we created
  const revokeAll = () => {
    createdObjectUrls.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
      }
    });
    createdObjectUrls.current.clear();
  };

  const isSafeUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return /^data:|^https?:\/\//i.test(url);
  };

  const resolveSingleItemImage = async (item) => {
    // ensure we copy and preserve quantity under a canonical key
    const copy = { ...item };
    // normalize quantity key so UI/calculations always see `quantity` as number
    copy.quantity = Number(item.quantity ?? item.qty ?? item.count ?? 1);

    if (copy.displayImage && isSafeUrl(copy.displayImage)) return copy;
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
            if (res.startsWith('blob:')) createdObjectUrls.current.add(res);
            copy.displayImage = res;
            return copy;
          }
          if (res instanceof Blob) {
            const url = URL.createObjectURL(res);
            createdObjectUrls.current.add(url);
            copy.displayImage = url;
            return copy;
          }
          if (res.url) {
            copy.displayImage = res.url;
            return copy;
          }
        }
      } catch (err) {
        console.warn('Cart: getImageUrl failed for item.localImageId', copy.localImageId, err);
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
                  if (res.startsWith('blob:')) createdObjectUrls.current.add(res);
                  copy.displayImage = res;
                } else if (res instanceof Blob) {
                  const url = URL.createObjectURL(res);
                  createdObjectUrls.current.add(url);
                  copy.displayImage = url;
                } else if (res.url) {
                  copy.displayImage = res.url;
                }
                return copy;
              }
            } catch (err) {
              console.warn('Cart: getImageUrl failed for product.localImageId', pd.localImageId, err);
            }
          }
        }
      } catch (err) {
        console.warn('Cart: failed to fetch product doc for productId', productId, err);
      }
    }

    copy.displayImage = '/placeholder.jpg';
    return copy;
  };

  useEffect(() => {
    let mounted = true;

    const resolveAllImages = async () => {
      revokeAll();

      // prefer cartItems exposed by context if available (already normalized),
      // otherwise normalize cart map
      const rawItems = (Array.isArray(cartItems) && cartItems.length) ? cartItems : normalizeCart(cart);
      if (!rawItems || rawItems.length === 0) {
        if (mounted) setItemsWithImages([]);
        return;
      }

      try {
        const resolved = await Promise.all(rawItems.map((it) => resolveSingleItemImage(it)));
        if (mounted) setItemsWithImages(resolved);
      } catch (err) {
        console.error('Cart: error resolving images', err);
        if (mounted) {
          setItemsWithImages(rawItems.map((c) => ({
            ...c,
            displayImage: c.displayImage && isSafeUrl(c.displayImage) ? c.displayImage : (c.imageUrl || c.image || '/placeholder.jpg'),
            quantity: Number(c.quantity ?? c.qty ?? c.count ?? 1)
          })));
        }
      }
    };

    resolveAllImages();

    return () => {
      mounted = false;
      revokeAll();
    };
    // Re-run when cart map changes or cartItems array changes
  }, [cart, cartItems]);

  // Helper: robust quantity getter (handles various cart shapes)
  const getQty = (item) => {
    if (!item) return 1;
    const q = item.quantity ?? item.qty ?? item.count ?? 1;
    const n = Number(q);
    return Number.isNaN(n) || n < 1 ? 1 : n;
  };

  const totalPrice = (itemsWithImages.length ? itemsWithImages : (Array.isArray(cartItems) && cartItems.length ? cartItems : normalizeCart(cart))).reduce(
    (total, item) => total + Number(item.price || 0) * getQty(item),
    0
  );

  const handleImgError = (e) => {
    if (e && e.target) e.target.src = '/placeholder.jpg';
  };

  // UI controls to allow user updating quantity directly in cart.
  const onChangeQuantity = (productId, newQty) => {
    // guard
    const q = Number(newQty || 1);
    if (Number.isNaN(q) || q < 1) return;
    // call context updater (if not provided this will be a no-op)
    if (typeof updateQuantity === 'function') {
      updateQuantity(productId, q);
    } else {
      console.warn('updateQuantity is not available on CartContext');
    }
  };

  return (
    <>
      <div className="cart-page">
        <h1>Your Cart</h1>

        {((!cart || normalizeCart(cart).length === 0) && (!Array.isArray(cartItems) || cartItems.length === 0)) ? (
          <p className="empty">Your cart is empty</p>
        ) : (
          <>
            <div className="cart-items">
              {itemsWithImages.map((item, idx) => {
                const key = item.id || item.productId || idx;
                const qty = getQty(item);
                return (
                  <div
                    key={key}
                    className="cart-item"
                  >
                    <div className="thumb">
                      <img
                        src={item.displayImage || '/placeholder.jpg'}
                        alt={item.name || 'Product image'}
                        loading="lazy"
                        onError={handleImgError}
                      />
                    </div>

                    <div className="item-body">
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-meta">
                        Price: <span className="price">Rs. {Number(item.price || 0).toFixed(2)}</span>
                      </p>

                      {/* Quantity controls - keeps cart quantity in sync with context */}
                      <div className="cart-qty">
                        <label htmlFor={`qty-${key}`} className="sr-only">Quantity for {item.name}</label>
                        <div className="qty-controls">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => onChangeQuantity(item.productId || item.id, Math.max(1, qty - 1))}
                            aria-label="Decrease quantity"
                          >−</button>
                          <input
                            id={`qty-${key}`}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={qty}
                            onChange={(e) => onChangeQuantity(item.productId || item.id, Number(e.target.value))}
                            aria-live="polite"
                          />
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => onChangeQuantity(item.productId || item.id, qty + 1)}
                            aria-label="Increase quantity"
                          >+</button>
                        </div>
                      </div>

                      <div style={{ marginTop: 8 }} className="item-actions">
                        <button className="remove" onClick={() => removeFromCart(item.id || item.productId)}>
                          Remove
                        </button>
                        <Link className="view-link" to={`/buyer/product/${item.id || item.productId}`}>View</Link>
                      </div>
                    </div>

                    <div className="item-subtotal">
                      <span>Subtotal</span>
                      <strong>Rs. {(Number(item.price || 0) * qty).toFixed(2)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Separate bill cards: one per product */}
            <div className="bills-section">
              <h2>Individual Bills</h2>
              <div className="bills-grid">
                {itemsWithImages.map((item, idx) => {
                  const q = getQty(item);
                  const subtotal = (Number(item.price || 0) * q).toFixed(2);
                  return (
                    <div className="bill-card" key={item.id || item.productId || idx}>
                      <div className="bill-header">
                        <div className="bill-title">Bill for {item.name}</div>
                        <div className="bill-id">#{item.id || item.productId || `CART-${idx+1}`}</div>
                      </div>

                      <div className="bill-body">
                        <img src={item.displayImage || '/placeholder.jpg'} alt={item.name} onError={handleImgError} />
                        <div className="bill-details">
                          <div><strong>Unit Price:</strong> Rs. {Number(item.price || 0).toFixed(2)}</div>
                          <div><strong>Quantity:</strong> {q}</div>
                          <div className="bill-sub"><strong>Subtotal:</strong> Rs. {subtotal}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Total</span>
                <strong>Rs. {totalPrice.toFixed(2)}</strong>
              </div>
              <Link to="/buyer/checkout" className="checkout-button">Proceed to Checkout</Link>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .cart-page { padding: 2rem; max-width: 1100px; margin: 0 auto; min-height: calc(100vh - 120px); background: linear-gradient(180deg,#f7fafc 0%,#fff 40%); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
        h1 { text-align:center; font-size:1.8rem; color:#0b1721; margin-bottom:1.25rem; }
        .bills-section { margin: 1.5rem 0; }
        .bills-section h2 { margin:0 0 0.75rem 0; color:#071327; font-size:1.05rem; }
        .bills-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; }
        .bill-card { background:#fff; border-radius:10px; padding:12px; box-shadow:0 8px 24px rgba(11,23,39,0.04); border:1px solid #eef2f7; display:flex; flex-direction:column; gap:10px; }
        .bill-header { display:flex; justify-content:space-between; align-items:center; }
        .bill-title { font-weight:800; color:#071327; }
        .bill-id { color:#6b7280; font-size:0.9rem; }
        .bill-body { display:flex; gap:10px; align-items:center; }
        .bill-body img { width:100px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #eef2f7; background:#fafbff; }
        .bill-details { display:flex; flex-direction:column; gap:6px; }
        .bill-sub { margin-top:6px; font-weight:800; color:#071327; }

        /* keep previous styles for cart items and summary (unchanged) */
        .empty { text-align:center; color:#6b7280; }
        .cart-items { display:flex; flex-direction:column; gap:1rem; margin-bottom:1.25rem; }
        .cart-item { display:grid; grid-template-columns:84px 1fr 140px; gap:1rem; align-items:center; background:#fff; border-radius:10px; padding:0.9rem; box-shadow: 0 6px 18px rgba(11,23,39,0.04); border:1px solid #eef2f7; }
        .thumb { width:84px; height:84px; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#fafbff; border: 1px solid #eef2f7; }
        .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .item-body { display:flex; flex-direction:column; gap:0.35rem; min-width:0; }
        .item-name { margin:0; font-size:1rem; color:#071327; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .item-meta { margin:0; color:#6b7280; font-size:0.92rem; }
        .price { color:#0bb37a; font-weight:800; }

        /* quantity controls */
        .cart-qty { margin-top: 6px; }
        .qty-controls { display:flex; gap: 8px; align-items: center; }
        .qty-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.15rem;
          line-height: 1;
        }
        .qty-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .qty-controls input[type="number"] {
          width: 72px;
          padding: 8px;
          font-size: 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }

        .item-actions { margin-top: 8px; display:flex; gap:0.5rem; align-items:center; }
        .remove { background:#dc3545; color:#fff; border:none; padding:0.45rem 0.7rem; border-radius:8px; cursor:pointer; font-weight:700; }
        .view-link { display:inline-block; padding:0.45rem 0.7rem; border-radius:8px; background:#071327; color:#fff; text-decoration:none; font-weight:700; }

        .item-subtotal { text-align:right; }
        .item-subtotal span { display:block; color:#6b7280; font-size:0.85rem; }
        .item-subtotal strong { display:block; margin-top:0.25rem; color:#071327; font-size:1rem; }

        .cart-summary { display:flex; justify-content:flex-end; gap:1rem; align-items:center; flex-direction:column; }
        .summary-row { width:100%; max-width:360px; display:flex; justify-content:space-between; padding:0.9rem; border-radius:10px; background:linear-gradient(180deg,#fff,#fbfbff); border:1px solid #eef2f7; box-shadow:0 6px 18px rgba(11,23,39,0.03); }
        .checkout-button { display:inline-block; width:100%; max-width:360px; text-align:center; margin-top:0.75rem; background: linear-gradient(90deg,#0bb37a,#0a9d64); color:#fff; padding:0.75rem 1rem; border-radius:10px; text-decoration:none; font-weight:700; }

        @media (max-width: 768px) {
          .cart-page { padding: 1rem; }
          .cart-item { grid-template-columns: 72px 1fr auto; gap:0.6rem; padding:0.7rem; }
          .thumb { width:72px; height:72px; flex:0 0 72px; }
          .bill-body img { width:80px; height:64px; }
          .bills-grid { grid-template-columns: 1fr; }
          .checkout-button, .summary-row { max-width: 100%; width: 100%; }
        }

        .sr-only { position:absolute !important; height:1px; width:1px; overflow:hidden; clip:rect(1px,1px,1px,1px); white-space:nowrap; }
      `}</style>
    </>
  );
};

export default Cart;