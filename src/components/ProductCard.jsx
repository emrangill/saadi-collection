
// Product card component for displaying product details
import React from 'react';

const ProductCard = ({ product, onClick }) => {
  return (
    <>
      <div className="product-card" onClick={onClick}>
        <h3>{product.name}</h3>
        <p>Price: ${product.price}</p>
        <p>{product.description || 'No description available'}</p>
        <p>Stock: {product.stock}</p>
        <p>Category: {product.category}</p>
      </div>
      <style jsx>{`
        .product-card {
          background: #fff;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          text-align: center;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        h3 {
          font-size: 1.2rem;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }
        p {
          font-size: 0.9rem;
          color: #666;
          margin: 0.3rem 0;
        }
      `}</style>
    </>
  );
};

export default ProductCard;
