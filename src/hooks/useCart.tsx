import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const [productResponse, stockResponse] = await Promise.all([
        api.get<Product>('/products/' + productId),
        api.get<Stock>('/stock/' + productId)
      ]);
      const productAdded: Product = { ...productResponse.data, amount: 1 };
      const stock: Stock = stockResponse.data;

      const productInCart = cart.find((p: Product) => p.id === productId);

      if (productInCart) {
        if (stock.amount >= productInCart.amount + 1) {
          const newCart = cart.map(product => {
            if (product.id === productId) product.amount++;
            return product;
          });
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        }
        else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
      else {
        setCart([...cart, productAdded]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, productAdded]));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.find(product => product.id === productId)) {
        const newCart = cart.filter(product => product.id !== productId);
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      else 
        throw new Error();
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const response = await api.get<Stock>('/stock/' + productId);
      const stock = response.data;
      if (stock.amount >= amount) {
        const newCart = cart.map(product => {
          if (product.id === productId)
            product.amount = amount;
          return product;
        });
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
