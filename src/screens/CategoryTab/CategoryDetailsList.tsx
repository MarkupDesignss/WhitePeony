import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useCart } from '../../context/CartContext';
import { UserService, Image_url } from '../../service/ApiService';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../../constant/dimentions';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransletText from '../../components/TransletText';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import { useAppSelector } from '../../hooks/useAppSelector';
import { UserDataContext } from '../../context/userDataContext';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 36) / 2;
const LOADER_TIMEOUT = 10000;

// Modern color palette
const COLORS = {
  primary: '#2A2A2A', // Dark charcoal
  secondary: '#5A5A5A', // Medium gray
  accent: '#D4AF37', // Gold accent
  background: '#FAF9F7', // Off-white
  cardBg: '#FFFFFF', // White
  text: '#1C1C1C', // Almost black
  textLight: '#767676', // Light gray
  border: '#EFEFEF', // Very light gray
  success: '#2E7D32', // Green
  warning: '#C62828', // Red
  goldLight: '#F5E7C8', // Light gold
  shadow: '#000000',
};

const CategoryDetailsList = ({ navigation, route }: any) => {
  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });
  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );

  const displayPrice = (priceEUR: any): string => {
    return convertAndFormatPrice(priceEUR, selectedCurrency, rates);
  };

  const { addToCart, cart } = useCart();
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('');

  // Get user type from context for B2B/B2C filtering
  const { isLoggedIn, userType } = useContext(UserDataContext);

  // Filter state
  const [filterRating, setFilterRating] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const { categoryId, categoryTitle, mode } = route.params || {};

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // Ref for loader timeout
  const loaderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear loader timeout
  const clearLoaderTimeout = useCallback(() => {
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
  }, []);

  // Set loader with timeout
  const showLoader = useCallback(() => {
    setIsLoading(true);
    clearLoaderTimeout();
    loaderTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Request Timeout',
        text2: 'Please check your internet connection and try again',
      });
    }, LOADER_TIMEOUT);
  }, [clearLoaderTimeout]);

  // Hide loader
  const hideLoader = useCallback(() => {
    setIsLoading(false);
    clearLoaderTimeout();
  }, [clearLoaderTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLoaderTimeout();
    };
  }, [clearLoaderTimeout]);

  // Helper function to get current product type for filtering
  const getCurrentProductType = useCallback(() => {
    if (!isLoggedIn) return null;
    if (userType === null || userType === undefined) return null;
    return userType;
  }, [isLoggedIn, userType]);

  // Filter products by type (B2B/B2C)
  const filterProductsByType = useCallback(
    (products: any[]) => {
      if (!Array.isArray(products)) return [];

      const currentType = getCurrentProductType();
      if (currentType === null) return products;

      return products.filter(item => {
        let productType = null;
        if (item?.product_type) productType = item.product_type;
        else if (item?.product?.product_type)
          productType = item.product.product_type;
        else if (item?.type) productType = item.type;

        if (!productType) return true;
        return productType === currentType;
      });
    },
    [getCurrentProductType],
  );

  // Beautiful Product Image Carousel
  const ProductImageCarousel = ({
    images,
    width,
  }: {
    images: any[];
    width?: number;
  }) => {
    const [index, setIndex] = useState(0);
    const opacity = useRef(new Animated.Value(1)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (!images || images.length <= 1) return;

      const timer = setInterval(() => {
        const next = (index + 1) % images.length;
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.95,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIndex(next);
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 3000);
      return () => clearInterval(timer);
    }, [index, images]);

    const current = images && images.length ? images[index] : null;
    const source = typeof current === 'string' ? { uri: current } : current;

    return (
      <Animated.View style={{ opacity, transform: [{ scale }], flex: 1 }}>
        {source ? (
          <Image
            source={source}
            style={[styles.cardImage, width ? { width } : {}]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardImage,
              width ? { width } : {},
              styles.placeholderImage,
            ]}
          >
            <Image
              source={require('../../assets/peony_logo.png')}
              style={{ width: 40, height: 40, opacity: 0.3 }}
              resizeMode="contain"
            />
          </View>
        )}
      </Animated.View>
    );
  };

  // Normalize product data
  const normalizeProducts = useCallback(
    (products: any[]) => {
      if (!Array.isArray(products)) return [];

      const cartIds = new Set(
        cart.map((c: any) => String(c.id || c.product_id || '')),
      );

      const normalized = products
        .filter(product => product && typeof product === 'object')
        .map(product => {
          try {
            const productId = String(product?.id || product?.product_id || '');

            let imageUrl = '';
            if (product?.front_image) {
              imageUrl = product.front_image.startsWith('http')
                ? product.front_image
                : `${Image_url}${product.front_image}`;
            } else if (product?.image) {
              imageUrl = product.image.startsWith('http')
                ? product.image
                : `${Image_url}${product.image}`;
            }

            let variants = [];
            if (
              Array.isArray(product?.variants) &&
              product.variants.length > 0
            ) {
              variants = product.variants;
            } else {
              variants = [
                {
                  price: Number(product?.price || product?.main_price || 0),
                  actual_price: Number(
                    product?.actual_price || product?.discounted_price || 0,
                  ),
                  weight: String(product?.weight || ''),
                  unit: String(product?.unit || ''),
                  id: product?.variant_id || null,
                },
              ];
            }

            let stockQuantity = 0;
            if (product?.stock_quantity !== undefined)
              stockQuantity = Number(product.stock_quantity);
            else if (product?.quantity !== undefined)
              stockQuantity = Number(product.quantity);
            else if (product?.stock !== undefined)
              stockQuantity = Number(product.stock);
            else if (variants[0]?.stock_quantity)
              stockQuantity = Number(variants[0].stock_quantity);

            return {
              ...product,
              id: productId,
              name: String(
                product?.name || product?.product_name || 'Unnamed Product',
              ),
              front_image: imageUrl,
              average_rating: Number(
                product?.average_rating || product?.rating || 0,
              ),
              variants: variants,
              stock_quantity: stockQuantity,
              is_cart: cartIds.has(productId) ? 'true' : 'false',
              is_out_of_stock: stockQuantity <= 0,
            };
          } catch (err) {
            return null;
          }
        })
        .filter(product => product !== null);

      return normalized;
    },
    [cart],
  );

  // Fetch products based on mode
  const fetchProducts = async (filterParams: any = {}) => {
    showLoader();

    try {
      let response: any = null;
      const hasFilter =
        filterParams &&
        (filterParams.rating ||
          filterParams.min_price ||
          filterParams.max_price);

      if (!mode && !categoryId) {
        Toast.show({
          type: 'error',
          text1: 'Unable to Load Products',
          text2: 'Category information is missing',
        });
        setApiProducts([]);
        return;
      }

      console.log('📡 Making API call with:', {
        mode,
        categoryId,
        hasFilter,
        filterParams,
      });

      if (mode === 'recommended') response = await UserService.recommended();
      else if (mode === 'Best Sale')
        response = await UserService.mostsellingproduct();
      else if (mode === 'all') response = await UserService.product();
      else if (categoryId) {
        if (hasFilter) {
          response = await UserService.FilterProducts({
            category_id: categoryId,
            ...filterParams,
          });
        } else {
          const numericId = Number(categoryId);
          if (isNaN(numericId)) throw new Error('Invalid category ID');
          response = await UserService.GetCategoryByID(numericId);
        }
      }

      if (!response) throw new Error('No response from server');

      const isSuccessStatus = response.status >= 200 && response.status < 300;
      if (!isSuccessStatus) {
        console.error('❌ API returned error status:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        });
        Toast.show({
          type: 'error',
          text1: 'Failed to Load Products',
          text2: response.data?.message || 'Please try again later',
        });
        setApiProducts([]);
        return;
      }

      let productsArray: any[] = [];

      console.log('📥 Response data structure:', {
        hasData: !!response.data,
        dataType: typeof response.data,
        keys: response.data ? Object.keys(response.data) : [],
      });

      if (response.data?.data && Array.isArray(response.data.data)) {
        productsArray = response.data.data;
        console.log(
          '✅ Found products in response.data.data:',
          productsArray.length,
        );
      } else if (
        response.data?.products &&
        Array.isArray(response.data.products)
      ) {
        productsArray = response.data.products;
        console.log(
          '✅ Found products in response.data.products:',
          productsArray.length,
        );
      } else if (Array.isArray(response.data)) {
        productsArray = response.data;
        console.log(
          '✅ Found products in response.data array:',
          productsArray.length,
        );
      } else if (Array.isArray(response)) {
        productsArray = response;
        console.log(
          '✅ Found products in direct response array:',
          productsArray.length,
        );
      } else if (response.data && typeof response.data === 'object') {
        if (response.data.id || response.data.product_id) {
          productsArray = [response.data];
          console.log('✅ Found single product object');
        } else {
          console.warn('⚠️ Unknown response structure:', response.data);
        }
      }

      console.log('📦 Total products extracted:', productsArray.length);

      if (productsArray.length === 0) {
        setApiProducts([]);
        Toast.show({
          type: 'info',
          text1: 'No Products Available',
          text2: 'This category is currently empty',
        });
        return;
      }

      // Log first product for debugging
      if (productsArray.length > 0) {
        console.log('📦 Sample product raw:', {
          id: productsArray[0].id,
          name: productsArray[0].name,
          product_type: productsArray[0].product_type,
          hasVariants: !!productsArray[0].variants,
          stock_quantity: productsArray[0].stock_quantity,
        });
      }

      // Apply B2B/B2C filtering
      const typeFilteredProducts = filterProductsByType(productsArray);
      console.log(
        '📦 Products after type filtering:',
        typeFilteredProducts.length,
      );

      // Mark out of stock instead of filtering
      const productsWithStockInfo = typeFilteredProducts.map(product => ({
        ...product,
        calculated_stock: Number(
          product?.stock_quantity || product?.quantity || product?.stock || 0,
        ),
        is_out_of_stock:
          Number(
            product?.stock_quantity || product?.quantity || product?.stock || 0,
          ) <= 0,
      }));

      console.log('📦 Products with stock info:', {
        total: productsWithStockInfo.length,
        outOfStock: productsWithStockInfo.filter(p => p.is_out_of_stock).length,
        inStock: productsWithStockInfo.filter(p => !p.is_out_of_stock).length,
      });

      const normalizedProducts = normalizeProducts(productsWithStockInfo);
      console.log('📦 Normalized products:', normalizedProducts.length);

      setApiProducts(normalizedProducts);

      // Show success message with count
      const inStockCount = normalizedProducts.filter(
        p => !p.is_out_of_stock,
      ).length;
      const outOfStockCount = normalizedProducts.filter(
        p => p.is_out_of_stock,
      ).length;

      if (inStockCount > 0) {
        Toast.show({
          type: 'success',
          text1: 'Products Loaded',
          text2: `${inStockCount} products available${outOfStockCount > 0 ? `, ${outOfStockCount} out of stock` : ''
            }`,
        });
      } else if (outOfStockCount > 0) {
        Toast.show({
          type: 'info',
          text1: 'All Products Out of Stock',
          text2: 'Check back later for availability',
        });
      }
    } catch (error: any) {
      console.error('❌ fetchProducts error:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Unable to load products. Please try again.',
      });
      setApiProducts([]);
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryId, mode, isLoggedIn, userType]);

  useEffect(() => {
    if (apiProducts.length > 0) {
      const updatedProducts = normalizeProducts(apiProducts);
      setApiProducts(updatedProducts);
    }
  }, [cart]);

  const handleAddToCart = async (item: any) => {
    const productId = item?.id ?? item?.product_id;
    const variantId = item?.variants?.[0]?.id ?? item?.variant_id ?? null;

    if (!productId) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Add to Cart',
        text2: 'Product information is incomplete',
      });
      return;
    }

    if (item?.stock_quantity <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Out of Stock',
        text2: 'This product is currently unavailable',
      });
      return;
    }

    try {
      await addToCart(Number(productId), variantId);
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: 'Product has been added to your cart',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Add',
        text2: error.message || 'Please try again',
      });
    }
  };

  // Handle sorting
  const handleSorting = async (sortType: string) => {
    setSortVisible(false);
    setSelectedSort(sortType);
    setIsLoading(true);

    try {
      // Simulate sorting or implement actual API call
      let sortedProducts = [...apiProducts];

      switch (sortType) {
        case 'price_low_to_high':
          sortedProducts.sort(
            (a, b) =>
              (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0),
          );
          break;
        case 'price_high_to_low':
          sortedProducts.sort(
            (a, b) =>
              (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0),
          );
          break;
        case 'name_a_to_z':
          sortedProducts.sort((a, b) =>
            (a.name || '').localeCompare(b.name || ''),
          );
          break;
        case 'name_z_to_a':
          sortedProducts.sort((a, b) =>
            (b.name || '').localeCompare(a.name || ''),
          );
          break;
        case 'rating_high_to_low':
          sortedProducts.sort(
            (a, b) => (b.average_rating || 0) - (a.average_rating || 0),
          );
          break;
        default:
          break;
      }

      setApiProducts(sortedProducts);
      Toast.show({
        type: 'success',
        text1: 'Products Sorted',
        text2: 'Products have been rearranged',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Sorting Failed',
        text2: 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if apply button should be disabled
  const isApplyDisabled =
    (!filterRating && !filterMinPrice && !filterMaxPrice) ||
    (filterMinPrice &&
      filterMaxPrice &&
      Number(filterMinPrice) > Number(filterMaxPrice));

  // Render loader
  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color={COLORS.accent} />
    </View>
  );

  // Beautiful Product Card Render - NO HOOKS INSIDE
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const productId = item?.id || '';
    const productName = item?.name || 'Unnamed Product';

    let imageUrl = '';
    if (item?.front_image) {
      imageUrl = item.front_image.startsWith('http')
        ? item.front_image
        : item.front_image;
    }

    const rating = item?.average_rating || 0;
    const price = item?.variants?.[0]?.price || 0;
    const originalPrice = item?.variants?.[0]?.actual_price || 0;
    const hasDiscount = originalPrice > 0 && originalPrice < price;
    const weight = item?.variants?.[0]?.weight || '';
    const unit = item?.variants?.[0]?.unit || '';
    const isOutOfStock =
      item?.stock_quantity <= 0 || item?.is_out_of_stock === true;
    const isInCart = item?.is_cart === 'true';

    return (
      <View style={{ width: ITEM_WIDTH }}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            if (productId && !isOutOfStock) {
              navigation.navigate('ProductDetails', { productId });
            }
          }}
          activeOpacity={0.9}
          disabled={!productId}
        >
          {/* Image Container with Wishlist Button */}
          <View style={styles.cardImageContainer}>
            <ProductImageCarousel
              images={imageUrl ? [{ uri: imageUrl }] : []}
            />

            {/* Wishlist Button */}
            <TouchableOpacity style={styles.wishlistButton}>
              <Image
                source={require('../../assets/Png/heart-1.png')}
                style={[styles.wishlistIcon, { tintColor: COLORS.textLight }]}
              />
            </TouchableOpacity>

            {/* Discount Badge */}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(((price - originalPrice) / price) * 100)}% OFF
                </Text>
              </View>
            )}

            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockOverlayText}>Out of Stock</Text>
              </View>
            )}
          </View>

          {/* Product Details */}
          <View style={styles.cardBody}>
            {/* Rating */}
            <View style={styles.ratingContainer}>
              <View style={styles.starsWrapper}>
                {[1, 2, 3, 4, 5].map(r => (
                  <Text
                    key={r}
                    style={[
                      styles.star,
                      { color: r <= rating ? COLORS.accent : '#E0E0E0' },
                    ]}
                  >
                    ★
                  </Text>
                ))}
              </View>
              <Text style={styles.ratingCount}>({rating.toFixed(1)})</Text>
            </View>

            {/* Product Name */}
            <TransletText
              text={productName}
              style={styles.cardTitle}
              numberOfLines={2}
            />

            {/* Price Section */}
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>
                {displayPrice(hasDiscount ? originalPrice : price)}
              </Text>
              {hasDiscount && (
                <Text style={styles.originalPrice}>{displayPrice(price)}</Text>
              )}
            </View>

            {/* Weight/Unit */}
            {(weight || unit) && (
              <Text style={styles.weightText}>
                {weight} {unit}
              </Text>
            )}

            {/* Add to Cart Button */}
            {!isOutOfStock && (
              <TouchableOpacity
                onPress={e => {
                  e.stopPropagation();
                  if (isInCart) {
                    navigation.navigate('CheckoutScreen');
                  } else {
                    handleAddToCart(item);
                  }
                }}
                style={[styles.addButton, isInCart && styles.goToCartButton]}
              >
                <Text style={styles.addButtonText}>
                  {isInCart ? 'GO TO CART' : 'ADD TO BAG'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Empty State Component
  const renderEmptyComponent = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../../assets/peony_logo.png')}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptySubtitle}>
          Try checking back later or explore other categories
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchProducts()}
        >
          <Text style={styles.retryButtonText}>Browse Categories</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Header Component
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.headerButton}
      >
        <Image
          source={require('../../assets/Png/back.png')}
          style={styles.headerIcon}
        />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {categoryTitle || 'Products'}
      </Text>

      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={() => setSortVisible(true)}
          style={styles.headerButton}
        >
          {/* Using order.png for sort icon */}
          <Image
            source={require('../../assets/filter.png')}
            style={styles.headerIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('CheckoutScreen')}
          style={styles.headerButton}
        >
          <Image
            source={require('../../assets/Png/order.png')}
            style={styles.headerIcon}
          />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cart.length > 99 ? '99+' : cart.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        {renderHeader()}

        {/* Filter Bar - Using text buttons */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}
          >
            <Text style={styles.filterButtonText}>FILTER</Text>
          </TouchableOpacity>

          <View style={styles.filterDivider} />

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setSortVisible(true)}
          >
            <Text style={styles.filterButtonText}>SORT</Text>
          </TouchableOpacity>
        </View>

        {/* Products Grid */}
        <FlatList
          data={apiProducts}
          keyExtractor={(item, index) =>
            item?.id ? String(item.id) : `item-${index}`
          }
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={isLoading ? renderLoader : null}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        )}

        {/* Filter Modal */}
        <Modal
          visible={filterVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFilterVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setFilterVisible(false)}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filters</Text>
                  <TouchableOpacity onPress={() => setFilterVisible(false)}>
                    <Image
                      source={require('../../assets/Png/close.png')}
                      style={styles.closeIcon}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {/* Rating Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Rating</Text>
                    <View style={styles.ratingOptions}>
                      {[5, 4, 3, 2, 1].map(r => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.ratingChip,
                            filterRating === String(r) &&
                            styles.ratingChipSelected,
                          ]}
                          onPress={() => setFilterRating(String(r))}
                        >
                          <Text
                            style={[
                              styles.ratingChipText,
                              filterRating === String(r) &&
                              styles.ratingChipTextSelected,
                            ]}
                          >
                            {r} ★ & above
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Price Range Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Price Range</Text>
                    <View style={styles.priceInputsRow}>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>€</Text>
                        <TextInput
                          style={styles.priceInput}
                          keyboardType="numeric"
                          placeholder="Min"
                          placeholderTextColor={COLORS.textLight}
                          value={filterMinPrice}
                          onChangeText={text =>
                            setFilterMinPrice(text.replace(/[^0-9]/g, ''))
                          }
                        />
                      </View>
                      <View style={styles.priceSeparator}>
                        <View style={styles.priceSeparatorLine} />
                      </View>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>€</Text>
                        <TextInput
                          style={styles.priceInput}
                          keyboardType="numeric"
                          placeholder="Max"
                          placeholderTextColor={COLORS.textLight}
                          value={filterMaxPrice}
                          onChangeText={text =>
                            setFilterMaxPrice(text.replace(/[^0-9]/g, ''))
                          }
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={async () => {
                      setFilterVisible(false);
                      setFilterRating('');
                      setFilterMinPrice('');
                      setFilterMaxPrice('');
                      await fetchProducts();
                    }}
                  >
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      isApplyDisabled && styles.applyButtonDisabled,
                    ]}
                    onPress={async () => {
                      const params: any = {};
                      if (filterRating) params.rating = filterRating;
                      if (filterMinPrice) params.min_price = filterMinPrice;
                      if (filterMaxPrice) params.max_price = filterMaxPrice;
                      setFilterVisible(false);
                      await fetchProducts(params);
                    }}
                    disabled={isApplyDisabled}
                  >
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Sort Modal */}
        <Modal
          visible={sortVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSortVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSortVisible(false)}
            />
            <View style={styles.sortModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sort By</Text>
                <TouchableOpacity onPress={() => setSortVisible(false)}>
                  <Image
                    source={require('../../assets/Png/close.png')}
                    style={styles.closeIcon}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.sortOptions}>
                {[
                  { id: 'recommended', label: 'Recommended' },
                  { id: 'price_low_to_high', label: 'Price: Low to High' },
                  { id: 'price_high_to_low', label: 'Price: High to Low' },
                  { id: 'name_a_to_z', label: 'Name: A to Z' },
                  { id: 'name_z_to_a', label: 'Name: Z to A' },
                  { id: 'rating_high_to_low', label: 'Rating: High to Low' },
                  { id: 'newest_first', label: 'Newest First' },
                ].map(sortOption => (
                  <TouchableOpacity
                    key={sortOption.id}
                    style={[
                      styles.sortOption,
                      selectedSort === sortOption.id &&
                      styles.sortOptionSelected,
                    ]}
                    onPress={() => {
                      handleSorting(sortOption.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        selectedSort === sortOption.id &&
                        styles.sortOptionTextSelected,
                      ]}
                    >
                      {sortOption.label}
                    </Text>
                    {selectedSort === sortOption.id && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default CategoryDetailsList;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  cartBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9F9F9',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  wishlistIcon: {
    width: 18,
    height: 18,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  discountText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  outOfStockOverlayText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starsWrapper: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 14,
    marginRight: 2,
  },
  ratingCount: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '400',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
    height: 40,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  originalPrice: {
    fontSize: 13,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  weightText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 12,
    fontWeight: '400',
  },
  addButton: {
    backgroundColor: "#AEB254",
    borderRadius: 25,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  goToCartButton: {
    backgroundColor: COLORS.accent,
  },
  addButtonText: {
    color: COLORS.cardBg,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  sortModalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.textLight,
  },
  modalBody: {
    paddingVertical: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ratingChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  ratingChipText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  ratingChipTextSelected: {
    color: COLORS.primary,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
  },
  currencySymbol: {
    fontSize: 16,
    color: COLORS.textLight,
    marginRight: 4,
    fontWeight: '500',
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  priceSeparator: {
    width: 20,
    alignItems: 'center',
  },
  priceSeparatorLine: {
    width: 10,
    height: 2,
    backgroundColor: COLORS.border,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: COLORS.cardBg,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sortOptions: {
    paddingVertical: 10,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sortOptionSelected: {
    backgroundColor: 'transparent',
  },
  sortOptionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '400',
  },
  sortOptionTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 18,
    color: COLORS.accent,
    fontWeight: '600',
  },
});
