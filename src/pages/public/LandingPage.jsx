import React, { useEffect, useState } from "react";
import { getProducts } from "../../services/firebase.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

const sliderImages = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
];

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [sortedProducts, setSortedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

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

  const goToSlide = (i) => setCurrentSlide(i);

  return (
    <div className="landing">
      <div className="topbar">
        <span>⭐ 18 Million+ Satisfied Customers</span>
        <span>30 Days Hassle-Free Returns</span>
        <span>1 Year International Warranty</span>
      </div>

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

      <section className="slider-section">
        <div className="slider">
          {sliderImages.map((img, idx) => (
            <div
              key={idx}
              className={`slide ${currentSlide === idx ? "active" : ""}`}
              style={{ backgroundImage: `url(${img})` }}
            >
              {currentSlide === idx && (
                <div className="caption">
                  <h2>
                    {idx === 0 && "New Arrivals"}
                    {idx === 1 && "Premium Shoes"}
                    {idx === 2 && "Luxury Bags"}
                    {idx === 3 && "Makeup & Accessories"}
                  </h2>
                  <p>
                    {idx === 0 && "Discover our latest fashion trends!"}
                    {idx === 1 && "Step up your style game."}
                    {idx === 2 && "Carry elegance wherever you go."}
                    {idx === 3 && "Glow with premium makeup products."}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div className="slider-controls">
            {sliderImages.map((_, idx) => (
              <span
                key={idx}
                className={`dot${currentSlide === idx ? " active" : ""}`}
                onClick={() => goToSlide(idx)}
              ></span>
            ))}
          </div>
        </div>
      </section>

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

      <section className="info-section">
        <div className="info-container">
          <h2>Why Choose Saadi Collection?</h2>
          <p>
            Elevate your shopping experience with our curated selection of premium fashion, accessories, and lifestyle products. 
            Unmatched quality, trendsetting designs, and customer-first service are at the heart of everything we do.
          </p>
          <ul>
            <li>✔️ Fast and Secure Delivery across Pakistan</li>
            <li>✔️ 24/7 Customer Support</li>
            <li>✔️ 100% Authentic Products</li>
            <li>✔️ Multiple Payment Methods</li>
            <li>✔️ Weekly New Arrivals & Exclusive Discounts</li>
          </ul>
          <div className="info-buttons">
            <button onClick={() => navigate("/categories")}>
              Explore Categories
            </button>
            <button onClick={() => navigate("/contact")}>
              Contact Support
            </button>
          </div>
        </div>
      </section>

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
        .topbar { display:flex; justify-content:space-around; background:#f5f5f5; padding:0.8rem; font-size:0.9rem; font-weight:500; color:#333; border-bottom:1px solid #ddd; }
        .hero { background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("https://images.unsplash.com/photo-1521334884684-d80222895322") no-repeat center center/cover; color:#fff; text-align:center; padding:6rem 2rem; }
        .hero h1 { font-size:3rem; color:#f4c542; }
        .hero p { font-size:1.3rem; margin-top:1rem; max-width:800px; margin-left:auto; margin-right:auto; }
        .hero button { margin-top:1.5rem; padding:0.8rem 2rem; border:none; background:#f4c542; color:#1a1a1a; font-size:1.1rem; font-weight:bold; border-radius:8px; cursor:pointer; transition:0.3s; }
        .hero button:hover { background:#e0b631; }
        .slider-section { width: 100%; max-width: 1200px; margin: 3rem auto 0 auto; padding: 0 2rem; box-sizing:border-box; }
        .slider { position:relative; width:100%; height:340px; overflow:hidden; border-radius:22px; box-shadow:0 8px 32px rgba(0,0,0,0.12); background: #fafafa;}
        .slide {
          position:absolute;
          top:0; left:0; width:100%; height:100%;
          background-size:cover;
          background-position:center;
          opacity:0; transition:opacity 1s cubic-bezier(.77,0,.18,1);
          z-index:1;
          display:flex; align-items:center; justify-content:center;
        }
        .slide.active { opacity:1; z-index:2; }
        .caption {
          background:rgba(0,0,0,0.35);
          color:#fff;
          padding:2rem 2.2rem;
          border-radius:14px;
          box-shadow:0 2px 12px rgba(0,0,0,0.12);
          text-align:center;
          max-width:420px;
        }
        .caption h2 { font-size:2.1rem; margin-bottom:1rem; color:#f4c542;}
        .caption p { font-size:1.15rem; }
        .slider-controls {
          position:absolute; bottom:16px; left:0; right:0; display:flex; justify-content:center; gap:9px;
        }
        .slider-controls .dot {
          width:16px; height:16px; background:#fff; border-radius:50%; opacity:0.4; cursor:pointer; border:2px solid #f4c542; transition:opacity 0.2s;
        }
        .slider-controls .dot.active { opacity:0.95; background:#f4c542; border-color:#333; }
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
        .info-section {
          background: linear-gradient(90deg,#f4c54233 0%, #fff 100%);
          padding: 3.5rem 2rem 4.5rem 2rem;
          margin-top: 3rem;
          border-radius: 18px;
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
          box-shadow: 0 6px 28px rgba(0,0,0,0.07);
        }
        .info-container { max-width: 720px; margin: 0 auto; text-align: center; }
        .info-container h2 {
          font-size: 2.3rem;
          color: #1a1a1a;
          margin-bottom: 1.1rem;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .info-container p {
          font-size: 1.22rem;
          color: #555;
          margin-bottom: 2.1rem;
        }
        .info-container ul {
          list-style: none;
          padding: 0;
          margin: 0 0 2.2rem 0;
        }
        .info-container ul li {
          font-size: 1.09rem;
          color: #222;
          margin-bottom: 1rem;
          padding-left: 0.2rem;
          text-align: left;
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
        }
        .info-buttons {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 1.2rem;
        }
        .info-buttons button {
          padding: 0.8rem 2rem;
          border: none;
          background: #1a1a1a;
          color: #fff;
          font-size: 1rem;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .info-buttons button:hover {
          background: #f4c542;
          color: #222;
        }
        .whatsapp-float {
          position: fixed;
          bottom: 22px;
          right: 22px;
          z-index: 9999;
          width: 54px;
          height: 54px;
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
        @media (max-width:1200px) {
          .slider-section { max-width: 100vw; }
        }
        @media (max-width:1100px) {
          .slider-section { padding: 0 0.5rem; }
          .info-section { padding:2rem 0.8rem 3rem 0.8rem; }
        }
        @media (max-width:900px) {
          .slider-section { padding:0; }
        }
        @media (max-width:768px) {
          .hero h1 { font-size:2.2rem; }
          .slider-section {padding: 0; margin: 2rem auto 0 auto; max-width:100vw;}
          .slider { height: 200px; border-radius: 12px; }
          .caption { padding: 1rem 0.6rem; max-width: 260px; }
          .info-section { padding:1.2rem 0.5rem 2rem 0.5rem; }
          .info-container h2 { font-size:1.3rem; }
          .info-container p { font-size:0.99rem; }
          .info-container ul li { font-size:0.95rem; }
          .info-buttons button { font-size:0.95rem; padding:0.7rem 1.5rem; }
        }
        @media (max-width:600px) {
          .slider-section {padding: 0; margin: 1rem auto 0 auto; width: 100vw; max-width: 100vw;}
          .slider { height: 120px; border-radius: 7px;}
          .caption { padding: 0.6rem 0.3rem; max-width: 160px;}
          .whatsapp-float {right: 12px; bottom: 12px; width: 46px; height: 46px;}
          .info-section { padding:0.7rem 0.1rem 1.4rem 0.1rem; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;