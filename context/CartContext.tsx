'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  store_id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface CartContextType {
  pincode: string | null;
  setPincode: (pin: string) => void;
  isServiceable: boolean | null;
  setIsServiceable: (status: boolean | null) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [pincode, setPincodeState] = useState<string | null>(null);
  const [isServiceable, setIsServiceable] = useState<boolean | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedPin = localStorage.getItem('parchoon_pincode');
    const savedStatus = localStorage.getItem('parchoon_is_serviceable');
    const savedLocation = localStorage.getItem('parchoon_location_name');
    
    if (savedPin) setPincodeState(savedPin);
    if (savedStatus !== null) setIsServiceable(savedStatus === 'true');
    if (savedLocation) setLocationName(savedLocation);
  }, []);

  const setPincode = (pin: string) => {
    setPincodeState(pin);
    localStorage.setItem('parchoon_pincode', pin);
  };

  const addToCart = (product: Omit<CartItem, 'quantity'>) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        pincode,
        setPincode,
        isServiceable,
        setIsServiceable,
        locationName,
        setLocationName,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};