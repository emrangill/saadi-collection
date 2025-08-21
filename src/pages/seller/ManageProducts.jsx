import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getProducts, updateProduct, deleteProduct, getCategories } from '../../services/firebase.js';

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [editingProduct, setEditingProduct] = useState(null); // product being edited (object)
  const [editDraft, setEditDraft] = useState({ name: '', price: '', stock: '', description: '', category: '', imageData: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [imageFile, setImageFile] = useState(null); // for new image upload
  const [imageError, setImageError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [cats, allProducts] = await Promise.all([getCategories(), getProducts()]);

        if (!mounted) return;

        const catsList = cats || [];
        setCategories(catsList);
        const map = {};
        catsList.forEach(c => { map[c.id] = c.name; });
        setCategoriesMap(map);

        const sellerProducts = (allProducts || []).filter(p => p.sellerId === user.uid);
        setProducts(sellerProducts);
      } catch (err) {
        console.error('Error fetching products or categories:', err);
        alert('Failed to load products or categories: ' + (err.message || err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { mounted = false; };
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Failed to delete product: ' + (err.message || err));
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setEditDraft({
      name: product.name || '',
      price: product.price != null ? product.price : '',
      stock: product.stock != null ? product.stock : '',
      description: product.description || '',
      category: product.category || '',
      imageData: product.imageData || '' // include existing imageData
    });
    setImageFile(null); // reset image file
    setImageError('');
  };

  const closeEdit = () => {
    setEditingProduct(null);
    setEditDraft({ name: '', price: '', stock: '', description: '', category: '', imageData: '' });
    setImageFile(null);
    setImageError('');
    setSavingEdit(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditDraft(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      setImageError('');
      return;
    }

    // Validate file size (750 KB = 750 * 1024 bytes)
    const maxSize = 750 * 1024;
    if (file.size > maxSize) {
      setImageError('Image size exceeds 750 KB.');
      setImageFile(null);
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
      setImageError('Only JPEG or PNG images are allowed.');
      setImageFile(null);
      return;
    }

    setImageError('');
    setImageFile(file);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editDraft.name || editDraft.price === '' || editDraft.stock === '' || !editDraft.category) {
      alert('Please fill required fields (name, price, stock, category).');
      return;
    }
    if (imageError) {
      alert(imageError);
      return;
    }

    setSavingEdit(true);
    try {
      let updatedData = {
        name: editDraft.name.trim(),
        price: parseFloat(editDraft.price),
        stock: parseInt(editDraft.stock, 10),
        description: editDraft.description.trim(),
        category: editDraft.category
      };

      // Handle image update if a new file is selected
      if (imageFile) {
        const reader = new FileReader();
        const imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(imageFile);
        });
        updatedData.imageData = imageData;
      } else {
        // Preserve existing imageData if no new image is uploaded
        updatedData.imageData = editDraft.imageData;
      }

      await updateProduct(editingProduct.id, updatedData);

      // Update local products list
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...updatedData } : p));

      // Close modal
      closeEdit();
      alert('Product updated successfully!');
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Failed to update product: ' + (err.message || err));
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading products...</div>;
  }

  return (
    <>
      <div className="manage-products">
        <h1>Manage Products</h1>

        <div className="products-grid">
          {products.length === 0 && <div className="empty">You have no products yet.</div>}

          {products.map(product => {
            const categoryName = categoriesMap[product.category] || product.category || 'Uncategorized';
            const stockText = typeof product.stock === 'number'
              ? `Stock: ${product.stock}`
              : (product.inStock === false ? 'Out of Stock' : (product.inStock === true ? 'In Stock' : ''));

            return (
              <div key={product.id} className="product-item">
                <div className="image-container">
                  <img
                    src={product.imageData || '/placeholder.jpg'}
                    alt={product.name}
                    className="product-img"
                    onError={(e) => { if (e?.target) e.target.src = '/placeholder.jpg'; }}
                  />
                </div>
                <div className="row top">
                  <h3 className="title">{product.name}</h3>
                  <div className="price">${product.price}</div>
                </div>

                <div className="meta">
                  <span className="category">{categoryName}</span>
                  <span className="stock">{stockText}</span>
                </div>

                {product.description && <p className="description">{product.description}</p>}

                <div className="controls">
                  <button className="edit" onClick={() => openEdit(product)}>Edit</button>
                  <button className="delete" onClick={() => handleDelete(product.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="modal-backdrop" onMouseDown={closeEdit}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>Edit Product</h2>
            <form onSubmit={saveEdit} className="edit-form">
              <label>
                Name
                <input name="name" value={editDraft.name} onChange={handleEditChange} required />
              </label>

              <label>
                Price (Rs)
                <input name="price" type="number" step="0.01" value={editDraft.price} onChange={handleEditChange} required />
              </label>

              <label>
                Stock
                <input name="stock" type="number" value={editDraft.stock} onChange={handleEditChange} required />
              </label>

              <label>
                Category
                <select name="category" value={editDraft.category} onChange={handleEditChange} required>
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Image
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageChange}
                />
                {imageError && <span className="error">{imageError}</span>}
                {imageFile ? (
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    className="image-preview"
                  />
                ) : editDraft.imageData ? (
                  <img
                    src={editDraft.imageData}
                    alt="Current"
                    className="image-preview"
                  />
                ) : null}
              </label>

              <label>
                Description
                <textarea name="description" value={editDraft.description} onChange={handleEditChange} />
              </label>

              <div className="modal-actions">
                <button type="submit" className="save" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="cancel" onClick={closeEdit} disabled={savingEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .manage-products { padding: 2rem; max-width: 1100px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 1.2rem; color: #0f1724; }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }

        .product-item {
          background: #fff;
          border-radius: 10px;
          padding: 14px;
          box-shadow: 0 10px 30px rgba(15,23,42,0.04);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .image-container {
          width: 100%;
          height: 140px;
          border-radius: 8px;
          overflow: hidden;
          background: #f7fafc;
        }
        .product-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .product-item .row.top { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .product-item .title { margin:0; font-size:1.05rem; color:#0f1724; }
        .price { font-weight:800; color:#1f6feb; }
        .meta { display:flex; gap:12px; color:#6b7280; font-size:0.9rem; }
        .description { color:#374151; margin:0; }
        .controls { display:flex; gap:8px; margin-top:10px; }
        .controls button { padding:8px 10px; border-radius:8px; border:none; cursor:pointer; font-weight:700; }
        .controls .edit { background:#eef2ff; color:#3730a3; }
        .controls .delete { background:#ef4444; color:#fff; }

        .modal-backdrop {
          position: fixed; inset:0; display:flex; align-items:center; justify-content:center;
          background: rgba(2,6,23,0.45); z-index: 60; padding: 18px;
        }
        .modal {
          width: 520px; max-width: 96%; background: #fff; border-radius: 12px; padding: 18px;
          box-shadow: 0 24px 70px rgba(2,6,23,0.3);
        }
        .edit-form { display:flex; flex-direction:column; gap:10px; }
        .edit-form label { display:flex; flex-direction:column; font-weight:700; color:#374151; }
        .edit-form input, .edit-form textarea, .edit-form select {
          margin-top:8px; padding:10px; border-radius:8px; border:1px solid #e6eef8; font-size:0.95rem;
        }
        .edit-form input[type="file"] { padding: 6px 0; }
        .image-preview {
          margin-top: 8px;
          max-width: 100%;
          max-height: 100px;
          object-fit: contain;
          border-radius: 8px;
        }
        .error { color: #ef4444; font-size: 0.85rem; margin-top: 4px; }
        textarea { min-height:100px; resize:vertical; }
        .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:6px; }
        .modal-actions .save { background: linear-gradient(90deg,#1f6feb,#7c3aed); color:#fff; padding:10px 14px; border-radius:8px; border:none; }
        .modal-actions .cancel { background:transparent; border:1px solid #e6eef8; padding:10px 14px; border-radius:8px; }

        .empty { grid-column: 1 / -1; text-align:center; color:#6b7280; padding:24px; background:#fff; border-radius:10px; }

        @media (max-width: 640px) {
          .products-grid { grid-template-columns: 1fr; }
          .modal { padding: 14px; }
          .image-preview { max-height: 80px; }
        }
      `}</style>
    </>
  );
};

export default ManageProducts;