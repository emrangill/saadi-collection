import React, { useState } from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaTelegramPlane,
  FaTwitter,
  FaWhatsapp,
  FaEnvelope,
  FaCcVisa,
  FaCcMastercard,
  FaCcPaypal,
  FaCreditCard
} from "react-icons/fa";

const Footer = () => {
  const [email, setEmail] = useState("");
  const year = new Date().getFullYear();

  const submitNewsletter = (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    // placeholder: integrate with your newsletter service later
    alert(`Thanks — ${email} subscribed.`);
    setEmail("");
  };

  return (
    <>
      <footer className="sc-footer" role="contentinfo">
        <div className="inner">
          {/* Column 1: Brand */}
          <div className="col brand-col">
            <div className="brand">
              <div className="logo-wrap" aria-hidden>
                <img src="/Saadi.png" alt="Saadi Collections logo" />
              </div>
              <div className="brand-text">
                <h3>Saadi Collections</h3>
                <p className="desc">
                  Curated ethnic & modern wear — premium fabrics, fair prices and reliable delivery.
                </p>
              </div>
            </div>

            <div className="payments" aria-hidden>
              <FaCcVisa className="pay" title="Visa" />
              <FaCcMastercard className="pay" title="Mastercard" />
              <FaCcPaypal className="pay" title="PayPal" />
              <FaCreditCard className="pay" title="Cards" />
            </div>
          </div>

          {/* Column 2: Location (Faisalabad) with embedded map */}
          <div className="col location-col" aria-label="Our location">
            <h4>Location</h4>

            <div className="map-card" role="region" aria-label="Map showing Faisalabad">
              <div className="map-embed">
                <iframe
                  title="Saadi Collections - Faisalabad location"
                  src="https://www.google.com/maps?q=Faisalabad,+Pakistan&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="map-caption">
                <strong>Visit us — Faisalabad</strong>
                <div>Saadi Collections (Representative)</div>
                <div>Faisalabad, Punjab, Pakistan</div>
              </div>
            </div>
          </div>

          {/* Column 3: Newsletter + Social */}
          <div className="col connect-col">
            <h4>Stay in touch</h4>
            <p className="muted">Get offers, restocks & early access — unsubscribe anytime.</p>

            <form className="newsletter" onSubmit={submitNewsletter}>
              <label htmlFor="sc-newsletter" className="sr-only">Email address</label>
              <input
                id="sc-newsletter"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email for newsletter"
              />
              <button type="submit" aria-label="Subscribe to newsletter">Subscribe</button>
            </form>

            <div className="social" aria-label="Social links">
              <a href="https://wa.me/923165548374" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer"><FaWhatsapp /></a>
              <a href="https://t.me/SaadiCollection" aria-label="Telegram" target="_blank" rel="noopener noreferrer"><FaTelegramPlane /></a>
              <a href="https://youtube.com/@saadicollection.4469" aria-label="YouTube" target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
              <a href="https://facebook.com/profile.php?id=61579311066499" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
              <a href="https://instagram.com/saadicollection313" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
              <a href="https://tiktok.com/@saadi_collection.com" aria-label="TikTok" target="_blank" rel="noopener noreferrer"><FaTiktok /></a>
              <a href="https://x.com/sadicollection1" aria-label="X / Twitter" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
              <a href="mailto:saadicollection18@gmail.com" aria-label="Email" target="_blank" rel="noopener noreferrer"><FaEnvelope /></a>
            </div>
          </div>
        </div>

        <div className="bar">
          <div className="bar-left">
            <small>© {year} Saadi Collections. All rights reserved.</small>
          </div>
          <div className="bar-right">
            <nav className="foot-nav" aria-label="Footer navigation">
              <a href="/sitemap.xml">Sitemap</a>
              <a href="/contact">Contact</a>
            </nav>
          </div>
        </div>

        <button
          className="back-to-top"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Back to top"
        >
          ↑
        </button>
      </footer>

      <a
        href="https://wa.me/923165548374"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <FaWhatsapp size={22} />
      </a>

      <style jsx>{`
        /* All footer styles scoped under .sc-footer to avoid leaking to other pages */
        .sc-footer {
          --muted: #9aa3af;
          --accent: #facc15;
          --card: #0b1721;
          --icon-bg: rgba(255,255,255,0.03);
          --icon-hover-bg: rgba(250,204,21,0.12);

          background: linear-gradient(180deg, var(--card) 0%, #081224 100%);
          color: #fff;
          padding: 40px 18px 18px;
          position: relative;
          overflow: hidden;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          border-top: 1px solid rgba(255,255,255,0.02);
        }

        .sc-footer .inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 420px 360px;
          gap: 28px;
          align-items: stretch; /* columns stretch to same height */
          align-content: start;
          grid-auto-rows: auto;
        }

        .sc-footer .col {
          display: flex;
          flex-direction: column;
        }

        /* BRAND column adjustments:
           - Increase logo and text size
           - Give the brand block a desktop-only minimum height to fill the column
           - Center the brand text vertically so the block looks balanced and no empty gap remains
        */
        .sc-footer .brand-col { }

        .sc-footer .brand {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          height: 100%;
        }

        /* desktop-only min-height to match map height + caption so brand fills available space */
        @media (min-width: 981px) {
          .sc-footer .brand {
            min-height: 220px; /* increase this number if you want the brand block taller */
          }
        }

        .sc-footer .brand-text {
          display: flex;
          flex-direction: column;
          justify-content: center; /* vertically center brand text within the brand block */
        }

        .sc-footer .logo-wrap img {
          width:98px;    /* increased logo size */
          height:98px;
          object-fit:contain;
          border-radius:12px;
          background:#fff;
          padding:10px;
          box-shadow: 0 8px 26px rgba(2,6,23,0.35);
        }
        .sc-footer .brand-text h3 {
          margin:0 0 8px;
          font-size:1.25rem;   /* larger heading */
          color:#fff;
          letter-spacing:0.2px;
        }
        .sc-footer .desc {
          margin:0;
          color:var(--muted);
          line-height:1.45;
          font-size:1.02rem;   /* slightly larger description to increase vertical space */
          max-width:520px;
        }

        /* payments pinned to bottom so brand column visually fills height like the map column */
        .sc-footer .payments {
          display:flex;
          gap:10px;
          margin-top: 14px;
          margin-bottom: 0;
          /* push payments to bottom of the column */
          margin-top: auto;
        }
        .sc-footer .payments .pay { color:#dfe6ea; font-size:20px; opacity:0.95; }

        /* Location column: keep reduced map height */
        .sc-footer .location-col h4 { margin:0 0 8px; color:#fff; font-size:1rem; }
        .sc-footer .map-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.03);
          padding: 10px;
          border-radius: 12px;
          display: flex;
          gap: 12px;
          align-items: stretch;
          flex-direction: column;
        }
        .sc-footer .map-embed {
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          background: #000;
        }
        .sc-footer .map-embed iframe {
          width: 100%;
          height: 160px;
          border: 0;
          display: block;
        }
        .sc-footer .map-caption {
          color: #e6eef7;
          font-size: 0.95rem;
          line-height: 1.3;
        }
        .sc-footer .map-caption strong { color: #fff; display:block; margin-bottom:6px; }

        /* Connect column */
        .sc-footer .connect-col h4 { margin:0 0 8px; color:#fff; font-size:1rem; }
        .sc-footer .muted { color:var(--muted); margin:0 0 10px; font-size:0.95rem; }

        .sc-footer .newsletter {
          display:flex;
          gap:10px;
          margin: 8px 0 12px;
          align-items: center;
        }
        .sc-footer .newsletter input {
          flex:1;
          padding:10px 12px;
          border-radius:10px;
          border:1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          color:#fff;
          outline:none;
          font-size:0.95rem;
        }
        .sc-footer .newsletter input::placeholder { color: rgba(255,255,255,0.5); }

        .sc-footer .newsletter button {
          padding:10px 14px;
          border-radius:10px;
          border:none;
          background: linear-gradient(90deg, var(--accent), #e09b14);
          color:#071327;
          font-weight:800;
          cursor:pointer;
          font-size:0.95rem;
        }
        .sc-footer .newsletter button:hover { transform: translateY(-2px); }

        .sc-footer .social {
          display: grid;
          grid-template-columns: repeat(4, 48px);
          gap: 10px;
          margin-top: 8px;
        }
        .sc-footer .social a {
          width:48px;
          height:48px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          background: var(--icon-bg);
          color:#fff;
          border-radius:10px;
          text-decoration:none;
          transition: transform .14s ease, background .14s ease, color .14s ease;
          box-shadow: 0 8px 22px rgba(3,8,18,0.34);
        }
        .sc-footer .social a svg { width:18px; height:18px; }
        .sc-footer .social a:hover {
          transform: translateY(-6px);
          background: var(--icon-hover-bg);
          color: var(--accent);
        }

        /* Bottom bar */
        .sc-footer .bar {
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: 16px;
          padding-top: 12px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .sc-footer .bar-left small { color: var(--muted); }
        .sc-footer .foot-nav a { color: var(--muted); margin-left: 12px; text-decoration:none; font-size:0.95rem; }
        .sc-footer .foot-nav a:hover { color: var(--accent); }

        .sc-footer .back-to-top {
          position: absolute;
          right: 18px;
          bottom: 58px;
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: none;
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          transition: transform .12s ease, background .12s ease;
        }
        .sc-footer .back-to-top:hover { transform: translateY(-4px); background: rgba(250,204,21,0.12); color: var(--accent); }

        .sc-footer .whatsapp-float {
          position: fixed;
          bottom: 14px;
          right: 14px;
          background: linear-gradient(180deg,#25d366,#1aa35c);
          color: white;
          border-radius: 50%;
          padding: 12px;
          box-shadow: 0 10px 28px rgba(10,20,30,0.35);
          z-index: 1000;
          transition: transform 0.2s ease;
        }
        .sc-footer .whatsapp-float:hover { transform: scale(1.05); }

        /* Tablet */
        @media (max-width: 980px) {
          .sc-footer .inner { grid-template-columns: 1fr 360px; gap:22px; padding: 0 16px; }
          .sc-footer .map-embed iframe { height: 140px; }
          .sc-footer .social { grid-template-columns: repeat(6, 44px); justify-content:start; }
          .sc-footer .back-to-top { bottom: 76px; right: 16px; }
        }

        /* Mobile: stacked layout, smaller map height, subscribe button under input */
        @media (max-width: 640px) {
          .sc-footer .inner { grid-template-columns: 1fr; gap:16px; padding: 0 12px; }
          .sc-footer .logo-wrap img { width:60px; height:60px; }
          .sc-footer .map-embed iframe { height: 120px; }
          .sc-footer .newsletter { flex-direction: column; gap:10px; align-items: stretch; }
          .sc-footer .newsletter input { width: 100%; }
          .sc-footer .newsletter button { width: 100%; }
          .sc-footer .social {
            grid-template-columns: repeat(4, 56px);
            justify-content: center;
            gap:12px;
            margin-top: 12px;
          }
          .sc-footer .social a { width:56px; height:56px; border-radius:12px; box-shadow: 0 8px 26px rgba(3,8,18,0.38); }
          .sc-footer .back-to-top { display:none; }
          .sc-footer .bar { flex-direction: column; align-items:center; gap:12px; text-align:center; padding-top:14px; }
          .sc-footer .foot-nav a { margin-left: 8px; margin-right:8px; }
        }

        .sc-footer .sr-only { position: absolute !important; height: 1px; width: 1px; overflow: hidden; clip: rect(1px, 1px, 1px, 1px); white-space: nowrap; }
      `}</style>
    </>
  );
};

export default Footer;