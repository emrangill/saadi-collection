
// Wishlist page for saved items
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import { getWishlist, removeFromWishlist } from '../../services/firebase.js';

const Wishlist = () => {
  const { user } = useAuth();
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/');
      return;
    }

    const fetchWishlist = async () => {
      try {
        const wishlistItems = await getWishlist(user.uid);
        setWishlist(wishlistItems);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching wishlist:', err);
        alert('Failed to load wishlist: ' + err.message);
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, navigate]);

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(user.uid, productId);
      setWishlist(wishlist.filter(item => item.id !== productId));
      alert('Item removed from wishlist!');
    } catch (err) {
      console.error('Error removing item:', err);
      alert('Failed to remove item: ' + err.message);
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    alert(`${product.name} added to cart!`);
  };

  return (
    <>
      <div className="wishlist-page">
        <h1>Your Wishlist</h1>
        {loading ? (
          <p>Loading wishlist...</p>
        ) : wishlist.length === 0 ? (
          <p>No items in wishlist.</p>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map(item => (
              <div key={item.id} className="wishlist-item">
                <img src={item.image || '/placeholder.jpg'} alt={item.name} />
                <p>{item.name}</p>
                <p>${item.price.toFixed(2)}</p>
                <button onClick={() => handleAddToCart(item)}>Add to Cart</button>
                <button onClick={() => handleRemove(item.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .wishlist-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: calc(100vh - 120px);
          background: #f4f6f9;
        }
        h1 {
          font-size: 2rem;
          color: #1a1a1a;
          text-align: center;
          margin-bottom: 2rem;
        }
        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .wishlist-item {
          background: #fff;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .wishlist-item img {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 5px;
          margin-bottom: 0.5rem;
        }
        .wishlist-item p {
          font-size: 0.9rem;
          color: #666;
          margin: 0.3rem 0;
        }
        .wishlist-item button {
          background: #007bff;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
          margin: 0.5rem 0.5rem 0 0;
          transition: background-color 0.3s ease;
        }
        .wishlist-item button:nth-child(4) {
          background: #dc3545;
        }
        .wishlist-item button:hover {
          background: #0056b3;
        }
        .wishlist-item button:nth-child(4):hover {
          background: #c82333;
        }
        p {
          text-align: center;
          font-size: 1.2rem;
          color: #666;
        }
        @media (max-width: 768px) {
          .wishlist-page {
            padding: 1rem;
          }
          h1 {
            font-size: 1.5rem;
          }
          .wishlist-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default Wishlist;
