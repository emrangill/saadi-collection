import React, { useRef, useState } from "react";
import emailjs from "@emailjs/browser";

/*
  Contact component updated to match LandingPage color palette and layout rhythm.
  - Exact accent colors pulled from the landing page: gold #f4c542, deep navy #0f4c81, dark text #1a1a1a.
  - Tightened spacing so there are no large empty gaps; buttons/status sit closer.
  - Two-column balanced layout on desktop, stacks on mobile (same responsive breakpoints as landing).
  - Removed file upload. EmailJS keys can be placed inline or via window.__EMAILJS_*.
  - Update: increased the desktop field spacing (horizontal gap between form fields) to look more professional.
*/

/* Replace with your EmailJS values or set window.__EMAILJS_SERVICE_ID / __EMAILJS_TEMPLATE_ID / __EMAILJS_PUBLIC_KEY */
const INLINE_SERVICE_ID = "service_wzqbmu3";
const INLINE_TEMPLATE_ID = "template_eo7i7v9";
const INLINE_PUBLIC_KEY = "11fBVUesq4MS8Iocq";

const resolveKeys = () => {
  if (typeof window !== "undefined") {
    const w = window;
    if (w.__EMAILJS_SERVICE_ID || w.__EMAILJS_TEMPLATE_ID || w.__EMAILJS_PUBLIC_KEY) {
      return {
        SERVICE_ID: w.__EMAILJS_SERVICE_ID,
        TEMPLATE_ID: w.__EMAILJS_TEMPLATE_ID,
        PUBLIC_KEY: w.__EMAILJS_PUBLIC_KEY,
      };
    }
  }
  try {
    // eslint-disable-next-line no-undef
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const im = import.meta.env;
      if (
        im.VITE_EMAILJS_SERVICE_ID ||
        im.VITE_EMAILJS_TEMPLATE_ID ||
        im.VITE_EMAILJS_PUBLIC_KEY
      ) {
        return {
          SERVICE_ID: im.VITE_EMAILJS_SERVICE_ID || null,
          TEMPLATE_ID: im.VITE_EMAILJS_TEMPLATE_ID || null,
          PUBLIC_KEY: im.VITE_EMAILJS_PUBLIC_KEY || null,
        };
      }
    }
  } catch (e) {
    // ignore
  }
  return {
    SERVICE_ID: INLINE_SERVICE_ID,
    TEMPLATE_ID: INLINE_TEMPLATE_ID,
    PUBLIC_KEY: INLINE_PUBLIC_KEY,
  };
};

const { SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY } = resolveKeys();

