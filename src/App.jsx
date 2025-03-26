import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer";
import Home from "./components/Routes/Home";
import About from "./components/Routes/About";
import Contact from "./components/Routes/Contact";
import ProductList from "./components/Routes/ProductList";
import ProductDetail from "./components/Routes/ProductDetail";
import CartPage from "./components/Routes/CartPage";

function App() {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (!existingItem) {
        return [...prevCart, { ...product, quantity: 1 }];
      }
      return prevCart;
    });
  };

 
  const updateQuantity = (id, change) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(Math.max(item.quantity + change, 1), 5) }
          : item
      )
    );
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar cartCount={cart.length} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/products" element={<ProductList addToCart={addToCart} />} />
            <Route path="/product/:id" element={<ProductDetail addToCart={addToCart} />} />
            <Route path="/cart" element={<CartPage cart={cart} updateCart={setCart} updateQuantity={updateQuantity} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
