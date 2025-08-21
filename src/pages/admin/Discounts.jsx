
// Manage discounts page for admins
import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Discounts = () => {
  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  const handleAddDiscount = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'discounts'), {
        code: discountCode,
        percent: parseFloat(discountPercent),
      });
      alert('Discount added successfully!');
      setDiscountCode('');
      setDiscountPercent('');
    } catch (err) {
      alert('Failed to add discount.');
    }
  };

  return (
    <>
      <div className="discounts-page">
        <h2>Manage Discounts</h2>
        <div className="discount-form">
          <input
            type="text"
            placeholder="Discount Code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
          />
          <input
            type="number"
            placeholder="Discount Percentage"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
          />
          <button onClick={handleAddDiscount}>Add Discount</button>
        </div>
      </div>
      <style jsx>{`
        .discounts-page {
          max-width: 600px;
          margin: 2rem auto;
          padding: 2rem;
          text-align: center;
        }
        .discount-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .discount-form input {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 1rem;
        }
        .discount-form button {
          background-color: #28a745;
          color: #fff;
          border: none;
          padding: 0.75rem;
          border-radius: 5px;
          cursor: pointer;
        }
        .discount-form button:hover {
          background-color: #218838;
        }
        @media (max-width: 768px) {
          .discounts-page {
            padding: 1rem;
          }
          .discount-form input, .discount-form button {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  );
};

export default Discounts;
