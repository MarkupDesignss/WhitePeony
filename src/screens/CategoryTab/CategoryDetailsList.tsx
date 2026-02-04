import React, { useEffect, useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useCart } from '../../context/CartContext';
import { UserService } from '../../service/ApiService';
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
const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;
const LOADER_TIMEOUT = 10000;

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

  // Filter state
  const [filterRating, setFilterRating] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const { categoryId, categoryTitle, mode } = route.params || {};

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
        text1: 'Request timeout',
        text2: 'Please try again',
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

  const ProductImageCarousel = ({
    images,
    width,
  }: {
    images: any[];
    width?: number;
  }) => {
    const [index, setIndex] = useState(0);
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (!images || images.length <= 1) return;

      const timer = setInterval(() => {
        const next = (index + 1) % images.length;
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setIndex(next);
          Animated.timing(opacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        });
      }, 3000);
      return () => clearInterval(timer);
    }, [index, images]);

    const current = images && images.length ? images[index] : null;
    const source = typeof current === 'string' ? { uri: current } : current;

    return (
      <Animated.View style={{ opacity }}>
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
          />
        )}
      </Animated.View>
    );
  };

  // Normalize product data
  const normalizeProducts = useCallback(
    (products: any[]) => {
      if (!Array.isArray(products)) {
        console.log('Warning: normalizeProducts received non-array:', products);
        return [];
      }

      const cartIds = new Set(
        cart.map((c: any) => String(c.id || c.product_id || '')),
      );

      const normalized = products
        .filter(product => product && typeof product === 'object')
        .map(product => {
          try {
            const productId = String(product?.id || product?.product_id || '');
            return {
              ...product,
              id: productId,
              name: String(
                product?.name || product?.product_name || 'Unnamed Product',
              ),
              front_image: product?.front_image || product?.image || '',
              average_rating: Number(
                product?.average_rating || product?.rating || 0,
              ),
              variants:
                Array.isArray(product?.variants) && product.variants.length > 0
                  ? product.variants
                  : [
                      {
                        price: Number(product?.price || 0),
                        weight: String(product?.weight || ''),
                        unit: String(product?.unit || ''),
                        id: product?.variant_id || null,
                      },
                    ],
              stock_quantity: Number(
                product?.stock_quantity || product?.quantity || 0,
              ),
              is_cart: cartIds.has(productId) ? 'true' : 'false',
            };
          } catch (err) {
            console.log('Error normalizing product:', product, err);
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

      if (mode === 'recommended') {
        response = await UserService.recommended();
      } else if (mode === 'Best Sale') {
        response = await UserService.mostsellingproduct();
      } else if (mode === 'all') {
        response = await UserService.product();
      } else if (categoryId) {
        if (hasFilter) {
          response = await UserService.FilterProducts({
            category_id: categoryId,
            ...filterParams,
          });
        } else {
          response = await UserService.GetCategoryByID(categoryId);
        }
      }

      // Extract products from response
      let productsArray: any[] = [];

      if (response?.data?.data) {
        productsArray = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data?.data || [];
      } else if (response?.data) {
        productsArray = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        productsArray = response;
      }

      // Filter out out-of-stock items BEFORE normalization
      const inStockProducts = productsArray.filter(product => {
        // Check stock quantity
        const stockQty = Number(
          product?.stock_quantity || product?.quantity || 0,
        );
        return stockQty > 0; // Only include items with stock > 0
      });

      // Normalize and set products (only in-stock items)
      const normalizedProducts = normalizeProducts(inStockProducts);
      setApiProducts(normalizedProducts);
    } catch (error: any) {
      console.log('❌ fetchProducts error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load products',
        text2: error.message || 'Please try again',
      });
      setApiProducts([]);
    } finally {
      hideLoader();
    }
  };

  // Fetch products initially
  useEffect(() => {
    fetchProducts();
  }, [categoryId, mode]);

  // Recalculate `is_cart` whenever cart changes
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
        text1: 'Product not available',
      });
      return;
    }

    try {
      await addToCart(Number(productId), variantId);
      Toast.show({
        type: 'success',
        text1: 'Added to cart',
      });
    } catch (error: any) {
      console.log('addToCart failed', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to add to cart',
        text2: error.message || 'Please try again',
      });
    }
  };

  // Client-side sorting function - FIXED
  const clientSideSorting = (sortType: string) => {
    try {
      // Create a copy of the current products
      const productsToSort = [...apiProducts];

      // Filter out any null or undefined products
      const validProducts = productsToSort.filter(
        product => product && typeof product === 'object',
      );

      const sortedProducts = validProducts.sort((a, b) => {
        switch (sortType) {
          case 'price_low_to_high': {
            const priceA = a.variants?.[0]?.price || a.price || 0;
            const priceB = b.variants?.[0]?.price || b.price || 0;
            return Number(priceA) - Number(priceB);
          }

          case 'price_high_to_low': {
            const priceA = a.variants?.[0]?.price || a.price || 0;
            const priceB = b.variants?.[0]?.price || b.price || 0;
            return Number(priceB) - Number(priceA);
          }

          case 'name_a_to_z': {
            const nameA = String(a.name || '').toLowerCase();
            const nameB = String(b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
          }

          case 'name_z_to_a': {
            const nameA = String(a.name || '').toLowerCase();
            const nameB = String(b.name || '').toLowerCase();
            return nameB.localeCompare(nameA);
          }

          case 'rating_high_to_low': {
            const ratingA = Number(a.average_rating) || 0;
            const ratingB = Number(b.average_rating) || 0;
            return ratingB - ratingA;
          }

          case 'newest_first': {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          }

          default:
            return 0;
        }
      });

      setApiProducts(sortedProducts);
      Toast.show({
        type: 'success',
        text1: 'Products sorted',
      });
    } catch (error) {
      console.log('Client-side sorting error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to sort products',
      });
    }
  };

  // Handle sorting of products - FIXED
  const handleSorting = async (sortType: string) => {
    // Close modal immediately
    setSortVisible(false);

    // Show loading indicator
    setIsLoading(true);

    try {
      // Try API sorting first
      try {
        const response = await UserService.Sorting(sortType);

        // Check if response is valid
        if (response && (response.data || response.data === null)) {
          let sortedProducts: any[] = [];

          // Handle different response structures
          if (response.data?.data) {
            sortedProducts = Array.isArray(response.data.data)
              ? response.data.data
              : [];
          } else if (Array.isArray(response.data)) {
            sortedProducts = response.data;
          } else if (Array.isArray(response)) {
            sortedProducts = response;
          } else {
            // If no valid data found, fall back to client-side sorting
            throw new Error('No valid data in API response');
          }

          // Filter by category if needed
          if (categoryId && !mode) {
            sortedProducts = sortedProducts.filter(
              (product: any) =>
                product &&
                product.category_id &&
                String(product.category_id) === String(categoryId),
            );
          }

          // If no products after filtering, show message
          if (sortedProducts.length === 0) {
            Toast.show({
              type: 'info',
              text1: 'No products found for this category',
            });
            // Fall back to client-side sorting
            clientSideSorting(sortType);
            return;
          }

          // Normalize and set products
          const normalizedProducts = normalizeProducts(sortedProducts);
          setApiProducts(normalizedProducts);

          Toast.show({
            type: 'success',
            text1: 'Products sorted successfully',
          });
          return;
        } else {
          throw new Error('Invalid API response');
        }
      } catch (apiError: any) {
        console.log('API sorting failed, using client-side sorting:', apiError);
        // Use client-side sorting as fallback
        clientSideSorting(sortType);
      }
    } catch (error: any) {
      console.log('Overall sorting error:', error);
      // Final fallback to client-side sorting
      clientSideSorting(sortType);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resetting sorting
  const resetSorting = async () => {
    // Close modal immediately
    setSortVisible(false);

    // Show loading
    setIsLoading(true);

    try {
      await fetchProducts();
      Toast.show({
        type: 'success',
        text1: 'Sorting reset',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to reset sorting',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const productId = item?.id || '';
    const productName = item?.name || 'Unnamed Product';
    const imageUrl = item?.front_image
      ? `https://www.markupdesigns.net/whitepeony/storage/${item.front_image}`
      : '';
    const rating = item?.average_rating || 0;
    const price = item?.variants?.[0]?.price || 0;
    const weight = item?.variants?.[0]?.weight || '';
    const unit = item?.variants?.[0]?.unit || '';
    const isOutOfStock = item?.stock_quantity === 0;
    const isInCart = item?.is_cart === 'true';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (productId && !isOutOfStock) {
            navigation.navigate('ProductDetails', { productId });
          }
        }}
        activeOpacity={0.8}
        disabled={!productId || isOutOfStock}
      >
        <ProductImageCarousel
          images={imageUrl ? [{ uri: imageUrl }] : []}
          width={ITEM_WIDTH}
        />

        <View style={styles.cardBody}>
          <TransletText
            text={productName || 'Product'}
            style={styles.cardTitle}
            numberOfLines={2}
          />

          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(r => {
              const isFull = rating >= r;
              const isHalf = rating >= r - 0.5 && rating < r;

              return (
                <View key={r} style={styles.starContainer}>
                  <Text style={styles.starBase}>★</Text>
                  <View
                    style={[
                      styles.starOverlay,
                      { width: isFull ? '100%' : isHalf ? '50%' : '0%' },
                    ]}
                  >
                    <Text style={styles.starFilled}>★</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.cardPrice}>
            {displayPrice(price)} {(weight || unit) && ` - ${weight || unit}`}
          </Text>

          {isOutOfStock ? (
            <TransletText text="Out of Stock" style={styles.outOfStock} />
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (isInCart) {
                  navigation.navigate('CheckoutScreen');
                } else {
                  handleAddToCart(item);
                }
              }}
              style={[styles.addButton, isInCart && styles.goToCartButton]}
            >
              <TransletText
                text={isInCart ? 'Go to Cart' : 'Add to Bag'}
                style={styles.addButtonText}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <TransletText text="No Products Found" style={styles.emptyText} />
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchProducts()}
        >
          <TransletText text="Retry" style={styles.retryButtonText} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderLoader = () => {
    if (!isLoading) return null;

    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#AEB254" style={styles.loader} />
        <TransletText text="Loading products..." style={styles.loaderText} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F3F3F3', '#FFFFFF']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Image
              source={require('../../assets/Png/back.png')}
              style={styles.backIcon}
            />
          </TouchableOpacity>

          <TransletText
            text={categoryTitle || 'Products'}
            style={styles.headerTitle}
            numberOfLines={1}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('CheckoutScreen')}
            style={styles.cartButtonContainer}
          >
            <Image
              source={require('../../assets/Png/order.png')}
              style={styles.cartIcon}
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

        {/* Filter and Sort Buttons */}
        <View style={styles.filterSortContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}
          >
            <TransletText text="Filters ▾" style={styles.filterButtonText} />
          </TouchableOpacity>
        </View>

        {/* Products List */}
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
          ListFooterComponent={renderLoader}
          showsVerticalScrollIndicator={false}
        />

        {/* Loader Overlay */}
        {isLoading && (
          <View style={styles.fullScreenLoader}>
            <ActivityIndicator size="large" color="#AEB254" />
            <TransletText
              text="Loading..."
              style={styles.fullScreenLoaderText}
            />
          </View>
        )}

        {/* Filter Modal */}
        <Modal
          visible={filterVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFilterVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFilterVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={e => e.stopPropagation()}
                style={styles.modalTouchable}
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

                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Rating</Text>
                    <View style={styles.ratingFilterContainer}>
                      {[5, 4, 3, 2, 1].map(r => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.ratingOption,
                            filterRating === String(r) &&
                              styles.ratingOptionSelected,
                          ]}
                          onPress={() => setFilterRating(String(r))}
                        >
                          <Text
                            style={[
                              styles.ratingOptionText,
                              filterRating === String(r) &&
                                styles.ratingOptionTextSelected,
                            ]}
                          >
                            {r}★
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.filterLabel}>Min Price</Text>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.currencySymbol}>€</Text>
                      <TextInput
                        style={styles.priceInput}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                        value={filterMinPrice}
                        onChangeText={text => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setFilterMinPrice(numericValue);
                        }}
                        placeholder="Min"
                      />
                    </View>

                    <Text style={styles.filterLabel}>Max Price</Text>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.currencySymbol}>€</Text>
                      <TextInput
                        style={styles.priceInput}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                        value={filterMaxPrice}
                        onChangeText={text => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setFilterMaxPrice(numericValue);
                        }}
                        placeholder="Max"
                      />
                    </View>

                    {filterMinPrice &&
                      filterMaxPrice &&
                      Number(filterMinPrice) > Number(filterMaxPrice) && (
                        <Text style={styles.priceError}>
                          Min price cannot be greater than max price
                        </Text>
                      )}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.resetButton]}
                      onPress={async () => {
                        setFilterVisible(false);
                        setFilterRating('');
                        setFilterMinPrice('');
                        setFilterMaxPrice('');
                        await fetchProducts();
                      }}
                    >
                      <Text
                        style={[styles.modalButtonText, styles.resetButtonText]}
                      >
                        Reset
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        styles.applyButton,
                        filterMinPrice &&
                          filterMaxPrice &&
                          Number(filterMinPrice) > Number(filterMaxPrice) &&
                          styles.applyButtonDisabled,
                      ]}
                      onPress={async () => {
                        if (
                          filterMinPrice &&
                          filterMaxPrice &&
                          Number(filterMinPrice) > Number(filterMaxPrice)
                        ) {
                          Toast.show({
                            type: 'error',
                            text1: 'Invalid price range',
                          });
                          return;
                        }

                        setFilterVisible(false);
                        await fetchProducts({
                          rating: filterRating,
                          min_price: filterMinPrice,
                          max_price: filterMaxPrice,
                        });
                      }}
                      disabled={
                        filterMinPrice &&
                        filterMaxPrice &&
                        Number(filterMinPrice) > Number(filterMaxPrice)
                      }
                    >
                      <Text
                        style={[styles.modalButtonText, styles.applyButtonText]}
                      >
                        Apply
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        {/* Sort Modal - FIXED STRUCTURE */}
        <Modal
          visible={sortVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSortVisible(false)}
        >
          <View style={styles.modalOverlayContainer}>
            {/* Overlay that closes the modal */}
            <TouchableOpacity
              style={styles.modalOverlayTouchable}
              activeOpacity={1}
              onPress={() => setSortVisible(false)}
            />

            {/* Modal content */}
            <View style={styles.sortModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sort By</Text>
                <TouchableOpacity
                  onPress={() => setSortVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Image
                    source={require('../../assets/Png/close.png')}
                    style={styles.closeIcon}
                  />
                </TouchableOpacity>
              </View>

              {/* Reset Option */}
              <TouchableOpacity
                style={[styles.sortOption, styles.resetSortOption]}
                onPress={() => {
                  resetSorting();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.sortOptionText, styles.resetSortOptionText]}
                >
                  Reset to Default
                </Text>
              </TouchableOpacity>

              {/* Sorting Options */}
              {[
                { id: 'price_low_to_high', label: 'Price: Low to High' },
                { id: 'price_high_to_low', label: 'Price: High to Low' },
                { id: 'name_a_to_z', label: 'Name: A to Z' },
                { id: 'name_z_to_a', label: 'Name: Z to A' },
                { id: 'rating_high_to_low', label: 'Rating: High to Low' },
                { id: 'newest_first', label: 'Newest First' },
              ].map(sortOption => (
                <TouchableOpacity
                  key={sortOption.id}
                  style={styles.sortOption}
                  onPress={() => {
                    handleSorting(sortOption.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sortOptionText}>{sortOption.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default CategoryDetailsList;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  cartButtonContainer: {
    position: 'relative',
    padding: 8,
  },
  cartIcon: {
    width: 20,
    height: 20,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#AEB254',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterSortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: '#AEB254',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    minWidth: widthPercentageToDP(35),
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sortButton: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    minWidth: widthPercentageToDP(35),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  sortButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  placeholderImage: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    minHeight: 40,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starContainer: {
    width: 18,
    height: 18,
    position: 'relative',
    marginRight: 2,
  },
  starBase: {
    color: '#ccc',
    fontSize: 18,
    position: 'absolute',
  },
  starOverlay: {
    overflow: 'hidden',
    position: 'absolute',
  },
  starFilled: {
    color: '#F0C419',
    fontSize: 18,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b3b2e',
    marginBottom: 12,
  },
  outOfStock: {
    fontSize: 14,
    fontWeight: '600',
    color: 'red',
    textAlign: 'center',
    paddingVertical: 8,
  },
  addButton: {
    backgroundColor: '#AEB254',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  goToCartButton: {
    backgroundColor: '#AEB254',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#AEB254',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loaderContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loader: {
    marginBottom: 8,
  },
  loaderText: {
    fontSize: 14,
    color: '#666',
  },
  fullScreenLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenLoaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalOverlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  sortModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeIcon: {
    width: 24,
    height: 24,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  ratingFilterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  ratingOption: {
    backgroundColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  ratingOptionSelected: {
    backgroundColor: '#AEB254',
  },
  ratingOptionText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  ratingOptionTextSelected: {
    color: '#fff',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  priceError: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  resetButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#AEB254',
    marginLeft: 8,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  sortOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  resetSortOption: {
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
    borderRadius: 8,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
  },
  resetSortOptionText: {
    color: '#666',
    fontWeight: '500',
  },
});
