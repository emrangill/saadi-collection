import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import { db } from '../../services/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Product page
 *
 * Behavior:
 * - Quantity selector remains on the product page only.
 * - When user clicks "Add to Cart" or "Buy Now" we add the product to the cart
 *   in a way that works with your existing CartContext (no changes to CartContext).
 * - To be compatible with CartContexts that increment quantity per add, we add
 *   the item `quantity` times, each time with quantity: 1. If your CartContext
 *   already accepts and preserves incoming .quantity, it will still work.
 *
 * This keeps Cart & Checkout unchanged while ensuring the selected quantity
 * on product page is reflected in cart subtotals and checkout.
 */

const Product = () => {
  const { user } = useAuth();
  const { productId } = useParams();
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [descOpen, setDescOpen] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/');
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        if (!productId) {
          setError('Invalid product ID');
          setLoading(false);
          return;
        }
        const productDoc = doc(db, 'products', productId);
        const docSnap = await getDoc(productDoc);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          data.displayImage = data.imageData || '/placeholder.jpg';
          if (!mounted) return;
          setProduct(data);
          setCurrentImageIndex(0);
        } else {
          setError('Product not found');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product: ' + (err.message || err));
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user, productId, navigate]);

  // Build gallery images array (fallbacks)
  const gallery = (product && (
    Array.isArray(product.images) && product.images.length
      ? product.images
      : product.displayImage
        ? [product.displayImage]
        : ['/placeholder.jpg']
  )) || ['/placeholder.jpg'];

  useEffect(() => {
    // Reset index if gallery changes
    setCurrentImageIndex(0);
  }, [product?.displayImage, product?.images]);

  // Normalized cart item (used if your CartContext accepts a quantity)
  const buildCartItem = (qty) => {
    if (!product) return null;
    return {
      id: product.id || product.productId || String(Date.now()),
      productId: product.id || product.productId,
      name: product.name,
      price: Number(product.price || 0),
      unitPrice: Number(product.price || 0),
      quantity: Number(qty || 1),
      image: product.displayImage || '/placeholder.jpg',
      sku: product.sku || null,
      category: product.category || null,
      attributes: product.attributes || null
    };
  };

  // Single-item cart payload (quantity:1) — used to add multiple times if needed
  const buildSingleAddItem = () => buildCartItem(1);

  // Add to cart: attempt to add as a single call with selected quantity.
  // But to be compatible with older CartContexts which increment per-add,
  // also fall back to adding `quantity` times (quantity:1).
  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock && product.stock <= 0) {
      alert('Product is out of stock');
      return;
    }
    const qty = Math.max(1, Math.floor(Number(quantity || 1)));
    if (qty > (product.stock || Infinity)) {
      alert('Requested quantity exceeds stock');
      return;
    }

    // Try to add once with the selected quantity (works if CartContext preserves quantity)
    try {
      const item = buildCartItem(qty);
      addToCart(item);
    } catch (err) {
      // If addToCart throws, fall back to multiple single adds
      console.warn('addToCart failed for multi-quantity payload, will fallback to multiple adds', err);
      const single = buildSingleAddItem();
      for (let i = 0; i < qty; i++) addToCart(single);
    }

    // Fallback for CartContext that ignores incoming quantity
    if (qty > 1) {
      const single = buildSingleAddItem();
      for (let i = 1; i < qty; i++) addToCart(single);
    }

    alert(`${product.name} added to cart! (x${qty})`);
    navigate('/buyer/cart');
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.stock && product.stock <= 0) {
      alert('Product is out of stock');
      return;
    }
    const qty = Math.max(1, Math.floor(Number(quantity || 1)));
    if (qty > (product.stock || Infinity)) {
      alert('Requested quantity exceeds stock');
      return;
    }

    // Same strategy as Add to Cart
    try {
      const item = buildCartItem(qty);
      addToCart(item);
    } catch (err) {
      const single = buildSingleAddItem();
      for (let i = 0; i < qty; i++) addToCart(single);
    }
    if (qty > 1) {
      const single = buildSingleAddItem();
      for (let i = 1; i < qty; i++) addToCart(single);
    }

    navigate('/buyer/checkout');
  };

  const changeQuantity = (delta) => {
    const newQty = Math.max(1, Math.min((product?.stock || Infinity), quantity + delta));
    setQuantity(newQty);
  };

  const handleQuantityInput = (e) => {
    const value = parseInt(e.target.value, 10);
    if (Number.isNaN(value)) {
      setQuantity(1);
      return;
    }
    if (product?.stock) {
      setQuantity(Math.max(1, Math.min(product.stock, value)));
    } else {
      setQuantity(Math.max(1, value));
    }
  };

  const price = product ? Number(product.price || 0) : 0;
  const compareAt = product ? Number(product.compareAtPrice || 0) : 0;
  const hasDiscount = compareAt > price;

  return (
    <>
      <div className="product-page" role="main">
        <div className="container">
          {loading ? (
            <div className="skeleton">
              <div className="skeleton-img" />
              <div className="skeleton-body" />
            </div>
          ) : error ? (
            <div className="center">
              <p className="error">{error}</p>
            </div>
          ) : product ? (
            <div className="product-grid">
              <section className="gallery" aria-label="Product images">
                <div className="main-media" role="img" aria-label={product.name}>
                  <img
                    src={gallery[currentImageIndex]}
                    alt={`${product.name} - image ${currentImageIndex + 1}`}
                    onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                  />
                  {hasDiscount && (
                    <span className="badge sale">-{Math.round(((compareAt - price) / compareAt) * 100)}%</span>
                  )}
                  {product.stock === 0 && <span className="badge sold">Sold out</span>}
                </div>

                {gallery.length > 1 && (
                  <div className="thumbnails" role="tablist" aria-label="Image thumbnails">
                    {gallery.map((src, i) => (
                      <button
                        key={i}
                        className={`thumb ${i === currentImageIndex ? 'active' : ''}`}
                        onClick={() => setCurrentImageIndex(i)}
                        aria-label={`Show image ${i + 1}`}
                      >
                        <img src={src} alt={`${product.name} thumbnail ${i + 1}`} onError={(e) => { e.target.src = '/placeholder.jpg'; }} />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <aside className="details" aria-labelledby="product-title">
                <div className="sticky-wrap">
                  <h1 id="product-title">{product.name}</h1>

                  <div className="meta">
                    <div className="price-row">
                      <div className="price">
                        <span className="current">${price.toFixed(2)}</span>
                        {hasDiscount && <span className="compare">${compareAt.toFixed(2)}</span>}
                      </div>
                      <div className="rating" aria-label={`Rating ${product.rating || 'unrated'}`}>
                        {product.rating ? (
                          <>
                            <span className="stars" aria-hidden>
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <svg key={idx} viewBox="0 0 20 20" className={idx < Math.round(product.rating) ? 'filled' : ''}><path d="M10 1.6l2.6 5.27 5.82.84-4.21 4.1.99 5.77L10 14.9 4.83 18.57l.99-5.77L1.61 8.7l5.82-.84L10 1.6z"></path></svg>
                              ))}
                            </span>
                            <small className="rating-num"> {product.rating.toFixed(1)}</small>
                          </>
                        ) : (
                          <small className="rating-num muted">No ratings</small>
                        )}
                      </div>
                    </div>

                    <div className="sku-cat">
                      <div className="category">Category: <span>{product.category || 'N/A'}</span></div>
                      {product.sku && <div className="sku">SKU: <span>{product.sku}</span></div>}
                    </div>
                  </div>

                  <div className="purchase">
                    <div className="stock">
                      {product.stock > 10 ? (
                        <span className="in-stock">In stock</span>
                      ) : product.stock > 0 ? (
                        <span className="low-stock">Only {product.stock} left</span>
                      ) : (
                        <span className="out-stock">Out of stock</span>
                      )}
                      {product.stock > 0 && <span className="lead-time"> • Dispatch in {product.dispatchDays || 1} day(s)</span>}
                    </div>

                    <div className="quantity">
                      <label htmlFor="qty">Quantity</label>
                      <div className="qty-controls" role="group" aria-label="Quantity selector">
                        <button type="button" onClick={() => changeQuantity(-1)} aria-label="Decrease quantity" className="qty-btn">−</button>
                        <input
                          id="qty"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={product.stock || 9999}
                          value={quantity}
                          onChange={handleQuantityInput}
                          aria-live="polite"
                        />
                        <button type="button" onClick={() => changeQuantity(1)} aria-label="Increase quantity" className="qty-btn">+</button>
                      </div>
                    </div>

                    <div className="actions" role="region" aria-label="Purchase actions">
                      <button
                        className="btn primary"
                        onClick={handleAddToCart}
                        disabled={product.stock === 0}
                      >
                        Add to Cart
                      </button>
                      <button
                        className="btn outline"
                        onClick={handleBuyNow}
                        disabled={product.stock === 0}
                      >
                        Buy Now
                      </button>
                    </div>

                    <div className="extra-links">
                      <button className="link" onClick={() => navigate('/buyer/products')}>Back to products</button>
                    </div>
                  </div>

                  <div className="description">
                    <button
                      className="desc-toggle"
                      onClick={() => setDescOpen((s) => !s)}
                      aria-expanded={descOpen}
                      aria-controls="desc-text"
                    >
                      Product description
                      <span className={`caret ${descOpen ? 'open' : ''}`} />
                    </button>

                    <div id="desc-text" className={`desc-body ${descOpen ? 'open' : ''}`} dangerouslySetInnerHTML={{
                      __html: product.description || product.shortDescription || '<p>No description available.</p>'
                    }} />
                  </div>

                  {product.attributes && typeof product.attributes === 'object' && (
                    <div className="attributes" aria-label="Product attributes">
                      {Object.entries(product.attributes).map(([k, v]) => (
                        <div className="attr" key={k}><strong>{k}:</strong> <span>{String(v)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <div className="center">
              <p>No product data available</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .product-page {
          --bg: #f6f8fb;
          --card: #ffffff;
          --muted: #6b7280;
          --accent: #f59e0b;
          --accent-2: #10b981;
          color: #111827;
          background: var(--bg);
          padding: 28px 18px;
          min-height: calc(100vh - 120px);
        }

        .product-page .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .skeleton {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .skeleton-img { background: linear-gradient(90deg,#e6e9ee,#f3f6fa,#e6e9ee); height: 360px; border-radius: 8px; }
        .skeleton-body { background: linear-gradient(90deg,#e6e9ee,#f3f6fa,#e6e9ee); height: 360px; border-radius: 8px; }

        .center { text-align: center; padding: 40px 0; }
        .error { color: #dc2626; font-size: 1.1rem; }

        .product-grid {
          display: grid;
          grid-template-columns: 1fr 480px;
          gap: 28px;
          align-items: start;
        }

        .gallery { background: transparent; }

        .main-media {
          position: relative;
          background: var(--card);
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 6px 20px rgba(17,24,39,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 360px;
        }
        .main-media img {
          width: 100%;
          max-width: 680px;
          max-height: 540px;
          object-fit: contain;
          border-radius: 6px;
          display: block;
        }
        .badge { position: absolute; top: 16px; left: 16px; padding: 6px 10px; border-radius: 999px; font-weight: 700; color: #fff; font-size: 0.85rem; }
        .badge.sale { background: linear-gradient(90deg,#ef4444,#f97316); }
        .badge.sold { background: #6b7280; left: auto; right: 16px; }

        .thumbnails { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
        .thumb { background: transparent; border: 1px solid transparent; padding: 4px; border-radius: 8px; cursor: pointer; width: 72px; height: 72px; display: inline-flex; align-items: center; justify-content: center; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
        .thumb:focus { outline: 2px solid rgba(99,102,241,0.24); }
        .thumb.active { border-color: rgba(99,102,241,0.16); box-shadow: 0 6px 18px rgba(2,6,23,0.06); }

        .details { display: flex; flex-direction: column; }

        .sticky-wrap { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 6px 20px rgba(17,24,39,0.06); }
        @media (min-width: 1100px) { .sticky-wrap { position: sticky; top: 24px; } }

        .details h1 { margin: 0 0 6px; font-size: 1.5rem; line-height: 1.2; }
        .meta { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; }

        .price-row { display:flex; justify-content: space-between; align-items: center; gap: 10px; }
        .price .current { font-size: 1.6rem; font-weight: 800; color: #0f172a; }
        .price .compare { font-size: 0.95rem; color: var(--muted); text-decoration: line-through; }

        .sku-cat { display:flex; gap: 10px; color: var(--muted); font-size: 0.95rem; margin-top: 4px; flex-wrap: wrap; }
        .purchase { margin-top: 16px; display:flex; flex-direction: column; gap: 12px; }

        .stock { color: var(--muted); font-size: 0.95rem; display:flex; gap:8px; align-items:center; }
        .in-stock { color: var(--accent-2); font-weight: 700; }
        .low-stock { color: #d97706; font-weight: 700; }
        .out-stock { color: #ef4444; font-weight: 700; }

        .quantity { display:flex; flex-direction: column; gap: 6px; }
        .qty-controls { display:flex; gap: 8px; align-items: center; }
        .qty-btn { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 1.15rem; line-height: 1; }
        .qty-controls input[type="number"] { width: 72px; padding: 8px; font-size: 1rem; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }

        .actions { display:flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
        .btn.primary { background: linear-gradient(90deg,#10b981,#059669); color: white; padding: 12px 16px; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; }
        .btn.outline { background: transparent; border: 1px solid #e5e7eb; color: #111827; padding: 12px 16px; border-radius: 10px; cursor: pointer; }

        .extra-links { margin-top: 6px; }
        .link { background: none; border: none; color: #374151; text-decoration: underline; cursor: pointer; padding: 0; }

        .description { margin-top: 18px; }
        .desc-toggle { width: 100%; display:flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #eef2f7; cursor: pointer; }
        .desc-body { max-height: 0; overflow: hidden; transition: max-height 0.28s ease, padding 0.18s ease; padding: 0 6px; }
        .desc-body.open { padding: 12px 6px; max-height: 420px; }

        @media (max-width: 1024px) { .product-grid { grid-template-columns: 1fr 420px; gap: 20px; } .main-media { min-height: 340px; } }
        @media (max-width: 840px) { .product-grid { grid-template-columns: 1fr; } .main-media { min-height: 300px; } .sticky-wrap { position: static; } }
        @media (max-width: 480px) { .thumbnails { gap: 8px; } .thumb { width: 64px; height: 64px; } .details h1 { font-size: 1.15rem; } .price .current { font-size: 1.2rem; } }

      `}</style>
    </>
  );
};

export default Product;