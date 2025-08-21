
// Category card component for displaying category details
import React from 'react';

const CategoryCard = ({ category, onClick }) => {
  return (
    <>
      <div className="category-card" onClick={onClick}>
        <h3>{category.name}</h3>
        <p>{category.description || 'Explore products in this category'}</p>
      </div>
      <style jsx>{`
        .category-card {
          background: #fff;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          text-align: center;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .category-card:hover {
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
        }
      `}</style>
    </>
  );
};

export default CategoryCard;
