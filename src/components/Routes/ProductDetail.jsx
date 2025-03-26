import { useParams } from "react-router-dom";
import products from "../products";

function ProductDetail({ addToCart }) {
 const { id } = useParams();

  const storedSearchResults = JSON.parse(sessionStorage.getItem("searchResults")) || [];
  const product = [...products, ...storedSearchResults].find((p) => p.id.toString() === id);

  if (!product) {
   return <h2 className="text-center text-2xl font-bold">Product Not Found</h2>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 text-center">
   
    <div className="w-full h-60 flex items-center justify-center">
       <img
          src={product.image}
          alt={product.name}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

     
      <h2 className="text-2xl font-bold mt-4">{product.name}</h2>
      <p className="text-gray-600 text-lg">Rs: {product.price}</p>

     
      <button
        onClick={() => addToCart(product)}
        className="mt-4 px-6 py-3 bg-green-500 text-white text-lg font-bold rounded-lg"
      >
        Add to Cart
      </button>
    </div>
  );
}

export default ProductDetail;
