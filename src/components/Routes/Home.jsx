function Home() {
  return (
    <div>
      <section 
        className="relative w-full h-[90vh] bg-cover bg-center flex items-center justify-center text-white"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542291026-7eec264c27ff')" }}
      >
        <div className="text-center p-8 sm:p-12 rounded-lg shadow-lg bg-gradient-to-r from-black/60 to-transparent">
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">
            Discover Your Style
          </h1>
          <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto">
            Elevate your shopping experience with high-quality products at the best prices.
          </p>
        </div>
      </section>

      <section className="bg-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-800">Why Shop With Us?</h2>
          <p className="mt-4 text-lg text-gray-600">
            We provide high-quality products, unbeatable prices, and fast delivery.
          </p>
          <div className="flex justify-center gap-8 mt-10 flex-wrap">
            <div className="bg-white p-6 rounded-lg shadow-md w-72 sm:w-80">
              <img src="https://cdn-icons-png.flaticon.com/512/2223/2223615.png" alt="Fast Shipping" className="w-16 mx-auto"/>
              <h3 className="text-xl font-semibold mt-4">Fast & Free Shipping</h3>
              <p className="text-gray-600 mt-2">Get your orders delivered quickly, anywhere.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md w-72 sm:w-80">
              <img src="https://cdn-icons-png.flaticon.com/512/2331/2331941.png" alt="Quality Products" className="w-16 mx-auto"/>
              <h3 className="text-xl font-semibold mt-4">Premium Quality</h3>
              <p className="text-gray-600 mt-2">We offer only the best quality products.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md w-72 sm:w-80">
              <img src="https://cdn-icons-png.flaticon.com/512/1040/1040253.png" alt="Support" className="w-16 mx-auto"/>
              <h3 className="text-xl font-semibold mt-4">24/7 Support</h3>
              <p className="text-gray-600 mt-2">Our team is always available to assist you.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