const Contact = () => {
  const formRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [values, setValues] = useState({
    from_name: "",
    from_email: "",
    phone: "",
    subject: "",
    order_id: "",
    preferred_contact: "email",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((p) => ({ ...p, [name]: value }));
    setStatus({ type: "", message: "" });
  };

  const validate = () => {
    if (!values.from_name.trim()) return "Please enter your full name.";
    if (!values.from_email.trim()) return "Please enter your email.";
    const re = /\S+@\S+\.\S+/;
    if (!re.test(values.from_email)) return "Please enter a valid email address.";
    if (!values.message.trim()) return "Please enter a short message.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    const err = validate();
    if (err) {
      setStatus({ type: "error", message: err });
      return;
    }

    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      setStatus({
        type: "error",
        message:
          "Email service not configured. Add your EmailJS IDs at the top of this file or set window.__EMAILJS_* before load.",
      });
      return;
    }

    setSending(true);

    const templateParams = {
      from_name: values.from_name,
      from_email: values.from_email,
      phone: values.phone || "",
      subject: values.subject || "General inquiry",
      order_id: values.order_id || "",
      preferred_contact: values.preferred_contact,
      message: values.message,
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      setStatus({ type: "success", message: "Message sent — we will respond shortly." });
      setValues({
        from_name: "",
        from_email: "",
        phone: "",
        subject: "",
        order_id: "",
        preferred_contact: "email",
        message: "",
      });
      if (formRef.current) formRef.current.reset();
    } catch (error) {
      console.error("EmailJS error", error);
      setStatus({ type: "error", message: "Failed to send message — please try again later." });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="contact-page">
        <div className="contact-card" role="region" aria-label="Contact support">
          <aside className="contact-side" aria-hidden="true">
            <div className="brand">
              <div className="logo">Saadi Collection</div>
              <div className="subtitle">Customer Support</div>
            </div>

            <div className="side-content">
              <h2 className="heading">How can we help today?</h2>
              <p className="lead">Briefly describe your request — include Order ID if relevant.</p>
            </div>

            <div className="side-foot">
              <div className="badge">Fast replies</div>
              <div className="mini">Usually within 24 hours</div>
            </div>
          </aside>

          <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="grid two">
              <label className="field">
                <span className="lbl">Full name <span className="req">*</span></span>
                <input name="from_name" value={values.from_name} onChange={handleChange} type="text" placeholder="John Doe" />
              </label>

              <label className="field">
                <span className="lbl">Email <span className="req">*</span></span>
                <input name="from_email" value={values.from_email} onChange={handleChange} type="email" placeholder="you@example.com" />
              </label>
            </div>

            <div className="grid two">
              <label className="field">
                <span className="lbl">Phone</span>
                <input name="phone" value={values.phone} onChange={handleChange} type="tel" placeholder="+92 300 0000000" />
              </label>

              <label className="field">
                <span className="lbl">Preferred</span>
                <select name="preferred_contact" value={values.preferred_contact} onChange={handleChange}>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </label>
            </div>

            <div className="grid two">
              <label className="field">
                <span className="lbl">Subject</span>
                <input name="subject" value={values.subject} onChange={handleChange} type="text" placeholder="Subject (e.g. Order issue)" />
              </label>

              <label className="field">
                <span className="lbl">Order ID (optional)</span>
                <input name="order_id" value={values.order_id} onChange={handleChange} type="text" placeholder="e.g. ORD12345" />
              </label>
            </div>

            <label className="field message">
              <span className="lbl">Message <span className="req">*</span></span>
              <textarea name="message" value={values.message} onChange={handleChange} placeholder="How can we help?" rows="6" />
            </label>

            <div className="actions">
              <button className="btn primary" type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send Message"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setValues({
                    from_name: "",
                    from_email: "",
                    phone: "",
                    subject: "",
                    order_id: "",
                    preferred_contact: "email",
                    message: "",
                  });
                  setStatus({ type: "", message: "" });
                  if (formRef.current) formRef.current.reset();
                }}
                disabled={sending}
              >
                Reset
              </button>
            </div>

            <div className={`status ${status.type}`} role="status" aria-live="polite">
              {status.message}
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        :root {
          /* exact landing page palette */
          --page-bg: #f8fbff;
          --panel: #ffffff;
          --muted: #6b7280;
          --ink: #1a1a1a;
          --gold: #f4c542;       /* landing hero accent */
          --accent-dark: #0f4c81; /* deep navy from landing */
          --green: #28a745;
          --radius: 10px;
          --card-pad: 18px;
          --shadow: 0 8px 26px rgba(11,23,39,0.06);
        }

        .contact-page {
          background: linear-gradient(180deg, #ffffff 0%, var(--page-bg) 60%);
          padding: clamp(12px, 3vw, 28px);
          min-height: calc(100vh - 100px);
          display: flex;
          justify-content: center;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: var(--ink);
        }

        /* Balanced two-column card like landing */
        .contact-card {
          width: 100%;
          max-width: 1080px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: stretch;
        }

        /* Side */
        .contact-side {
          background: var(--panel);
          padding: 16px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          border: 1px solid rgba(11,23,39,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .brand .logo {
          font-weight: 900;
          color: var(--accent-dark);
          font-size: 1.05rem;
          letter-spacing: -0.3px;
        }
        .brand .subtitle {
          color: var(--muted);
          font-weight: 700;
          font-size: 0.85rem;
          margin-top: 4px;
        }

        .side-content { padding-top: 6px; }
        .heading {
          margin: 0;
          font-size: 1.25rem;
          color: var(--ink);
          line-height: 1.08;
        }
        .lead {
          color: var(--muted);
          margin: 6px 0 0 0;
          line-height: 1.4;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .side-foot {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .badge {
          background: var(--gold);
          color: #111;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 0.82rem;
        }
        .mini {
          color: var(--muted);
          font-weight: 700;
          font-size: 0.85rem;
        }

        /* Form */
        .contact-form {
          background: var(--panel);
          padding: var(--card-pad);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          border: 1px solid rgba(11,23,39,0.04);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
        }

        /*
          Increased the desktop field spacing for a more professional look:
          - gap between columns is larger on desktop (18px).
          - grid has slightly bigger column gap and row gap so fields breathe.
          - on mobile the gap reduces to keep things compact.
        */
        .grid.two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 20px; /* row-gap column-gap: row 18px, column 20px for clearer horizontal separation */
        }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .lbl { font-weight: 800; color: var(--ink); font-size: 0.9rem; }

        input[type="text"], input[type="email"], input[type="tel"], select, textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #eef4fb;
          background: linear-gradient(180deg,#ffffff,#fbfdff);
          box-shadow: 0 6px 20px rgba(11,23,39,0.03);
          font-size: 0.95rem;
          color: var(--ink);
          transition: border-color .12s ease, box-shadow .12s ease, transform .06s ease;
        }

        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: var(--accent-dark);
          box-shadow: 0 8px 26px rgba(15,76,129,0.06);
          transform: translateY(-1px);
        }

        textarea { min-height: 120px; resize: vertical; }

        .req { color: #b43b18; margin-left: 6px; font-weight: 800; }

        /* Actions: tightened spacing and smaller gap under buttons */
        .actions {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 6px;
        }
        .btn {
          padding: 10px 14px;
          border-radius: 8px;
          font-weight: 800;
          cursor: pointer;
          border: none;
        }
        .btn.primary {
          background: linear-gradient(90deg, var(--gold), #e0b631);
          color: #111;
          box-shadow: 0 8px 26px rgba(228,180,66,0.12);
        }
        .btn.ghost {
          background: transparent;
          border: 1px solid #eef4fb;
          color: var(--accent-dark);
        }

        /* status sits close to actions */
        .status {
          margin-top: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .status.success { background: #ecfdf5; color: #065f46; border: 1px solid #bbf7d0; }
        .status.error { background: #fff1f2; color: #9f1239; border: 1px solid #fecaca; }

        /* responsive: stack but keep tight spacing */
        @media (max-width: 880px) {
          .contact-card { grid-template-columns: 1fr; }
          .contact-side { order: 2; }
          .contact-form { order: 1; }
          .grid.two { grid-template-columns: 1fr; gap: 10px; }
          .actions { flex-direction: column; gap: 8px; }
        }

        @media (max-width: 420px) {
          .contact-page { padding: 12px; }
          .contact-side, .contact-form { padding: 12px; }
          .btn { width: 100%; }
        }

        /* tie to landing: small gold underline */
        .heading::after {
          content: '';
          display: block;
          width: 44px;
          height: 4px;
          border-radius: 4px;
          margin-top: 8px;
          background: linear-gradient(90deg, var(--gold), var(--accent-dark));
        }
      `}</style>
    </>
  );
};

export default Contact;