import { useRef } from "react";
import emailjs from "@emailjs/browser";

function Contact() {
  const formRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();

    emailjs
      .sendForm(
        "service_wmpd0k9",
        "template_x8pjf26",
        formRef.current,
        "awz6IBMRY3qcE7ZRM"
      )
      .then(() => {
        alert("Message Sent Successfully!");
        formRef.current.reset();
      })
      .catch((err) => {
        console.error("Error sending email:", err);
      });
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center px-6 py-12">
      <div className="max-w-4xl w-full bg-white shadow-lg rounded-xl p-10">
        <h2 className="text-4xl font-bold text-gray-800 text-center mb-4">
          Get in Touch
        </h2>
        <p className="text-lg text-gray-600 text-center mb-8">
          We'd love to hear from you! Feel free to reach out.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg outline-none"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg outline-none"
              required
            />
          </div>
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            className="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg outline-none"
            required
          />
          <textarea
            name="message"
            placeholder="Your Message"
            rows="5"
            className="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg outline-none"
            required
          ></textarea>

          <button
            type="submit"
            className="w-full py-3 text-lg font-semibold bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-500 transition duration-300"
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}

export default Contact;
