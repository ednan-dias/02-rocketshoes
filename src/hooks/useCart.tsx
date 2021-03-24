import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const exists = cart.filter((product) => product.id === productId)[0];

      if (exists) {
        const quantity = await api.get(`/stock/${productId}`);

        if (exists.amount + 1 > quantity.data.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        } else {
          const otherProducts = cart.filter(
            (product) => product.id !== productId
          );

          setCart([...otherProducts, { ...exists, amount: exists.amount + 1 }]);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([
              ...otherProducts,
              { ...exists, amount: exists.amount + 1 },
            ])
          );
        }
      } else {
        const response = await api.get(`/products/${productId}`);

        setCart([...cart, { ...response.data, amount: 1 }]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...response.data, amount: 1 }])
        );
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const existsProducts = cart.filter(
        (product) => product.id === productId
      )[0];
      const newCart = cart.filter((product) => product.id !== productId);

      if (!existsProducts) {
        toast.error("Erro na remoção do produto");
        return;
      }
      setCart([...newCart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify([...newCart]));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const quantity = await api.get(`/stock/${productId}`);
      if (amount < 1) {
        return;
      } else if (amount > quantity.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      } else {
        const currentProduct = cart.filter(
          (product) => product.id === productId
        )[0];
        const otherProducts = cart.filter(
          (product) => product.id !== productId
        );

        const newCart = [
          { ...currentProduct, amount: amount },
          ...otherProducts,
        ];
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
