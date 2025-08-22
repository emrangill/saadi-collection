import React, { useEffect, useState } from "react";
import { getProducts } from "../../services/firebase.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [sortedProducts, setSortedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productsData = (await getProducts()) || [];
        const available = productsData.filter((p) => Number(p.stock) > 0);
        const limited = available.slice(0, 12);
        setProducts(limited);
        setSortedProducts(limited);
      } catch (err) {
        console.error("Failed to load products:", err);
        setProducts([]);
        setSortedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewProduct = (id) => {
    if (!user) {
      navigate(`/login?redirect=/buyer/product/${id}`);
    } else {
      navigate(`/buyer/product/${id}`);
    }
  };

  const handleSort = (option) => {
    let sorted = [...products];
    if (option === "low") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    if (option === "high") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    setSortedProducts(sorted);
  };

  return (
    <div className="landing">

      {/* Hero Section */}
      <section className="hero">
        <h1>
          Welcome to <span>Saadi Collection</span>
        </h1>
        <p>
          Discover the perfect blend of fashion and elegance. From trendy
          clothes 👗 to premium shoes 👞, stylish bags 👜 to makeup 💄 –{" "}
          <b> Saadi Collection </b> is your one-stop destination.
        </p>
        <button onClick={() => navigate("/about")}>Learn More</button>
      </section>

      {/* Products Section */}
      <section className="products">
        <div className="products-header">
          <span>{sortedProducts.length} Products</span>
          <select onChange={(e) => handleSort(e.target.value)}>
            <option>Featured</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <p className="loading">Loading products...</p>
        ) : (
          <div className="grid">
            {sortedProducts.map((p) => (
              <div key={p.id} className="card" onClick={() => handleViewProduct(p.id)}>
                <div className="img-wrap">
                  <img src={p.imageData || "/placeholder.jpg"} alt={p.name} />
                  {p.discount && <span className="badge">-{p.discount}%</span>}
                </div>
                <div className="card-body">
                  <h3>{p.name}</h3>
                  <div className="price">
                    <span className="new">Rs.{Number(p.price).toFixed(2)}</span>
                    {p.oldPrice && <span className="old">Rs.{Number(p.oldPrice).toFixed(2)}</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleViewProduct(p.id); }}>
                    View Product
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Brand Info Section - attractive background */}
      <section className="brand-info">
        <div className="brand-info-bg">
          <div className="brand-info-content">
            <div className="brand-info-title">
              <h2>Why Choose <span className="highlight">Saadi Collection?</span></h2>
            </div>
            <div className="brand-info-features">
              <div className="feature">
                <span className="feature-icon">🛍️</span>
                <div>
                  <h3>Exclusive Products</h3>
                  <p>Only the best for your wardrobe – premium quality, latest trends, and unique finds.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <div>
                  <h3>Fast Delivery</h3>
                  <p>Reliable nationwide shipping, so your favorites reach you quickly and safely.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">💳</span>
                <div>
                  <h3>Secure Payments</h3>
                  <p>Shop with confidence using multiple secure payment options.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🎁</span>
                <div>
                  <h3>Weekly New Arrivals</h3>
                  <p>Stay ahead in fashion with fresh styles added every week.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🤝</span>
                <div>
                  <h3>24/7 Customer Care</h3>
                  <p>Our friendly team is always available for your questions and support.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="brand-info-image">
            <img
              src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80"
              alt="Saadi Collection Brand"
            />
          </div>
        </div>
      </section>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/923165548374"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
      >
        <svg width="34px" height="34px" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#25D366"/>
          <path
            d="M21.309 18.924c-.36-.18-2.131-1.052-2.462-1.172-.33-.12-.57-.18-.81.18-.24.36-.93 1.172-1.142 1.412-.21.24-.42.27-.78.09-.36-.18-1.513-.557-2.883-1.776-1.065-.951-1.787-2.122-1.996-2.481-.209-.36-.022-.554.158-.732.162-.161.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.294-.708-.59-.61-.81-.62-.21-.009-.45-.011-.69-.011-.24 0-.63.09-.96.42-.33.33-1.258 1.23-1.258 3.001s1.289 3.486 1.469 3.726c.18.24 2.538 3.86 6.145 5.254.86.296 1.531.473 2.054.605.863.217 1.65.187 2.27.113.693-.082 2.131-.87 2.434-1.71.303-.84.303-1.563.213-1.713-.09-.15-.33-.24-.69-.42z"
            fill="#fff"
          />
        </svg>
      </a>

      <style jsx>{`
        .landing { padding: 0; margin: 0; }
        .hero {
          background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("https://images.unsplash.com/photo-1521334884684-d80222895322") no-repeat center center/cover;
          color: #fff;
          text-align: center;
          padding: 6rem 2rem;
        }
        .hero h1 { font-size:3rem; color:#f4c542; }
        .hero p { font-size:1.3rem; margin-top:1rem; max-width:800px; margin-left:auto; margin-right:auto; }
        .hero button { margin-top:1.5rem; padding:0.8rem 2rem; border:none; background:#f4c542; color:#1a1a1a; font-size:1.1rem; font-weight:bold; border-radius:8px; cursor:pointer; transition:0.3s; }
        .hero button:hover { background:#e0b631; }
        @media (max-width:768px) {
          .hero { padding:2.2rem 1rem 1.5rem 1rem; }
          .hero h1 { font-size:2rem; }
          .hero p { font-size:1.05rem; }
          .hero button { font-size:1rem; padding:0.7rem 1.2rem; }
        }
        .products { margin-top:3rem; padding:2rem; }
        .products-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; }
        .products-header select { padding:0.6rem 0.8rem; border:1px solid #ccc; border-radius:6px; outline:none; }
        .loading { text-align:center; font-size:1.2rem; color:#555; }
        .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:1.8rem; }
        .card { background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 6px 16px rgba(0,0,0,0.08); transition:all 0.3s ease; cursor:pointer; }
        .card:hover { transform:translateY(-6px); box-shadow:0 8px 20px rgba(0,0,0,0.12); }
        .img-wrap { position:relative; background:#fff; text-align:center; height:220px; display:flex; align-items:center; justify-content:center; border-bottom:1px solid #eee; }
        .img-wrap img { width:100%; height:100%; object-fit:contain; }
        .badge { position:absolute; top:12px; left:12px; background:#ff3b3b; color:#fff; font-size:0.8rem; padding:4px 8px; border-radius:6px; font-weight:bold; }
        .card-body { padding:1rem; text-align:center; }
        .card-body h3 { font-size:1.1rem; font-weight:600; margin-bottom:0.5rem; color:#222; }
        .price { margin-bottom:0.8rem; }
        .price .new { font-size:1.2rem; font-weight:bold; color:#28a745; margin-right:8px; }
        .price .old { font-size:0.95rem; color:#999; text-decoration:line-through; }
        .card-body button { margin-top:0.5rem; padding:0.6rem 1.2rem; border:none; background:#1a1a1a; color:#fff; border-radius:6px; cursor:pointer; transition:background 0.3s ease; }
        .card-body button:hover { background:#28a745; }

        /* Brand Info Section - Attractive background */
        .brand-info {
          width: 100%;
          margin: 0 auto 2rem auto;
          display: flex;
          justify-content: center;
        }
        .brand-info-bg {
          background: linear-gradient(135deg,#f4c542 0%, #ff9c6d 60%, #fcb800 100%);
          border-radius: 28px;
          box-shadow: 0 10px 38px rgba(44,62,80,0.11);
          max-width: 1100px;
          width: 100%;
          padding: 2.8rem 2.2rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 2.2rem;
        }
        .brand-info-content {
          flex: 2 1 390px;
          min-width: 280px;
        }
        .brand-info-title h2 {
          font-size: 2.2rem;
          font-weight: 700;
          color: #222;
          margin-bottom: 1.2rem;
          letter-spacing: 0.5px;
        }
        .brand-info-title .highlight {
          color: #fff;
          background: #222;
          border-radius: 7px;
          padding: 2px 10px;
        }
        .brand-info-features {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .feature {
          display: flex;
          align-items: flex-start;
          gap: 1.1rem;
          background: rgba(255,255,255,0.97);
          border-radius: 12px;
          box-shadow: 0 2px 18px rgba(44,62,80,0.03);
          padding: 1.1rem 1rem;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .feature:hover {
          box-shadow: 0 6px 24px rgba(244,197,66,0.14);
          transform: translateY(-2px) scale(1.02);
        }
        .feature-icon {
          font-size: 2.1rem;
          color: #f4c542;
          margin-right: 0.1rem;
          flex-shrink: 0;
        }
        .feature h3 {
          font-size: 1.15rem;
          font-weight: 700;
          margin: 0 0 0.2rem 0;
          color: #222;
        }
        .feature p {
          font-size: 1rem;
          margin: 0;
          color: #444;
        }
        .brand-info-image {
          flex: 1 1 270px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-info-image img {
          width: 100%;
          max-width: 310px;
          min-width: 200px;
          border-radius: 18px;
          box-shadow: 0 4px 18px rgba(44,62,80,0.12);
          object-fit: cover;
        }
        @media (max-width:1100px){
          .brand-info-bg {
            flex-direction: column-reverse;
            padding: 2rem 0.7rem;
            gap: 1.5rem;
          }
          .brand-info-image {
            margin-bottom: 1.3rem;
          }
          .brand-info-title h2 {
            font-size: 1.6rem;
          }
        }
        @media (max-width:700px) {
          .brand-info-bg {
            padding: 1.5rem 0.2rem;
          }
          .brand-info-title h2 {
            font-size: 1.15rem;
          }
          .brand-info-content {
            min-width: 160px;
          }
          .feature h3 { font-size: 1rem; }
          .feature p { font-size: 0.92rem; }
          .feature-icon { font-size: 1.5rem; }
          .brand-info-image img { max-width: 190px; border-radius: 11px; }
        }

        .whatsapp-float {
          position: fixed;
          bottom: 60px;
          right: 16px;
          z-index: 9999;
          width: 46px;
          height: 46px;
          background: #25D366;
          border-radius: 50%;
          box-shadow: 0 6px 18px rgba(0,0,0,0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: box-shadow 0.2s;
        }
        .whatsapp-float:hover {
          box-shadow: 0 10px 24px rgba(0,0,0,0.22);
          background: #21c65a;
        }
        .whatsapp-float svg {
          display: block;
        }
        @media (max-width:600px) {
          .whatsapp-float { bottom: 110px; right: 10px; width: 38px; height: 38px; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;