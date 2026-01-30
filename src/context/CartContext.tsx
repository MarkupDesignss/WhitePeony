// contexts/CartContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { HttpStatusCode } from 'axios';
import { UserService } from '../service/ApiService'; // adjust path
import { CommonLoader } from '../components/CommonLoader/commonLoader';

export interface CartItem {
    id: number;
    name?: string;
    variant_id?: number | null;
    quantity: number;
    price?: number;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (
        productId: number,
        selectedVariant?: number | { id?: number },
    ) => Promise<void>;
    removeFromCart: (
        productId: number,
        variantId?: number | null,
    ) => Promise<void>;
    getCartDetails: () => Promise<void>;
    syncCartAfterLogin: (userId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    isLoadingCart: boolean;
    isLoggedIn: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoadingCart, setIsLoadingCart] = useState(false);
    const { showLoader, hideLoader } = CommonLoader();

    // load token and guest cart on mount
    useEffect(() => {
        (async () => {
            try {
                const t = await AsyncStorage.getItem('@token');
                setToken(t);
                const savedCart = await AsyncStorage.getItem('guest_cart');
                if (savedCart) setCart(JSON.parse(savedCart));
                // optionally, if token exists, fetch server cart
                if (t) {
                    await getCartDetails();
                }
            } catch (e) {
               
            }
        })();
    }, []);

    // save guest cart when cart changes and user not logged in
    useEffect(() => {
        if (!token) {
            AsyncStorage.setItem('guest_cart', JSON.stringify(cart)).catch(() => { });
        }
    }, [cart, token]);

    const isLoggedIn = Boolean(token);

    // normalize selectedVariant param
    const normalizeVariantId = (
        selectedVariant?: number | { id?: number } | null,
    ) => {
        if (selectedVariant == null) return null;
        if (typeof selectedVariant === 'number') return selectedVariant;
        return selectedVariant.id ?? null;
    };

    // addToCart: uses API when logged in, otherwise stores locally
    const addToCart = async (
        productId: number,
        selectedVariant?: number | { id?: number },
    ) => {
        try {
            const variantId = normalizeVariantId(selectedVariant);
            const payload = {
                product_id: productId,
                variant_id: variantId,
                quantity: 1,
            };

            if (!isLoggedIn) {
                // Guest: update local cart (merge by productId + variant)
                setCart(prev => {
                    const existingIndex = prev.findIndex(
                        p =>
                            p.id === productId &&
                            (p.variant_id || null) === (variantId || null),
                    );
                    if (existingIndex !== -1) {
                        const copy = [...prev];
                        copy[existingIndex] = {
                            ...copy[existingIndex],
                            quantity: copy[existingIndex].quantity + 1,
                        };
                        return copy;
                    }
                    return [
                        ...prev,
                        { id: productId, variant_id: variantId, quantity: 1 },
                    ];
                });
                Toast.show({ type: 'success', text1: 'Added to cart!' });
                return;
            }

            // Logged-in: call API
            showLoader();
            const res = await UserService.AddToCart(payload);
            hideLoader();

            if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
                await getCartDetails();
                Toast.show({
                    type: 'success',
                    text1: res.data?.message || 'Added to cart!',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: res?.data?.message || 'Failed to add to cart',
                });
            }
        } catch (err: any) {
            hideLoader();
            Toast.show({
                type: 'error',
                text1:
                    err?.response?.data?.message ||
                    'Something went wrong! Please try again.',
            });
        }
    };

    // getCartDetails: server when logged in, local when guest
    const getCartDetails = async () => {
        try {
            setIsLoadingCart(true);
            if (!isLoggedIn) {
                // guest: return local cart
                const saved = await AsyncStorage.getItem('guest_cart');
                const localCart = saved ? JSON.parse(saved) : [];
                setCart(localCart);
                return;
            }

            const res = await UserService.viewCart();
            if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
                const fetchedProducts = res.data?.cart?.items || [];
                setCart(fetchedProducts);
            } else {
             
            }
        } catch (err) {
        } finally {
            setIsLoadingCart(false);
        }
    };

    // removeFromCart: supports guest and logged-in removal with variant
    const removeFromCart = async (productId: number, variantId?: number | null) => {

        try {
            if (!isLoggedIn) {
             
                setCart(prev => prev.filter(item =>
                    !(item.id === productId && (item.variant_id || null) === (variantId || null))
                ));
                Toast.show({ type: 'success', text1: 'Removed from cart!' });
                return;
            }

            showLoader();

        
            if (variantId) {
                try {
                    const res = await UserService.RemoveCartWithVariant(productId, variantId);
        

                    if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
                  
                        Toast.show({
                            type: 'success',
                            text1: res.data?.message || 'Item removed from cart!',
                        });
                        await getCartDetails();
                    } else {

                        // Fallback to regular remove if variant API fails
                        const fallbackRes = await UserService.RemoveCart(productId);

                        if (fallbackRes && (fallbackRes.status === HttpStatusCode.Ok || fallbackRes.status === 200)) {
                            Toast.show({
                                type: 'success',
                                text1: fallbackRes.data?.message || 'Cart updated!',
                            });
                            await getCartDetails();
                        } else {
                            Toast.show({ type: 'error', text1: 'Failed to remove item' });
                        }
                    }
                } catch (variantError: any) {
                   
                    try {
                  
                        const fallbackRes = await UserService.RemoveCart(productId);
                        if (fallbackRes && (fallbackRes.status === HttpStatusCode.Ok || fallbackRes.status === 200)) {
                            Toast.show({
                                type: 'success',
                                text1: fallbackRes.data?.message || 'Cart updated!',
                            });
                            await getCartDetails();
                        }
                    } catch (fallbackError) {
                     
                        Toast.show({
                            type: 'error',
                            text1: 'Failed to remove item from cart'
                        });
                    }
                }
            } else {
                // No variantId, use regular RemoveCart
             
                const res = await UserService.RemoveCart(productId);
      

                if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
                    Toast.show({
                        type: 'success',
                        text1: res.data?.message || 'Cart updated!',
                    });
                    await getCartDetails();
                } else {
                    Toast.show({ type: 'error', text1: 'Failed to update cart' });
                }
            }
        } catch (err: any) {
            hideLoader();
          

            Toast.show({
                type: 'error',
                text1: err?.response?.data?.message || 'Something went wrong! Please try again.',
            });
        } finally {
            hideLoader();
        }
    };
    // sync guest cart into user cart after login
    const syncCartAfterLogin = async (userIdParam: string) => {
        try {
            const localData = await AsyncStorage.getItem('guest_cart');
            const localCart: CartItem[] = localData ? JSON.parse(localData) : [];

            if (localCart.length) {
                for (const item of localCart) {
                    try {
                        await UserService.AddToCart({
                            product_id: item.id,
                            variant_id: item.variant_id || null,
                            quantity: item.quantity,
                        });
                    } catch (err) {
                     
                    }
                }
                await AsyncStorage.removeItem('guest_cart');
            }

            setUserId(userIdParam);
            // refresh token from storage (login flow should have saved it)
            const t = await AsyncStorage.getItem('@token');
            setToken(t);
            await getCartDetails();
        } catch (err) {
          
        }
    };

    const clearCart = async () => {
        setCart([]);
        if (!isLoggedIn) await AsyncStorage.removeItem('guest_cart');
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                getCartDetails,
                syncCartAfterLogin,
                clearCart,
                isLoadingCart,
                isLoggedIn,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
};
