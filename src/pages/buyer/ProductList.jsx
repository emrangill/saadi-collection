import React, { useState, useEffect } from 'react';
import { getProducts } from '../../services/firebase.js';
import ProductCard from '../../components/ProductCard.jsx';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <>
      <div className="product-list">
        <h1>Products</h1>
        {loading && <p>Loading products...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p>No products available.</p>
        )}
        {!loading && !error && products.length > 0 && (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => window.location.href = `/product/${product.id}`}
              />
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .product-list {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .product-list h1 {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        .error {
          color: red;
          text-align: center;
        }
        p {
          text-align: center;
          color: #666;
        }
        @media (max-width: 768px) {
          .product-list {
            padding: 1rem;
          }
          .product-list h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default ProductList;