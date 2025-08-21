import React, { useState, useEffect } from "react";
import { getCategories, getProducts } from "../../services/firebase.js";
import CategoryCard from "../../components/CategoryCard.jsx";
import { useNavigate } from "react-router-dom";

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load categories
  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = (await getCategories()) || [];
        if (!mounted) return;
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Failed to load categories: " + (err.message || err));
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    };
    fetchCategories();
    return () => {
      mounted = false;
    };
  }, []);

  // Helpers
  const clearCategoryProducts = () => {
    setCategoryProducts([]);
  };

  const productMatchesCategory = (p, category) => {
    if (!category || !p) return false;
    const catId = category.id != null ? String(category.id) : "";
    const catName = category.name != null ? String(category.name).toLowerCase() : "";

    const productCatValues = [
      p.category,
      p.categoryId,
      p.category_id,
      p.categoryName,
      p.categoryName?.toLowerCase?.(),
      p.category_name?.toLowerCase?.(),
    ].map((v) => (v == null ? "" : String(v)));

    // id OR name match; also ensure stock > 0
    return (
      Number(p.stock) > 0 &&
      (productCatValues.includes(catId) || productCatValues.some((v) => v.toLowerCase() === catName))
    );
  };

  // When category clicked, load products for that category
  const handleSelectCategory = async (category) => {
    setSelectedCategory(category);
    setProductsLoading(true);
    setError(null);

    try {
      const allProducts = (await getProducts()) || [];
      const filtered = allProducts.filter((p) => productMatchesCategory(p, category));
      setCategoryProducts(filtered);
    } catch (err) {
      console.error("Error fetching products for category:", err);
      setError("Failed to load products: " + (err.message || err));
      setCategoryProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  return (
    <div className="categories-page">
      {/* Hero */}
      <header className="hero">
        <div className="hero-content">
          <h1>
            Explore <span>Categories</span>
          </h1>
          <p>Discover our wide range of fashion, accessories, and lifestyle products.</p>
        </div>
      </header>

      {/* Categories */}
      <section className="categories-section">
        {categoriesLoading ? (
          <p>Loading categories...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : categories.length === 0 ? (
          <p>No categories available</p>
        ) : (
          <div className="categories-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleSelectCategory(category)}
                className={`category-tile ${selectedCategory && selectedCategory.id === category.id ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSelectCategory(category);
                }}
              >
                <CategoryCard category={category} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Products for selected category */}
      {selectedCategory && (
        <section className="products-section">
          <div className="products-header">
            <h2>{selectedCategory.name} Products</h2>
            <div>
              <button onClick={() => { setSelectedCategory(null); clearCategoryProducts(); }}>Back to categories</button>
            </div>
          </div>

          {productsLoading ? (
            <p>Loading products...</p>
          ) : categoryProducts.length === 0 ? (
            <p>No products available in this category.</p>
          ) : (
            <div className="products-grid">
              {categoryProducts.map((p) => (
                <article key={p.id} className="product-card">
                  <div
                    className="image-wrap"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/buyer/product/${p.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") navigate(`/buyer/product/${p.id}`); }}
                  >
                    <img src={p.imageData || "/placeholder.jpg"} alt={p.name} />
                    <div className="card-actions">
                      <button
                        className="view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/buyer/product/${p.id}`);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>

                  <div className="info">
                    <h3>{p.name}</h3>
                    <p className="desc">{(p.description || "").slice(0, 80)}</p>
                    <div className="price-row">
                      {p.oldPrice ? <span className="old-price">Rs.{Number(p.oldPrice).toFixed(2)}</span> : null}
                      <span className="price">Rs.{Number(p.price).toFixed(2)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <style jsx>{`
        .categories-page {
          background: #f7fafc;
          min-height: 100vh;
          font-family: "Inter", sans-serif;
        }
        .hero {
          background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("https://images.unsplash.com/photo-1521334884684-d80222895322") no-repeat center/cover;
          color:#fff; text-align:center; padding:5rem 2rem;
        }
        .hero h1 { font-size:3rem; font-weight:800; }
        .hero span { color:#f4c542; }
        .categories-section { padding:3rem 2rem; max-width:1400px; margin:0 auto; }
        .categories-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:1.5rem; }
        .category-tile { cursor:pointer; }
        .category-tile.active { outline: 3px solid rgba(7,123,255,0.12); border-radius:8px; }

        .products-section { padding:3rem 2rem; max-width:1400px; margin:0 auto; }
        .products-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; }

        .products-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:1.25rem; }
        .product-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(16,24,40,0.06);
          transition: transform 220ms ease, box-shadow 220ms ease;
          display:flex;
          flex-direction:column;
          cursor: default;
        }
        .product-card:hover { transform: translateY(-6px); box-shadow: 0 12px 32px rgba(16,24,40,0.12); }

        .image-wrap {
          position: relative;
          display:flex;
          align-items:center;
          justify-content:center;
          height:220px;
          overflow:hidden;
          background:linear-gradient(180deg,#fff 0%, #fbfbff 100%);
          cursor: pointer;
        }
        .image-wrap img { width:100%; height:100%; object-fit:cover; transition: transform 350ms ease; }
        .product-card:hover .image-wrap img { transform: scale(1.06); }

        .card-actions {
          position:absolute;
          right:12px;
          bottom:12px;
          display:flex;
          gap:8px;
          opacity:1;
        }
        .card-actions button {
          background: rgba(7,19,39,0.9);
          color:#fff;
          border:none;
          padding:0.45rem 0.7rem;
          border-radius:8px;
          font-weight:700;
          cursor:pointer;
          font-size:0.85rem;
        }
        .card-actions .view-btn { background: rgba(0,0,0,0.65); }

        .info { padding:1rem; display:flex; flex-direction:column; gap:0.5rem; }
        .info h3 { margin:0; font-size:1.05rem; color:#0b1721; min-height:2.4em; }
        .desc { margin:0; color:#52606d; font-size:0.92rem; min-height:2.4em; }
        .price-row { display:flex; gap:0.6rem; align-items:center; margin-top:auto; }
        .old-price { color:#9aa4ad; text-decoration: line-through; }
        .price { color:#0bb37a; font-weight:900; font-size:1.05rem; }

        @media (max-width: 768px) {
          .hero { padding:3rem 1rem; }
          .hero h1 { font-size:2rem; }
          .products-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:12px; }
          .image-wrap { height:160px; }
        }
      `}</style>
    </div>
  );
};

export default CategoriesPage;