function Footer() {
    return (
      <footer className="bg-gray-900 text-white py-6 mt-10">
        <div className="container mx-auto px-6 text-center">
        <p className="text-lg font-semibold">© {new Date().getFullYear()} My E-Commerce. All Rights Reserved.</p>
          <p className="mt-2 text-gray-400">Developed by <span className="text-blue-400">Muhammad Imran</span></p>
        </div>
      </footer>
    );
  }
  
  export default Footer;
  