import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../services/firebase.js';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      setLoading(true);
      const categoryList = await getCategories();
      console.log('Categories fetched:', categoryList);
      setCategories(categoryList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories: ' + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Categories component mounted');
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      alert('Category name cannot be empty');
      return;
    }
    try {
      await addCategory({ name: newCategory });
      alert('Category added successfully!');
      setNewCategory('');
      fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Failed to add category: ' + err.message);
    }
  };

  const handleEditCategory = async (categoryId) => {
    if (!editCategoryName.trim()) {
      alert('Category name cannot be empty');
      return;
    }
    try {
      await updateCategory(categoryId, { name: editCategoryName });
      alert('Category updated successfully!');
      setEditCategoryId(null);
      setEditCategoryName('');
      fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(categoryId);
      alert('Category deleted successfully!');
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Loading...</p>
      </div>
    );
  }

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
      <div className="categories-page">
        <h1>Manage Categories</h1>
        {/* Add Category Form */}
        <div className="add-category">
          <h2>Add New Category</h2>
          <form onSubmit={handleAddCategory}>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter category name"
            />
            <button type="submit">Add Category</button>
          </form>
        </div>
        {/* Category List */}
        <h2>Category List</h2>
        {categories.length === 0 ? (
          <p>No categories found.</p>
        ) : (
          <div className="categories-list">
            {categories.map((category) => (
              <div key={category.id} className="category-item">
                {editCategoryId === category.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                    />
                    <div className="edit-buttons">
                      <button onClick={() => handleEditCategory(category.id)}>Save</button>
                      <button
                        onClick={() => {
                          setEditCategoryId(null);
                          setEditCategoryName('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p><strong>Name:</strong> {category.name}</p>
                    <div className="category-actions">
                      <button
                        onClick={() => {
                          setEditCategoryId(category.id);
                          setEditCategoryName(category.name);
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDeleteCategory(category.id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Back to Dashboard */}
        <div className="back-button">
          <button onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
      <style jsx>{`
        .categories-page {
          padding: 2rem;
          text-align: center;
        }
        .categories-page h1 {
          font-size: 2rem;
          margin-bottom: 1.5rem;
        }
        .categories-page h2 {
          font-size: 1.5rem;
          margin: 2rem 0 1rem;
        }
        .add-category {
          max-width: 600px;
          margin: 0 auto 2rem;
          border: 1px solid #ddd;
          padding: 1rem;
          border-radius: 5px;
        }
        .add-category form {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .add-category input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 1rem;
        }
        .add-category button {
          background-color: #007bff;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
        }
        .add-category button:hover {
          background-color: #0056b3;
        }
        .categories-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .category-item {
          border: 1px solid #ddd;
          padding: 1rem;
          border-radius: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .category-item p {
          margin: 0;
        }
        .category-actions {
          display: flex;
          gap: 0.5rem;
        }
        .category-actions button {
          background-color: #28a745;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
        }
        .category-actions button:last-child {
          background-color: #dc3545;
        }
        .category-actions button:hover {
          background-color: #218838;
        }
        .category-actions button:last-child:hover {
          background-color: #c82333;
        }
        .edit-form {
          display: flex;
          flex: 1;
          gap: 1rem;
          align-items: center;
        }
        .edit-form input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 1rem;
        }
        .edit-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .edit-buttons button {
          background-color: #28a745;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
        }
        .edit-buttons button:last-child {
          background-color: #6c757d;
        }
        .edit-buttons button:hover {
          background-color: #218838;
        }
        .edit-buttons button:last-child:hover {
          background-color: #5a6268;
        }
        .back-button {
          margin-top: 2rem;
        }
        .back-button button {
          background-color: #6c757d;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
        }
        .back-button button:hover {
          background-color: #5a6268;
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .error {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          text-align: center;
        }
        .error h1 {
          font-size: 2rem;
          color: #dc3545;
          margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
          .categories-page {
            padding: 1rem;
          }
          .categories-page h1 {
            font-size: 1.5rem;
          }
          .categories-page h2 {
            font-size: 1.2rem;
          }
          .add-category form {
            flex-direction: column;
          }
          .category-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .category-actions {
            margin-top: 0.5rem;
          }
          .edit-form {
            flex-direction: column;
          }
          .edit-buttons {
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default Categories;