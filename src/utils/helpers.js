
// Helper functions for the application
export const formatPrice = (price) => {
  return `$${parseFloat(price).toFixed(2)}`;
};

export const validateProduct = (product) => {
  return product.name && product.description && product.price > 0 && product.category;
};
