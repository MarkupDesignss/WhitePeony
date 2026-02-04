import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { WishlistContext } from '../../context/wishlistContext';
import Toast from 'react-native-toast-message';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { HttpStatusCode } from 'axios';
import { useCart } from '../../context/CartContext';
import { Colors } from '../../constant';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';

type DisplayWishlistItem = {
  id: string;
  wishlistItemId: string;
  name: string;
  price: string;
  image?: string | null;
  isInCart?: boolean;
  price_numeric?: number;
  product_id?: number;
  variants?: { variant_id?: number }[];
  average_rating?: number;
};

const WishlistScreen = ({ navigation }: { navigation: any }) => {
  const {
    wishlistItems,
    wishlistIds,
    isWishlisted,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    fetchWishlist,
    isLoading: wishlistLoading,
  } = useContext(WishlistContext);

  const [items, setItems] = useState<DisplayWishlistItem[]>([]);
  const { isLoggedIn } = useContext<UserData>(UserDataContext);
  const { showLoader, hideLoader } = CommonLoader();
  const { cart, addToCart } = useCart();
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { translatedText: addedWishlistText } =
    useAutoTranslate('Added to wishlist');
  const { translatedText: savedAccountText } =
    useAutoTranslate('Saved to your account');
  const { translatedText: savedLocalText } =
    useAutoTranslate('Saved locally');

  const { translatedText: errorText } =
    useAutoTranslate('Error');
  const { translatedText: failedWishlistText } =
    useAutoTranslate('Failed to add item to wishlist');

    const { translatedText: removedText } = useAutoTranslate('Removed from wishlist');
  // Debug logging
  useEffect(() => {
    console.log('=== WISHLIST SCREEN DEBUG ===');
    console.log('isLoggedIn:', isLoggedIn);
    console.log('wishlistIds:', wishlistIds);
    console.log('wishlistItems count:', wishlistItems?.length);
    console.log('wishlistItems sample:', wishlistItems?.[0]);
    console.log('cart count:', cart?.length);

    setDebugInfo({
      isLoggedIn,
      wishlistIdsCount: wishlistIds?.length || 0,
      wishlistItemsCount: wishlistItems?.length || 0,
      itemsCount: items.length,
      firstItem: wishlistItems?.[0],
      firstId: wishlistIds?.[0],
    });
  }, [isLoggedIn, wishlistIds, wishlistItems, items]);

  // Load wishlist items when component mounts or when dependencies change
  useEffect(() => {
    console.log('useEffect triggered - loading wishlist');
    loadWishlistItems();
  }, [isLoggedIn, wishlistIds, wishlistItems]);

  // Update items' cart status when cart changes
  useEffect(() => {
    if (!cart) return;
    console.log('Cart updated, checking items in cart');
    setItems(currentItems =>
      currentItems.map(item => {
        const isInCart = cart.some(cartItem => String(cartItem.id) === item.id);
        if (isInCart !== item.isInCart) {
          console.log(
            `Item ${item.id} cart status changed: ${item.isInCart} -> ${isInCart}`,
          );
        }
        return { ...item, isInCart };
      }),
    );
  }, [cart]);

  const loadWishlistItems = async () => {
    console.log('loadWishlistItems called, isLoggedIn:', isLoggedIn);

    if (isLoggedIn) {
      await fetchServerWishlist();
    } else {
      await loadLocalWishlist();
    }
  };

  const fetchServerWishlist = async () => {
    try {
      console.log('Fetching server wishlist...');
      showLoader();
      const res = await UserService.wishlist();
      console.log('Server wishlist response:', {
        status: res?.status,
        dataLength: res?.data?.data?.length,
        dataSample: res?.data?.data?.[0],
      });

      const apiItems = res?.data?.data || [];

      if (apiItems.length === 0) {
        console.log(
          'API returned empty array, checking wishlistIds:',
          wishlistIds,
        );
        // Fallback to local if API returns empty but we have local items
        if (wishlistIds && wishlistIds.length > 0) {
          console.log('Falling back to local wishlist');
          await loadLocalWishlist();
          hideLoader();
          return;
        }
      }

      const mapped: DisplayWishlistItem[] = apiItems.map(
        (item: any, index: number) => {
          console.log(`Processing API item ${index}:`, item);

          // Try multiple possible ID sources
          const productId =
            item?.product?.id ||
            item?.product_id ||
            item?.id ||
            item?.product?.product_id ||
            wishlistIds?.[index] ||
            `temp-${index}`;

          const productName =
            item?.product?.name ||
            item?.name ||
            item?.product_name ||
            'Product';

          // Get image
          let imageUrl = null;
          if (item?.product?.front_image) {
            imageUrl = item.product.front_image.startsWith('http')
              ? item.product.front_image
              : Image_url + item.product.front_image;
          } else if (item?.front_image) {
            imageUrl = item.front_image.startsWith('http')
              ? item.front_image
              : Image_url + item.front_image;
          } else if (item?.image) {
            imageUrl = item.image.startsWith('http')
              ? item.image
              : Image_url + item.image;
          }

          // Get price
          let price = '0 €';
          let priceNumeric = 0;
          const variants = item?.variants || item?.product?.variants || [];

          if (variants.length > 0) {
            const firstVariant = variants[0];
            const variantPrice =
              firstVariant?.actual_price ||
              firstVariant?.price ||
              firstVariant?.main_price;

            if (variantPrice) {
              priceNumeric = Number(variantPrice);
              price = `${variantPrice} €`;
            }
          } else if (item?.price) {
            priceNumeric = Number(item.price);
            price = `${item.price} €`;
          } else if (item?.product?.price) {
            priceNumeric = Number(item.product.price);
            price = `${item.product.price} €`;
          }

          return {
            id: String(productId),
            wishlistItemId: String(
              item?.wishlist_item_id || item?.id || productId,
            ),
            name: productName,
            price: price,
            price_numeric: priceNumeric,
            image: imageUrl,
            product_id: Number(productId) || 0,
            variants: variants,
            average_rating: Number(item?.average_rating || item?.rating || 0),
            isInCart: cart
              ? cart.some(
                (cartItem: any) => String(cartItem.id) === String(productId),
              )
              : false,
          };
        },
      );

      console.log(`Mapped ${mapped.length} items from server`);
      setItems(mapped);
      hideLoader();
    } catch (error: any) {
      hideLoader();
      console.error('Error fetching server wishlist:', error);

      // Fallback to local on error
      console.log('Falling back to local wishlist due to error');
      await loadLocalWishlist();

      Toast.show({
        type: 'error',
        text1: 'Failed to load server wishlist',
        text2: 'Showing local items instead',
      });
    }
  };

  const loadLocalWishlist = async () => {
    try {
      console.log('Loading local wishlist...');
      console.log('wishlistItems:', wishlistItems);
      console.log('wishlistIds:', wishlistIds);

      showLoader();

      let mapped: DisplayWishlistItem[] = [];

      // First try to use wishlistItems from context
      if (Array.isArray(wishlistItems) && wishlistItems.length > 0) {
        console.log(
          `Using wishlistItems array with ${wishlistItems.length} items`,
        );

        mapped = wishlistItems.map((item: any, index: number) => {
          console.log(`Processing wishlistItems item ${index}:`, item);

          // Get product ID from transformed item
          const productId =
            item?.id ||
            item?.product_id ||
            wishlistIds?.[index] ||
            item?.originalItem?.product?.id ||
            `local-${index}`;

          const productName =
            item?.name ||
            item?.originalItem?.product?.name ||
            item?.product?.name ||
            `Product ${productId}`;

          // Get image - check multiple sources
          let imageUrl = item?.image;
          if (!imageUrl && item?.front_image) {
            imageUrl = item.front_image.startsWith('http')
              ? item.front_image
              : Image_url + item.front_image;
          }
          if (!imageUrl && item?.originalItem?.product?.front_image) {
            const frontImg = item.originalItem.product.front_image;
            imageUrl = frontImg.startsWith('http')
              ? frontImg
              : Image_url + frontImg;
          }

          // Get price from transformed item
          let price = '0 €';
          let priceNumeric = 0;

          if (item?.variants?.[0]?.actual_price) {
            priceNumeric = Number(item.variants[0].actual_price);
            price = `${item.variants[0].actual_price} €`;
          } else if (item?.variants?.[0]?.price) {
            priceNumeric = Number(item.variants[0].price);
            price = `${item.variants[0].price} €`;
          } else if (item?.price) {
            priceNumeric = Number(item.price);
            price = `${item.price} €`;
          } else if (item?.main_price) {
            priceNumeric = Number(item.main_price);
            price = `${item.main_price} €`;
          }

          return {
            id: String(productId),
            wishlistItemId: String(productId),
            name: productName,
            price: price,
            price_numeric: priceNumeric,
            image: imageUrl,
            product_id: Number(productId) || 0,
            variants: item?.variants || [],
            average_rating: Number(item?.average_rating || 0),
            isInCart: cart
              ? cart.some(
                (cartItem: any) => String(cartItem.id) === String(productId),
              )
              : false,
          };
        });
      }
      // If wishlistItems is empty but we have wishlistIds
      else if (Array.isArray(wishlistIds) && wishlistIds.length > 0) {
        console.log(`Using wishlistIds array with ${wishlistIds.length} IDs`);

        mapped = wishlistIds.map((id: string, index: number) => {
          return {
            id: String(id),
            wishlistItemId: String(id),
            name: `Product ${id}`,
            price: '0 €',
            price_numeric: 0,
            image: null,
            product_id: Number(id) || 0,
            variants: [],
            average_rating: 0,
            isInCart: cart
              ? cart.some(cartItem => String(cartItem.id) === String(id))
              : false,
          };
        });
      }
      // If both are empty but we have items in context state
      else if (items.length > 0) {
        console.log('Keeping existing items:', items.length);
        // Keep current items
        hideLoader();
        return;
      }

      console.log(`Loaded ${mapped.length} local items`);
      setItems(mapped);
      hideLoader();
    } catch (error: any) {
      hideLoader();
      console.error('Error loading local wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load wishlist',
        text2: error.message || 'Please try again',
      });
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      showLoader();
      console.log('Removing from wishlist:', productId);

      if (isLoggedIn) {
        // Remove from server for logged-in users
        const res = await UserService.wishlistDelete(productId);
        console.log('Server removal response:', {
          status: res?.status,
          data: res?.data,
        });

        if (res?.status === HttpStatusCode.Ok) {
          // Remove from local state
          setItems(prev => prev.filter(i => i.id !== productId));

          // Sync with context
          await removeFromWishlist(productId);

          Toast.show({
            type: 'success',
            text1: removedText || 'Removed from wishlist',
          });
        } else {
          console.log('Wishlist delete error:', JSON.stringify(res?.data));
          Toast.show({
            type: 'error',
            text1: res?.data?.message || 'Failed to remove from wishlist',
          });
        }
      } else {
        // Remove locally for guests
        await removeFromWishlist(productId);
        setItems(prev => prev.filter(i => i.id !== productId));

        Toast.show({
          type: 'success',
          text1: 'Removed from wishlist',
        });
      }
    } catch (error: any) {
      hideLoader();
      console.error('Wishlist remove error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to remove from wishlist',
        text2: error.message || 'Please try again',
      });
    } finally {
      hideLoader();
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    try {
      await toggleWishlist(productId);
      // The context will update wishlistItems, which will trigger useEffect
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update wishlist',
        text2: 'Please try again',
      });
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('Refreshing wishlist...');
      await fetchWishlist(); // Refresh context data first
      await loadWishlistItems(); // Then reload display items
    } catch (error) {
      console.error('Error refreshing wishlist:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderEmptyWishlist = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../../assets/Png/heart-1.png')}
        style={styles.emptyHeartIcon}
      />
      <TransletText text="Your wishlist is empty" style={styles.emptyTitle} />
      <TransletText text="Save your favorite items here to keep track of them" style={styles.emptySubtitle} />
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('CategoryScreen')}
      >
        <TransletText text="Browse Products" style={styles.browseButtonText} />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: DisplayWishlistItem }) => (
    <View style={styles.card}>
      {/* Product Image */}
      {item.image ? (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ProductDetails', {
              productId: item.product_id || item.id,
            })
          }
        >
          <Image source={{ uri: item.image }} style={styles.productImage} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.productImage, { backgroundColor: '#eee' }]} />
      )}

      {/* Product Details */}
      <View style={styles.details}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ProductDetails', {
              productId: item.product_id || item.id,
            })
          }
        >
          <TransletText text={item.name} style={styles.productName} />
        </TouchableOpacity>

        {/* Star Rating */}
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map(r => {
            const avg = item.average_rating || 0;
            const isFull = avg >= r;
            const isHalf = avg >= r - 0.5 && avg < r;
            return (
              <View
                key={r}
                style={{ width: 18, height: 18, position: 'relative' }}
              >
                <Text
                  style={{ color: '#ccc', fontSize: 18, position: 'absolute' }}
                >
                  ★
                </Text>
                <View
                  style={{
                    width: isFull ? '100%' : isHalf ? '50%' : '0%',
                    overflow: 'hidden',
                    position: 'absolute',
                  }}
                >
                  <Text style={{ color: '#F0C419', fontSize: 18 }}>★</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Price */}
        <Text style={styles.price}>{item.price}</Text>

        {/* Remove Button Only */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.removeButton}
            activeOpacity={0.7}
            onPress={() => handleToggleWishlist(item.id)}
          >
            <Image
              source={require('../../assets/heart.png')}
              style={{ width: 20, height: 20, tintColor: Colors.button[100] }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.headerButton}
        >
          <Image
            source={require('../../assets/Png/back.png')}
            style={{ width: 20, height: 20 }}
          />
        </TouchableOpacity>
        <TransletText text="Wishlist" style={styles.headerTitle} />
        {/* Removed the bag icon from header */}
        <View style={styles.headerButton} />
      </View>

      {/* Collection Label */}
      <View style={styles.collectionLabel}>
        <Image
          source={require('../../assets/Png/star-fill.png')}
          style={{ width: 20, height: 20 }}
        />
        <TransletText
          text="My Collection"
          style={styles.collectionLabelText}
        />
      </View>

      {/* Wishlist Items */}
      {items.length === 0 ? (
        renderEmptyWishlist()
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2E2E2E']}
              tintColor="#2E2E2E"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerButton: {
    padding: 4,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  collectionLabel: {
    marginHorizontal: 20,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionLabelText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#444',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    resizeMode: 'cover',
    backgroundColor: '#F9F9F9',
  },
  details: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  price: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  removeButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.button[100],
    backgroundColor: '#FFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyHeartIcon: {
    width: 80,
    height: 80,
    opacity: 0.3,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#2E2E2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default WishlistScreen;
