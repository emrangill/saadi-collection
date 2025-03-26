import React from "react";

const About = () => {
  return (
    <div className="bg-gray-50 text-gray-800">
      <section 
      className="relative w-full h-[80vh] flex flex-col items-center justify-center text-center text-white bg-cover bg-center"
        style={{ backgroundImage: "url('https://source.unsplash.com/1600x900/?business,corporate,success')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 opacity-70"></div>
        <div className="relative z-10 p-10 rounded-lg shadow-xl">
          <h1 className="text-6xl font-extrabold uppercase tracking-wide text-white">
         About Our Brand
         </h1>
        <p className="mt-4 text-lg max-w-3xl text-gray-200">
        Committed to delivering excellence, innovation, and a seamless shopping experience.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900">Our Story</h2>
          <p className="mt-4 text-lg text-gray-700">
           Started with a vision to revolutionize online shopping, we have grown into a trusted global brand known for quality and service.
          </p>
        </div>
        <div className="max-w-5xl mx-auto mt-10 space-y-8">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-full text-lg font-bold">1</div>
            <p className="ml-6 text-lg text-gray-700">Founded in <strong>2015</strong> with the goal of redefining online shopping.</p>
          </div>
          <div className="flex items-center">
             <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-full text-lg font-bold">2</div>
            <p className="ml-6 text-lg text-gray-700">Expanded internationally in <strong>2018</strong>, gaining customer trust worldwide.</p>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-full text-lg font-bold">3</div>
          <p className="ml-6 text-lg text-gray-700">Recognized as a <strong>Top E-Commerce Brand</strong> in 2021.</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white px-6">
        <div className="max-w-6xl mx-auto text-center">
     <h2 className="text-4xl font-bold text-gray-900">Our Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
            <div className="bg-gray-100 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
   <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQflosLXH14u2rBtp-53GPp35x9p4x6d9eoiA&s" alt="Trust" className="mx-auto" />
              <h3 className="text-xl font-semibold mt-4">Trust & Integrity</h3>
              <p className="text-gray-600 mt-2">We believe in transparency and customer trust.</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQT3wM8tlWMercQ8_fogKSo5Pl1aVmipnmoFg&s" alt="Innovation" className="mx-auto" />
              <h3 className="text-xl font-semibold mt-4">Innovation</h3>
              <p className="text-gray-600 mt-2">Bringing new ideas and solutions to enhance your shopping experience.</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdMWyQLZLbTXeAwTNoJ9jM9q_VtYwQKzymHw&s" alt="Customers" className="mx-auto" />
              <h3 className="text-xl font-semibold mt-4">Customer First</h3>
              <p className="text-gray-600 mt-2">Your satisfaction is our top priority.</p>
            </div>
          </div>
           </div>
          </section>
         </div>
  );
};

export default About;
