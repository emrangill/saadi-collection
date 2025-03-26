import { useState } from "react";

function CartPage({ cart, updateQuantity }) {
  const [showBill, setShowBill] = useState(false);

  const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <div className="p-8 bg-gray-50 min-h-screen flex justify-center items-center">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-8 border border-gray-300">
    <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 border-b pb-4">Your Shopping Cart</h2>
    {cart.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">Your cart is empty. Start adding items!</p>
        ) : (
          <div className="space-y-6">
        {cart.map((item) => (
     <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between bg-gray-100 p-4 rounded-lg shadow-md">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg shadow-md border border-gray-300"
                />
                <div className="flex-1 text-center sm:text-left px-4">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-gray-700 text-md font-medium">Rs: {item.price}</p>
                </div>
         <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                className="px-2 py-1 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition disabled:opacity-50"
                    disabled={item.quantity <= 0}
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => {
                      if (item.quantity < 5) {
                        updateQuantity(item.id, 1);
                      } else {
                        alert(" Limit Exceeded! You can only add up to 5 items.");
                      }
                    }}
                    className="px-2 py-1 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setShowBill(true)}
              className="mt-6 w-auto px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-800 text-white text-md font-bold rounded-lg shadow-lg hover:from-indigo-700 hover:to-blue-900 transition duration-300 flex items-center justify-center mx-auto"
            >
              Generate Bill
            </button>
            {showBill && (
              <div className="mt-6 p-6 bg-white border rounded-lg shadow-lg animate-fadeIn text-gray-900">
                <h3 className="text-2xl font-bold border-b pb-3 mb-4">Bill Summary</h3>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-md shadow-sm">
                   <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-gray-600 text-sm">{item.quantity} x {item.price}</p>
                      </div>
                      <span className="font-semibold text-lg">Rs: {item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <hr className="my-4 border-gray-300" />
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total Amount:</span>
                  <span className="text-indigo-600">Rs: {totalPrice}</span>
                </div>
              </div>
               )}
             </div>
            )}
            </div>
    </div>
  );
}

export default CartPage;
