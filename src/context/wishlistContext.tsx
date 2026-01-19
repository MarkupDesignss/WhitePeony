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
}

const defaultValue: WishlistContextValue = {
  wishlistIds: [],
  isWishlisted: () => false,
  addToWishlist: () => { },
  removeFromWishlist: () => { },
  toggleWishlist: () => { },
  clearWishlist: () => { },
};

export const WishlistContext = createContext<WishlistContextValue>(defaultValue);

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY = '@wishlist_ids';

export const WishlistProvider: React.FC<Props> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const { isLoggedIn } = useContext<UserData>(UserDataContext);


  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.read(STORAGE_KEY);
      if (Array.isArray(stored)) {
        setWishlistIds(stored.map(String));
      }

      // Only fetch from API when logged in
      if (isLoggedIn) {
        try {
          const res = await UserService.wishlist();
          const apiWishlist = res?.data?.wishlist;
          if (apiWishlist) {
            setWishlistId(String(apiWishlist.id));
            const items = Array.isArray(apiWishlist.items) ? apiWishlist.items : [];
            const ids = items
              .map((it: any) => it?.product_id)
              .filter((v: any) => v !== undefined && v !== null)
              .map((v: any) => String(v));
            setWishlistIds(ids);
          }
        } catch (e) {
          // ignore fetch errors; fallback to local storage
        }
      }
    })();
  }, [isLoggedIn]);

  useEffect(() => {
    LocalStorage.save(STORAGE_KEY, wishlistIds);
  }, [wishlistIds]);

  const isWishlisted = useCallback(
    (id: WishlistItemId) => wishlistIds.includes(String(id)),
    [wishlistIds],
  );

  const addToWishlist = useCallback(async (id: WishlistItemId) => {
    const key = String(id);
    // optimistic update
    setWishlistIds(prev => (prev.includes(key) ? prev : [...prev, key]));
    if (isLoggedIn) {
      try {
        await UserService.wishlistadd({ product_id: id });
      } catch (e) {
        console.log('Add to wishlist error', JSON.stringify(e));
        // rollback on failure
        setWishlistIds(prev => prev.filter(x => x !== key));
        Toast.show({ type: 'error', text1: 'Failed to add to wishlist' });
      }
    }
  }, [isLoggedIn]);

  const removeFromWishlist = useCallback(async (id: WishlistItemId) => {
    const key = String(id);
    // optimistic update
    setWishlistIds(prev => prev.filter(x => x !== key));
    if (isLoggedIn) {
      try {
        if (wishlistId) {
          await UserService.wishlistDelete(key);
        } else {
          // If wishlistId missing, re-fetch once and retry
          const res = await UserService.wishlist();
          const apiWishlist = res?.data?.wishlist;
          if (apiWishlist?.id) {
            setWishlistId(String(apiWishlist.id));
            await UserService.wishlistDelete(key);
          }
        }
      } catch (e) {
        // rollback on failure
        setWishlistIds(prev => (prev.includes(key) ? prev : [...prev, key]));
        Toast.show({ type: 'error', text1: 'Failed to remove from wishlist' });
      }
    }
  }, [isLoggedIn, wishlistId]);

  const toggleWishlist = useCallback(async (id: WishlistItemId) => {
    const key = String(id);
    if (wishlistIds.includes(key)) {
      await removeFromWishlist(key);
    } else {
      await addToWishlist(key);
    }
  }, [wishlistIds, addToWishlist, removeFromWishlist]);

  const clearWishlist = useCallback(() => setWishlistIds([]), []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistIds,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
    }),
    [wishlistIds, isWishlisted, addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export default WishlistProvider;

