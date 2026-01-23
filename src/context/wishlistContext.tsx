import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LocalStorage } from '../helpers/localstorage';
import { UserService } from '../service/ApiService';
import Toast from 'react-native-toast-message';
import { UserData, UserDataContext } from './userDataContext';

export type WishlistItemId = string | number;

export interface WishlistContextValue {
  wishlistIds: string[];
  isWishlisted: (id: WishlistItemId) => boolean;
  addToWishlist: (id: WishlistItemId) => Promise<void> | void;
  removeFromWishlist: (id: WishlistItemId) => Promise<void> | void;
  toggleWishlist: (id: WishlistItemId) => Promise<void> | void;
  clearWishlist: () => void;
  refreshWishlistFromServer: () => Promise<void>;
}

// Define default value
const defaultValue: WishlistContextValue = {
  wishlistIds: [],
  isWishlisted: () => false,
  addToWishlist: async () => { },
  removeFromWishlist: async () => { },
  toggleWishlist: async () => { },
  clearWishlist: () => { },
  refreshWishlistFromServer: async () => { },
};

export const WishlistContext = createContext<WishlistContextValue>(defaultValue);

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY = '@wishlist_ids';

export const WishlistProvider: React.FC<Props> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isLoggedIn } = useContext<UserData>(UserDataContext);

  // Load wishlist from storage
  useEffect(() => {
    loadWishlistFromStorage();
  }, []);

  // Load server wishlist when logged in
  useEffect(() => {
    if (isLoggedIn) {
      refreshWishlistFromServer();
    }
  }, [isLoggedIn]);

  const loadWishlistFromStorage = async () => {
    try {
      const stored = await LocalStorage.read(STORAGE_KEY);
      if (Array.isArray(stored)) {
        setWishlistIds(stored.map(String));
      }
    } catch (error) {
      console.log('Error loading wishlist from storage:', error);
    }
  };

  const saveWishlistToStorage = async (ids: string[]) => {
    try {
      await LocalStorage.save(STORAGE_KEY, ids);
    } catch (error) {
      console.log('Error saving wishlist to storage:', error);
    }
  };

  const refreshWishlistFromServer = async () => {
    if (!isLoggedIn) return;

    try {
      setIsLoading(true);
      const res = await UserService.wishlist();

      console.log('Wishlist API response:', {
        status: res.status,
        data: res.data
      });

      if (res?.data?.success) {
        const wishlistData = res.data.data || res.data.wishlist;

        // Handle different response formats
        let productIds: string[] = [];

        if (Array.isArray(wishlistData)) {
          // If response is an array of products
          productIds = wishlistData
            .map((item: any) => item?.id || item?.product_id || item?.product?.id)
            .filter(Boolean)
            .map(String);
        } else if (wishlistData?.items && Array.isArray(wishlistData.items)) {
          // If response has nested items array
          productIds = wishlistData.items
            .map((item: any) => item?.product_id || item?.product?.id)
            .filter(Boolean)
            .map(String);
        }

        console.log('Extracted product IDs:', productIds);
        setWishlistIds(productIds);
        saveWishlistToStorage(productIds);
      }
    } catch (error: any) {
      console.log('Error refreshing wishlist:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      Toast.show({
        type: 'error',
        text1: 'Failed to load wishlist',
        text2: error.response?.data?.message || 'Please try again'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isWishlisted = useCallback(
    (id: WishlistItemId) => wishlistIds.includes(String(id)),
    [wishlistIds],
  );

  const addToWishlist = useCallback(async (id: WishlistItemId) => {
    const key = String(id);

    // Check if already in wishlist
    if (wishlistIds.includes(key)) {
      return;
    }

    // Optimistic update
    const newWishlist = [...wishlistIds, key];
    setWishlistIds(newWishlist);
    saveWishlistToStorage(newWishlist);

    // API call for logged-in users
    if (isLoggedIn) {
      try {
        console.log('Adding to wishlist:', { product_id: id });
        const res = await UserService.wishlistadd({ product_id: id });

        if (res?.data?.success) {
          Toast.show({
            type: 'success',
            text1: 'Added to wishlist',
          });
        } else {
          throw new Error('Failed to add to wishlist');
        }
      } catch (error: any) {
        // Rollback on failure
        const rollbackWishlist = wishlistIds.filter(x => x !== key);
        setWishlistIds(rollbackWishlist);
        saveWishlistToStorage(rollbackWishlist);

        Toast.show({
          type: 'error',
          text1: 'Failed to add to wishlist',
          text2: error.response?.data?.message || 'Please try again'
        });
      }
    } else {
      // For non-logged in users
      Toast.show({
        type: 'success',
        text1: 'Added to wishlist',
      });
    }
  }, [wishlistIds, isLoggedIn]);

  const removeFromWishlist = useCallback(async (id: WishlistItemId) => {
    const key = String(id);

    // Optimistic update
    const newWishlist = wishlistIds.filter(x => x !== key);
    setWishlistIds(newWishlist);
    saveWishlistToStorage(newWishlist);

    // API call for logged-in users
    if (isLoggedIn) {
      try {
        console.log('Removing from wishlist:', { product_id: id });
        const res = await UserService.wishlistDelete(id);

        if (res?.data?.success) {
          Toast.show({
            type: 'success',
            text1: 'Removed from wishlist',
          });
        } else {
          throw new Error('Failed to remove from wishlist');
        }
      } catch (error: any) {
        // Rollback on failure
        const rollbackWishlist = [...wishlistIds, key];
        setWishlistIds(rollbackWishlist);
        saveWishlistToStorage(rollbackWishlist);

        Toast.show({
          type: 'error',
          text1: 'Failed to remove from wishlist',
          text2: error.response?.data?.message || 'Please try again'
        });
      }
    } else {
      // For non-logged in users
      Toast.show({
        type: 'success',
        text1: 'Removed from wishlist',
      });
    }
  }, [wishlistIds, isLoggedIn]);

  const toggleWishlist = useCallback(async (id: WishlistItemId) => {
    if (isWishlisted(id)) {
      await removeFromWishlist(id);
    } else {
      await addToWishlist(id);
    }
  }, [isWishlisted, addToWishlist, removeFromWishlist]);

  const clearWishlist = useCallback(() => {
    setWishlistIds([]);
    saveWishlistToStorage([]);
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistIds,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
      refreshWishlistFromServer,
    }),
    [wishlistIds, isWishlisted, addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export default WishlistProvider;