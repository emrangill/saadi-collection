import { useState } from "react";
import { useNavigate } from "react-router-dom";
import products from "../products";

function ProductList({ addToCart }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchQuery) return;

    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${searchQuery}&client_id=HklEfMIqrzrP1KTZ9m6E4oQGYN8GksKGs48hzd7W3-A`
      );
      const data = await response.json();
      const results = data.results.map((item, index) => ({
        id: `api-${index}`,
        name: searchQuery,
        image: item.urls.small,
        price: Math.floor(Math.random() * 501) + 500,
      }));

      setSearchResults(results);
      setIsSearching(true);

      sessionStorage.setItem("searchResults", JSON.stringify(results));
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleBuyNowClick = (id) => {
    navigate(`/product/${id}`);
  };

  return (
    <div className="p-4">
      <div className="flex justify-center mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded px-4 py-2 w-1/2"
          placeholder="Search Anything..."
        />
        <button
          onClick={handleSearch}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Search
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(isSearching ? searchResults : products).map((product) => (
          <div key={product.id} className="border p-4 flex flex-col items-center">
            <div className="w-full h-40 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
            <h3 className="text-lg font-bold mt-2 text-center">{product.name}</h3>
            <p className="text-gray-600 text-center">Rs: {product.price}</p>
            <button
              onClick={() => handleBuyNowClick(product.id)}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductList;