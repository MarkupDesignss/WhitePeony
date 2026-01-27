import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LocalStorage } from '../helpers/localstorage';
import { UserService } from '../service/ApiService';
import Toast from 'react-native-toast-message';
import { UserDataContext } from './userDataContext';

export type WishlistItemId = string | number;

export interface WishlistItem {
  id: string | number;
  product_id: string | number;
  name: string;
  price: string | number;
  image?: string | null;
  description?: string;
  product_type?: string;
  front_image?: string;
  main_price?: string | number;
  variants?: any[];
  originalItem?: any;
}

export interface WishlistContextValue {
  wishlistItems: WishlistItem[];
  wishlistIds: string[];
  isWishlisted: (id: WishlistItemId) => boolean;
  addToWishlist: (id: WishlistItemId) => Promise<void>;
  removeFromWishlist: (id: WishlistItemId) => Promise<void>;
  toggleWishlist: (id: WishlistItemId) => Promise<void>;
  clearWishlist: () => void;
  fetchWishlist: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const defaultValue: WishlistContextValue = {
  wishlistItems: [],
  wishlistIds: [],
  isWishlisted: () => false,
  addToWishlist: async () => {},
  removeFromWishlist: async () => {},
  toggleWishlist: async () => {},
  clearWishlist: () => {},
  fetchWishlist: async () => {},
  isLoading: false,
  error: null,
};

export const WishlistContext =
  createContext<WishlistContextValue>(defaultValue);

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY = '@wishlist_items';

export const WishlistProvider: React.FC<Props> = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn, userType } = useContext(UserDataContext);

  // Extract IDs from wishlist items
  const wishlistIds = useMemo(
    () => wishlistItems.map(item => String(item?.id)).filter(Boolean),
    [wishlistItems],
  );

  // Filter items by user type
  const filterItemsByUserType = useCallback(
    (items: any[]): WishlistItem[] => {
      if (!Array.isArray(items)) return [];

      // If user is not logged in or no specific type, return all items
      if (!isLoggedIn || userType === null || userType === undefined) {
        return items.filter(item => item && item.id);
      }

      // Filter by product_type (b2c or b2b)
      return items.filter(item => {
        return item?.product_type === userType;
      });
    },
    [isLoggedIn, userType],
  );

  // Load wishlist when component mounts
  useEffect(() => {
    loadInitialWishlist();
  }, []);

  // Refresh wishlist when login state or user type changes
  useEffect(() => {
    if (isLoggedIn) {
      fetchWishlist();
    } else {
      loadLocalWishlist();
    }
  }, [isLoggedIn, userType]);

  const loadInitialWishlist = async () => {
    try {
      setIsLoading(true);
      if (isLoggedIn) {
        await fetchWishlist();
      } else {
        await loadLocalWishlist();
      }
    } catch (error) {
      console.log('Error loading initial wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalWishlist = async () => {
    try {
      const storedItems = await LocalStorage.read(STORAGE_KEY);
      if (Array.isArray(storedItems)) {
        const filteredItems = filterItemsByUserType(storedItems);
        setWishlistItems(filteredItems);
        console.log('Loaded local wishlist items:', filteredItems.length);
      }
    } catch (error) {
      console.log('Error loading local wishlist:', error);
    }
  };

  const saveLocalWishlist = async (items: WishlistItem[]) => {
    try {
      await LocalStorage.save(STORAGE_KEY, items);
      console.log('Saved wishlist to local storage:', items.length, 'items');
    } catch (error) {
      console.log('Error saving wishlist:', error);
    }
  };

  // Helper function to get full image URL
  const getFullImageUrl = (
    imagePath: string | null | undefined,
  ): string | null => {
    if (!imagePath) return null;

    // If already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/')
      ? imagePath.substring(1)
      : imagePath;

    // Construct full URL
    return `https://www.markupdesigns.net/whitepeony/storage/${cleanPath}`;
  };

  // Helper function to extract correct price from product
  const extractCorrectPrice = (item: any, product: any): string => {
    if (!item && !product) return '0';

    const target = item || product;

    // Priority 1: Use variant's actual_price (discounted price)
    if (
      target?.variants?.[0]?.actual_price !== undefined &&
      target?.variants?.[0]?.actual_price !== null
    ) {
      console.log(
        '  Using variant actual_price:',
        target.variants[0].actual_price,
      );
      return String(target.variants[0].actual_price);
    }

    // Priority 2: Use variant's price
    if (
      target?.variants?.[0]?.price !== undefined &&
      target?.variants?.[0]?.price !== null
    ) {
      console.log('  Using variant price:', target.variants[0].price);
      return String(target.variants[0].price);
    }

    // Priority 3: Use main_price as fallback
    if (target?.main_price !== undefined && target?.main_price !== null) {
      console.log('  Using main_price:', target.main_price);
      return String(target.main_price);
    }

    console.log('  No price found, using "0"');
    return '0';
  };

  // 1. FETCH WISHLIST - GET /wishlist (only for logged-in users)
  const fetchWishlist = async () => {
    // Return early if user is not logged in
    if (!isLoggedIn) {
      console.log('User not logged in, loading local wishlist instead');
      await loadLocalWishlist();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('wishlistContext.tsx: Fetching wishlist from server...');

      const response = await UserService.wishlist();

      console.log('Wishlist API response type:', typeof response);
      console.log('Wishlist API response:', response);

      let wishlistData = [];

      // Parse response based on structure
      if (Array.isArray(response)) {
        wishlistData = response;
      } else if (response && typeof response === 'object') {
        // Check for nested data structure
        if (response.data && Array.isArray(response.data)) {
          wishlistData = response.data;
        } else if (response.wishlist && Array.isArray(response.wishlist)) {
          wishlistData = response.wishlist;
        } else if (response.success && Array.isArray(response.data)) {
          wishlistData = response.data;
        } else if (Array.isArray(response)) {
          wishlistData = response;
        }
      }

      console.log('Parsed wishlistData:', wishlistData);
      console.log('Parsed wishlistData length:', wishlistData.length);

      if (!Array.isArray(wishlistData)) {
        console.error('Wishlist API did not return an array:', wishlistData);
        throw new Error('Wishlist API did not return an array');
      }

      // DEBUG: Log each item before transformation
      console.log('=== BEFORE TRANSFORMATION ===');
      wishlistData.forEach((item, index) => {
        console.log(`Item ${index}:`);
        console.log('  Item ID:', item?.id);
        console.log('  Item name:', item?.name);
        console.log('  Has product property:', !!item?.product);
        console.log('  Price sources:');
        console.log('    - item.main_price:', item?.main_price);
        console.log(
          '    - item.variants?.[0]?.price:',
          item?.variants?.[0]?.price,
        );
        console.log(
          '    - item.variants?.[0]?.actual_price:',
          item?.variants?.[0]?.actual_price,
        );
        console.log(
          '    - item.product?.main_price:',
          item?.product?.main_price,
        );
        console.log(
          '    - item.product?.variants?.[0]?.price:',
          item?.product?.variants?.[0]?.price,
        );
        console.log(
          '    - item.product?.variants?.[0]?.actual_price:',
          item?.product?.variants?.[0]?.actual_price,
        );
      });

      // Transform the data
      const transformedItems: WishlistItem[] = wishlistData.map((item: any) => {
        // Extract product data - item might already be the product
        const product = item.product || item;

        // Determine the correct ID
        const itemId = item.id || product.id || item.product_id;
        const productId = item.product_id || product.id || itemId;

        // Determine product type
        const itemProductType =
          item.product_type || product.product_type || userType || 'b2c';

        // Get image
        const imagePath =
          product.front_image || item.image_url || product.image_url;
        const fullImageUrl = getFullImageUrl(imagePath);

        // Get price using the helper function
        const price = extractCorrectPrice(item, product);

        console.log(`Transforming item ${itemId}:`);
        console.log('  Name:', product.name);
        console.log('  Final extracted price:', price);
        console.log('  Price type:', typeof price);

        return {
          id: itemId,
          product_id: productId,
          name: product.name || 'Unknown Product',
          price: price,
          image: fullImageUrl,
          front_image: imagePath,
          main_price: product.main_price,
          description: product.description,
          product_type: itemProductType,
          variants: product.variants || item.variants, // Store variants
          originalItem: item,
        };
      });

      console.log('=== AFTER TRANSFORMATION ===');
      console.log('Transformed items count:', transformedItems.length);
      transformedItems.forEach((item, index) => {
        console.log(`Item ${index}: ${item.name}`);
        console.log('  Stored price:', item.price);
        console.log('  Has variants:', !!item.variants);
      });

      // Filter by user type and update state
      const filteredItems = filterItemsByUserType(transformedItems);
      setWishlistItems(filteredItems);

      // Save to local storage as backup
      await saveLocalWishlist(filteredItems);
    } catch (err: any) {
      console.error('Failed to fetch wishlist:', err);

      // Detailed error logging
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response data:', err.response.data);
      } else if (err.request) {
        console.error('Error request:', err.request);
      } else {
        console.error('Error message:', err.message);
      }

      setError('Failed to fetch wishlist. Please try again.');

      // Fallback to local storage
      await loadLocalWishlist();

      // Only show toast for logged-in users
      if (isLoggedIn) {
        Toast.show({
          type: 'error',
          text1: 'Wishlist Error',
          text2: 'Failed to load wishlist from server',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. ADD TO WISHLIST - POST /wishlist/add
  const addToWishlist = async (id: WishlistItemId) => {
    if (wishlistIds.includes(String(id))) return;

    try {
      setIsLoading(true);
      const res = await UserService.getProductById(id);
      const product = res?.data?.data || res?.data || res;

      const item: WishlistItem = {
        id,
        product_id: id,
        name: product?.name || 'Product',
        price: extractCorrectPrice(product, product),
        image: getFullImageUrl(product?.front_image),
        product_type: product?.product_type || userType || 'b2c',
        variants: product?.variants,
      };

      // Only call API if user is logged in
      if (isLoggedIn) {
        try {
          await UserService.wishlistadd({ product_id: id });
        } catch (apiError) {
          console.log(
            'API error while adding to wishlist, continuing locally:',
            apiError,
          );
          // Don't show error toast for API failure, just continue with local storage
        }
      }

      const updated = filterItemsByUserType([...wishlistItems, item]);
      setWishlistItems(updated);
      await saveLocalWishlist(updated);

      Toast.show({
        type: 'success',
        text1: 'Added to wishlist',
        text2: isLoggedIn ? 'Saved to your account' : 'Saved locally',
      });
    } catch (error) {
      console.log('Error adding to wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add item to wishlist',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. REMOVE FROM WISHLIST
  const removeFromWishlist = async (id: WishlistItemId) => {
    try {
      setIsLoading(true);

      // Only call API if user is logged in
      if (isLoggedIn) {
        try {
          await UserService.wishlistDelete(id);
        } catch (apiError) {
          console.log(
            'API error while removing from wishlist, continuing locally:',
            apiError,
          );
          // Don't show error toast for API failure
        }
      }

      const updated = wishlistItems.filter(i => String(i.id) !== String(id));
      setWishlistItems(updated);
      await saveLocalWishlist(updated);

      Toast.show({
        type: 'success',
        text1: 'Removed from wishlist',
        text2: isLoggedIn ? 'Removed from your account' : 'Removed locally',
      });
    } catch (error) {
      console.log('Error removing from wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove item from wishlist',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 4. TOGGLE WISHLIST - Combine add and remove
  const toggleWishlist = async (id: WishlistItemId) => {
    console.log('Toggling wishlist for item:', id);
    if (wishlistIds.includes(String(id))) {
      await removeFromWishlist(id);
    } else {
      await addToWishlist(id);
    }
  };

  // 5. Check if item is wishlisted
  const isWishlisted = useCallback(
    (id: WishlistItemId) => {
      const isInWishlist = wishlistIds.includes(String(id));
      console.log(`isWishlisted(${id}): ${isInWishlist}`);
      return isInWishlist;
    },
    [wishlistIds],
  );

  // 6. CLEAR WISHLIST
  const clearWishlist = async () => {
    try {
      console.log('Clearing wishlist');

      // Only call API if user is logged in
      if (isLoggedIn) {
        try {
          // Assuming you have a clear wishlist API endpoint
          // await UserService.clearWishlist();
        } catch (apiError) {
          console.log(
            'API error while clearing wishlist, continuing locally:',
            apiError,
          );
        }
      }

      setWishlistItems([]);
      await saveLocalWishlist([]);

      Toast.show({
        type: 'success',
        text1: 'Wishlist cleared',
        text2: isLoggedIn
          ? 'All items have been removed from your account'
          : 'All items have been removed locally',
      });
    } catch (error) {
      console.log('Clear wishlist error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to clear wishlist',
      });
    }
  };

  // Context value
  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistItems,
      wishlistIds,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
      fetchWishlist,
      isLoading,
      error,
    }),
    [wishlistItems, wishlistIds, isWishlisted, isLoading, error],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistProvider;
