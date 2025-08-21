import React from "react";

const About = () => {
  return (
    <>
      <div className="about-container">
        {/* Hero Section */}
        <section className="about-hero">
          <h1>About Saadi Collections</h1>
          <p>Your Style, Your Choice – Fashion That Defines You!</p>
        </section>

        {/* Our Story */}
        <section className="about-section bg-light">
          <h2>Our Story</h2>
          <p>
            Saadi Collections started with a vision: to bring{" "}
            <strong>premium quality fashion</strong> to everyone at affordable
            prices. From stylish clothing to trendy bags, premium shoes, makeup
            essentials, and accessories – we are your one-stop shop for
            everything fashion.
          </p>
          <p>
            Our mission is simple – make fashion{" "}
            <strong>accessible, reliable, and affordable</strong> for all. Every
            product is carefully curated to ensure top-notch quality that
            empowers your style.
          </p>
        </section>

        {/* What We Offer */}
        <section className="about-section bg-white">
          <h2>What We Offer</h2>
          <div className="offer-grid">
            <div className="offer-card">👗 Trendy Clothes</div>
            <div className="offer-card">👜 Bags & Accessories</div>
            <div className="offer-card">👞 Premium Shoes</div>
            <div className="offer-card">💄 Makeup Essentials</div>
            <div className="offer-card">⌚ Smart Watches</div>
            <div className="offer-card">✨ Exclusive Deals</div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="about-section bg-light">
          <h2>Why Choose Us?</h2>
          <div className="why-grid">
            <div className="why-card">
              <h3>💎 Premium Quality</h3>
              <p>
                We handpick the best products to ensure{" "}
                <strong>top-notch quality</strong>.
              </p>
            </div>
            <div className="why-card">
              <h3>📦 Fast Delivery</h3>
              <p>
                Get your products delivered{" "}
                <strong>on time, every time</strong>.
              </p>
            </div>
            <div className="why-card">
              <h3>🤝 Trusted by Customers</h3>
              <p>
                Thousands of happy customers shop with us regularly and trust our
                service.
              </p>
            </div>
            <div className="why-card">
              <h3>💰 Affordable Prices</h3>
              <p>
                High-quality fashion at <strong>pocket-friendly rates</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Call To Action */}
        <section className="cta">
          <h2>Start Shopping with Us Today!</h2>
          <p>
            Discover the latest fashion trends and enjoy premium quality at
            unbeatable prices.
          </p>
          <button onClick={() => (window.location.href = "/categories")}>
            Explore Categories
          </button>
        </section>
      </div>

      {/* ✅ CSS Styling */}
      <style jsx>{`
        .about-container {
          font-family: "Inter", sans-serif;
          color: #333;
        }

        /* Hero Section */
        .about-hero {
          background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),
            url("https://images.unsplash.com/photo-1521334884684-d80222895322")
              no-repeat center center/cover;
          color: #fff;
          text-align: center;
          padding: 6rem 2rem;
        }
        .about-hero h1 {
          font-size: 3rem;
          color: #f4c542;
        }
        .about-hero p {
          font-size: 1.3rem;
          margin-top: 1rem;
        }

        /* Section Backgrounds */
        .bg-light {
          background: #fafafa;
        }
        .bg-white {
          background: #ffffff;
        }

        /* Sections */
        .about-section {
          padding: 4rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
          text-align: center;
        }
        .about-section h2 {
          font-size: 2rem;
          margin-bottom: 1.5rem;
          color: #1a1a1a;
        }
        .about-section p {
          font-size: 1.1rem;
          line-height: 1.6;
        }

        /* Offers */
        .offer-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr); /* ✅ 3 cards per row */
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .offer-card {
          background: #fff;
          padding: 2rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          font-weight: bold;
          font-size: 1.1rem;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .offer-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        /* Why Choose Us */
        .why-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .why-card {
          background: #fff;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s;
        }
        .why-card:hover {
          transform: translateY(-5px);
        }

        /* CTA Section */
        .cta {
          background: #1a1a1a;
          color: #fff;
          text-align: center;
          padding: 4rem 2rem;
        }
        .cta h2 {
          font-size: 2.5rem;
          color: #f4c542;
        }
        .cta button {
          margin-top: 1.5rem;
          padding: 0.8rem 2rem;
          border: none;
          background: #f4c542;
          color: #1a1a1a;
          font-size: 1.1rem;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: 0.3s;
        }
        .cta button:hover {
          background: #e0b631;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .about-hero h1 {
            font-size: 2.2rem;
          }
          .about-hero p {
            font-size: 1rem;
          }
          .about-section {
            padding: 2rem 1rem;
          }
          .offer-grid {
            grid-template-columns: repeat(2, 1fr); /* ✅ Mobile pe 2 per row */
          }
        }

        @media (max-width: 480px) {
          .offer-grid {
            grid-template-columns: 1fr; /* ✅ Small screens pe 1 card per row */
          }
        }
      `}</style>
    </>
  );
};

export default About;
