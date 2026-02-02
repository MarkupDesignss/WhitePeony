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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useCart } from '../../context/CartContext'; // adjust import path if needed
import { UserService } from '../../service/ApiService'; // replace with your actual functions
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../../constant/dimentions';
import { Colors } from '../../constant';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import { HttpStatusCode } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;
const LOADER_TIMEOUT = 10000; // 10 seconds timeout

const CategoryDetailsList = ({ navigation, route }: any) => {
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

    // Clear any existing timeout
    clearLoaderTimeout();

    // Set new timeout
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
      if (!Array.isArray(products)) return [];

      const cartIds = new Set(
        cart.map((c: any) => String(c.id || c.product_id || '')),
      );

      return products.map(product => {
        const productId = String(product?.id || product?.product_id || '');
        const normalizedProduct = {
          ...product,
          id: productId,
          name: product?.name || product?.product_name || 'Unnamed Product',
          front_image: product?.front_image || product?.image || '',
          average_rating: product?.average_rating || product?.rating || 0,
          variants:
            Array.isArray(product?.variants) && product.variants.length > 0
              ? product.variants
              : [
                  {
                    price: product?.price || 0,
                    weight: product?.weight || '',
                    unit: product?.unit || '',
                    id: product?.variant_id || null,
                  },
                ],
          stock_quantity: product?.stock_quantity || product?.quantity || 0,
          is_cart: cartIds.has(productId) ? 'true' : 'false',
        };

        return normalizedProduct;
      });
    },
    [cart],
  );

  // 🧩 Fetch products based on mode
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

      // Normalize and set products
      const normalizedProducts = normalizeProducts(productsArray);
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

  // 🧠 Fetch products initially
  useEffect(() => {
    fetchProducts();
  }, [categoryId, mode]);

  // 🔁 Recalculate `is_cart` whenever cart changes
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

  // 🧩 Handle sorting of products
  const ApiSorting = async (sortType: string) => {
    showLoader();

    try {
      const res = await UserService.Sorting(sortType);

      if (res?.status === HttpStatusCode.Ok) {
        const sortedProducts = res?.data?.data || [];
        const normalizedProducts = normalizeProducts(sortedProducts);

        setApiProducts(normalizedProducts);
        setSortVisible(false);

        Toast.show({
          type: 'success',
          text1: 'Products sorted successfully',
        });
      } else {
        throw new Error('Failed to sort products');
      }
    } catch (error: any) {
      console.log('Sorting error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to sort products',
        text2: error.message || 'Please try again',
      });
    } finally {
      hideLoader();
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
          if (productId) {
            navigation.navigate('ProductDetails', { productId });
          }
        }}
        activeOpacity={0.8}
        disabled={!productId}
      >
        <ProductImageCarousel
          images={imageUrl ? [{ uri: imageUrl }] : []}
          width={ITEM_WIDTH}
        />

        <View style={styles.cardBody}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {productName}
          </Text>

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
            {Math.round(price)} €{(weight || unit) && ` - ${weight || unit}`}
          </Text>

          {isOutOfStock ? (
            <Text style={styles.outOfStock}>Out of Stock</Text>
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
              <Text style={styles.addButtonText}>
                {isInCart ? 'Go to Cart' : 'Add to Bag'}
              </Text>
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
        <Text style={styles.emptyText}>No Products Found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchProducts()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLoader = () => {
    if (!isLoading) return null;

    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#AEB254" style={styles.loader} />
        <Text style={styles.loaderText}>Loading products...</Text>
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

          <Text style={styles.headerTitle} numberOfLines={1}>
            {categoryTitle || 'Products'}
          </Text>

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
            <Text style={styles.filterButtonText}>Filters ▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortVisible(true)}
          >
            <Text style={styles.sortButtonText}>Sort ▾</Text>
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
            <Text style={styles.fullScreenLoaderText}>Loading...</Text>
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

        {/* Sort Modal */}
        <Modal
          visible={sortVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSortVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSortVisible(false)}
          >
            <View style={styles.modalContainer}>
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

                {[
                  'price_low_to_high',
                  'price_high_to_low',
                  'name_a_to_z',
                  'name_z_to_a',
                ].map(sortType => (
                  <TouchableOpacity
                    key={sortType}
                    style={styles.sortOption}
                    onPress={() => ApiSorting(sortType)}
                  >
                    <Text style={styles.sortOptionText}>
                      {sortType === 'price_low_to_high' && 'Price: Low to High'}
                      {sortType === 'price_high_to_low' && 'Price: High to Low'}
                      {sortType === 'name_a_to_z' && 'Name: A to Z'}
                      {sortType === 'name_z_to_a' && 'Name: Z to A'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
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
    backgroundColor: '#2DA3C7',
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
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    paddingBottom: 20,
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
});
