import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  // CRITICAL REQUIREMENT 16 & 48: Cart MUST start EMPTY
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (medicine, quantity = 1) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.medicineId === medicine._id);
      const availableStock = medicine.totalStock || (medicine.batches?.reduce((s, b) => s + b.quantity, 0)) || 0;

      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const newQty = Math.min(currentQty + quantity, availableStock);
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty
        };
        return updated;
      } else {
        const defaultPrice = medicine.sellingPrice || (medicine.batches?.[0]?.sellingPrice) || 0;
        return [
          ...prev,
          {
            medicineId: medicine._id,
            name: medicine.name,
            genericName: medicine.genericName,
            brand: medicine.brand,
            dosageForm: medicine.dosageForm,
            unitPrice: defaultPrice,
            quantity: Math.min(quantity, availableStock > 0 ? availableStock : 1),
            availableStock
          }
        ];
      }
    });
  };

  const updateCartItemQty = (medicineId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(medicineId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => {
        if (item.medicineId === medicineId) {
          return {
            ...item,
            quantity: Math.min(quantity, item.availableStock || 9999)
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (medicineId) => {
    setCartItems(prev => prev.filter(item => item.medicineId !== medicineId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateCartItemQty,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
