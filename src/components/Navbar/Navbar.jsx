import { Link } from "react-router-dom";
import { useState } from "react";

function Navbar({ cartCount }) {
 const [menuOpen, setMenuOpen] = useState(false);

  return (

    <nav className="bg-[#1b1f3b] text-white p-4 shadow-lg">
    <div className="container mx-auto flex justify-between items-center">
        
    <span className="text-2xl font-bold text-[#FFD700] flex items-center gap-2 cursor-default">
      <svg className="w-8 h-8 text-[#FFD700]" fill="currentColor" viewBox="0 0 20 20">
      <path d="M16 16a2 2 0 11-4 0h4zM6 16a2 2 0 11-4 0h4zM2 2h2l3.6 7.59-1.35 2.44A1 1 0 007 14h10v-2H7.42a.5.5 0 01-.45-.28L8 10h7a1 1 0 00.92-.61l3-7A1 1 0 0018 2H4"></path>
          </svg>
       MyShop
        </span>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        <div className={`md:flex items-center space-x-6 ${menuOpen ? "block mt-4" : "hidden"} md:block mx-auto ml-20`}>
          <Link to="/" className="hover:text-[#FFD700] transition">Home</Link>
            <Link to="/about" className="hover:text-[#FFD700] transition">About</Link>
            <Link to="/contact" className="hover:text-[#FFD700] transition">Contact</Link>
          <Link to="/products" className="hover:text-[#FFD700] transition">Products</Link>
        </div>

        <Link
          to="/cart"
          className="bg-[#FFD700] text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#e6c200] transition"
        >
          Cart ({cartCount})
        </Link>
      </div>
       </nav>
  );
}

export default Navbar;
