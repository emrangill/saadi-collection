import React, { useState, useEffect } from 'react';
import { getProducts, deleteProduct, getCategories } from '../../services/firebase.js';

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        // Fetch categories
        const categories = (await getCategories()) || [];
        const catMap = {};
        categories.forEach((c) => (catMap[c.id] = c.name));
        if (!mounted) return;
        setCategoriesMap(catMap);

        // Fetch products
        const data = (await getProducts()) || [];
        const productsWithImages = data.map((p) => ({
          ...p,
          displayImage: p.imageData && typeof p.imageData === 'string' && p.imageData.startsWith('data:image/') ? p.imageData : '/placeholder.jpg',
          categoryName: catMap[p.category] || p.category || '—'
        }));
        if (!mounted) return;
        setProducts(productsWithImages);
      } catch (err) {
        console.error('ManageProducts: fetch error', err);
        if (mounted) setError('Failed to load products: ' + (err.message || err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((product) => product.id !== id));
      alert('Product deleted successfully!');
    } catch (err) {
      console.error('ManageProducts: delete error', err);
      alert('Failed to delete product: ' + (err.message || err));
    }
  };

  return (
    <>
      <div className="manage-products">
        <header className="top">
          <h1>Manage Products</h1>
          <p className="hint">View and delete products across all sellers.</p>
        </header>

        {loading ? (
          <div className="loading">Loading products...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : products.length === 0 ? (
          <div className="empty">No products found.</div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <article key={product.id} className="product-item">
                <div className="product-thumb">
                  <img
                    src={product.displayImage}
                    alt={product.name}
                    onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                    loading="lazy"
                  />
                </div>
                <div className="product-body">
                  <h3 title={product.name}>{product.name}</h3>
                  <p className="category">{product.categoryName}</p>
                  <p className="description">{product.description}</p>
                  <p className="price">Price: ${Number(product.price || 0).toFixed(2)}</p>
                  <p className="stock">{product.inStock ? 'In Stock' : 'Out of Stock'}</p>
                  <button className="danger" onClick={() => handleDelete(product.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        :root {
          --bg: #f7fafc;
          --panel: #ffffff;
          --muted: #6b7280;
          --accent: #0b69ff;
          --accent-2: #0753d1;
          --danger: #ef4444;
          --card-radius: 12px;
          --shadow: 0 10px 30px rgba(16,24,40,0.06);
        }

        .manage-products {
          padding: clamp(16px, 3vw, 28px);
          background: linear-gradient(180deg, var(--bg) 0%, #ffffff 40%);
          min-height: calc(100vh - 60px);
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #071327;
        }

        .top {
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        h1 {
          margin: 0;
          font-size: clamp(1rem, 1.8vw, 1.25rem);
          color: #071327;
        }

        .hint {
          color: var(--muted);
          margin: 4px 0 0 0;
          font-size: 0.92rem;
        }

        .loading, .empty, .error {
          text-align: center;
          color: var(--muted);
          padding: 28px;
          font-size: 1rem;
        }

        .error {
          color: var(--danger);
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
          align-items: start;
          margin-top: 12px;
        }

        .product-item {
          background: var(--panel);
          border-radius: var(--card-radius);
          padding: 12px;
          border: 1px solid rgba(14, 57, 116, 0.06);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: transform 140ms ease, box-shadow 140ms ease;
          overflow: hidden;
        }

        .product-item:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 40px rgba(16,24,40,0.08);
        }

        .product-thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fff, #fbfbff);
          border: 1px solid #eef6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .product-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .product-body h3 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #071327;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .category {
          color: var(--muted);
          font-size: 0.85rem;
          margin: 0;
        }

        .description {
          color: #374151;
          font-size: 0.9rem;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .price {
          color: var(--accent);
          font-weight: 700;
          font-size: 0.95rem;
          margin: 0;
        }

        .stock {
          color: var(--muted);
          font-size: 0.9rem;
          margin: 0;
        }

        .danger {
          background: var(--danger);
          color: #fff;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          transition: background 160ms ease;
        }

        .danger:hover {
          background: #c82333;
        }

        @media (max-width: 768px) {
          .manage-products {
            padding: 1rem;
          }

          .products-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 14px;
          }

          .product-item {
            padding: 10px;
          }

          .product-body h3 {
            font-size: 1rem;
          }
        }

        @media (max-width: 420px) {
          .manage-products {
            padding: 12px;
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .product-thumb {
            max-height: 180px;
          }

          .description {
            -webkit-line-clamp: 2;
          }
        }
      `}</style>
    </>
  );
};

export default ManageProducts;