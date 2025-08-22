import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { addProduct, getCategories } from '../../services/firebase.js';

const AddProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    category: ''
  });

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'seller' || !user.approved) {
      navigate('/');
      return;
    }

    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories', err);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // For price, always store as string for control
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
      setSelectedFile(null);
      return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    if (file.size > 750 * 1024) { // Limit to 750 KB to stay under Firestore 1 MB limit
      alert('Image size must be less than 750 KB.');
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setSelectedFile(file);
  };

  const validateForm = () => {
    if (!product.name.trim()) { alert('Product name is required.'); return false; }
    if (!product.price || Number.isNaN(Number(product.price))) { alert('Valid price is required.'); return false; }
    if (!product.stock || Number.isNaN(Number(product.stock))) { alert('Valid stock quantity is required.'); return false; }
    if (!product.category) { alert('Please select a category.'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      let imageData = '';

      if (selectedFile) {
        // Convert image to base64
        const reader = new FileReader();
        imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(selectedFile);
        });
      }

      // Price: If user enters decimal, save as float. If integer, save as int.
      // (Firebase will store as number, not string)
      let priceValue;
      if (product.price.includes('.')) {
        priceValue = parseFloat(product.price);
      } else {
        priceValue = parseInt(product.price, 10);
      }

      const productData = {
        name: product.name.trim(),
        price: priceValue,
        stock: parseInt(product.stock, 10),
        description: product.description ? product.description.trim() : '',
        category: product.category,
        sellerId: user.uid,
        imageData, // Store base64 image in Firestore
        createdAt: new Date().toISOString()
      };

      await addProduct(productData);

      alert('Product added successfully.');
      setProduct({ name: '', price: '', stock: '', description: '', category: '' });
      setSelectedFile(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
      navigate('/seller/dashboard');
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Failed to add product: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Format price for display: if decimal entered, show as 2000.50; if integer, show as 2000
  function formatPriceDisplay(price) {
    if (price === undefined || price === null || price === '') return '';
    const num = Number(price);
    if (Number.isNaN(num)) return price;
    if (price.toString().includes('.')) return num.toFixed(2);
    return num.toString();
  }

  return (
    <>
      <div className="add-product-page">
        <h1>Add New Product</h1>
        <form onSubmit={handleSubmit} className="product-form" noValidate>
          <div className="input-group">
            <label htmlFor="name">Product Name</label>
            <input id="name" name="name" type="text" value={product.name} onChange={handleInputChange} placeholder="Enter product name" required disabled={loading} />
          </div>

          <div className="input-group">
            <label htmlFor="price">Price (Rs)</label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              value={product.price}
              onChange={handleInputChange}
              placeholder="Enter price"
              required
              disabled={loading}
              min="0"
            />
            {product.price && (
              <div className="price-display">
                Display: Rs. {formatPriceDisplay(product.price)}
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="stock">Stock</label>
            <input id="stock" name="stock" type="number" value={product.stock} onChange={handleInputChange} placeholder="Enter stock quantity" required disabled={loading} min="0" />
          </div>

          <div className="input-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" value={product.description} onChange={handleInputChange} placeholder="Enter product description" disabled={loading} />
          </div>

          <div className="input-group">
            <label htmlFor="category">Category</label>
            {categoriesLoading ? <p>Loading categories...</p> : (
              <select id="category" name="category" value={product.category} onChange={handleInputChange} required disabled={loading || categories.length === 0}>
                <option value="">Select a category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name || cat.title || 'Unnamed'}</option>)}
              </select>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="image">Product Image</label>
            <input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} disabled={loading} />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Product preview" />
              </div>
            )}
          </div>

          <button type="submit" disabled={loading || categoriesLoading}>
            {loading ? 'Adding Product...' : 'Add Product'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .add-product-page { padding: 2rem; max-width: 600px; margin: 0 auto; min-height: calc(100vh - 120px); background: #f4f6f9; }
        h1 { font-size: 1.6rem; text-align: center; margin-bottom: 1rem; }
        .product-form { background: #fff; border-radius: 8px; padding: 1.25rem; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
        .input-group { margin-bottom: 1rem; }
        .input-group label { display:block; margin-bottom:.35rem; color:#333; }
        .input-group input, .input-group textarea, .input-group select { width:100%; padding:.7rem; border:1px solid #ddd; border-radius:6px; box-sizing:border-box; }
        .input-group textarea { min-height:100px; resize:vertical; }
        .image-preview { margin-top:.5rem; width:100%; height:220px; background:#fafafa; border:1px dashed #e0e0e0; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .image-preview img { width:100%; height:100%; object-fit:contain; }
        .price-display { font-size: 0.98rem; color: #2b6c2b; margin-top: 0.3rem; }
        button { width:100%; padding:.75rem; border-radius:6px; background:#28a745; color:#fff; border:none; cursor:pointer; font-size:1rem; }
        button:disabled { background:#cfcfcf; cursor:not-allowed; }
      `}</style>
    </>
  );
};

export default AddProduct;