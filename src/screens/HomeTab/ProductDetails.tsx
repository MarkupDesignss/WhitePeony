import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  Modal,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { Colors } from '../../constant';
import ImageView from 'react-native-image-viewing';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import Toast from 'react-native-toast-message';
import { formatDate } from '../../helpers/helpers';
import { WishlistContext } from '../../context';
import { useCart } from '../../context/CartContext';
import RecommendedProductCard from './RecommendedProductCard';
import CurrencySelectorModal from '../../components/CurrencySelectorModal';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../../constant/dimentions';
import LinearGradient from 'react-native-linear-gradient';
import Video from 'react-native-video';
import LoginModal from '../../components/LoginModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
// Add FastImage for better image performance
import FastImage from 'react-native-fast-image';

const wp = widthPercentageToDP;
const hp = heightPercentageToDP;
const HERO_HEIGHT = hp(28);
const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_SPACING = wp(4);
const ITEM_SPACING = wp(3);
const BANNER_WIDTH = SCREEN_WIDTH - SIDE_SPACING * 2;
const ITEM_FULL_WIDTH = BANNER_WIDTH + ITEM_SPACING;

// Cache for product data to avoid re-fetching
const productCache = new Map();

type ProductDetailsProps = {
  route: { params: { productId: string } };
};

interface ProductVariant {
  id: string | number;
  price: string;
  actual_price?: string;
  unit?: string;
  weight?: string;
  name?: string;
  percentage?: number;
  stock_quantity?: number;
}

interface ProductData {
  id: string | number;
  name: string;
  description: string;
  front_image?: string;
  back_image?: string;
  side_image?: string;
  images: string[];
  main_price?: string;
  unit?: string;
  category_id: string | string[];
  variants: ProductVariant[];
  average_rating?: number;
  is_cart?: boolean;
  stock_quantity?: number;
}

const ProductDetails = ({ route }: ProductDetailsProps) => {
  const { productId: proDuctID } = route.params;
  const navigation = useNavigation<any>();
  const { toggleWishlist, isWishlisted } = useContext(WishlistContext);
  const { addToCart, cart, isLoggedIn } = useCart();

  // State
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [baseUrl, setBaseUrl] = useState(
    'https://www.markupdesigns.net/whitepeony/storage/',
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [displayPrice, setDisplayPrice] = useState('0');
  const [actualPrice, setActualPrice] = useState('0');
  const [displayUnit, setDisplayUnit] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [isInCart, setIsInCart] = useState(false);
  const [showModalVisible, setShowModalVisible] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [descExpanded, setDescExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  // Refs
  const flatListRef = useRef<FlatList<any>>(null);
  const animOpacity = useRef(new Animated.Value(1)).current;
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const isInteracting = useRef(false);
  const mountedRef = useRef(true);
  const cartCheckingRef = useRef(false);

  // Selectors & Queries
  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );
  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });

  // Memoized values
  const productImages = useMemo(
    () => (productData?.images?.length ? productData.images : []),
    [productData],
  );

  const variants = useMemo(() => productData?.variants || [], [productData]);

  const weightItems = useMemo(
    () =>
      variants.map((v, i) => ({
        label: v.unit || v.weight || `Option ${i + 1}`,
        value: v.id,
        discount: v.percentage,
      })),
    [variants],
  );

  // Helper functions
  const displayPrices = useCallback(
    (priceEUR: any): string => {
      return convertAndFormatPrice(priceEUR, selectedCurrency, rates);
    },
    [selectedCurrency, rates],
  );

  const resolveImageSource = useCallback(
    (img: string) =>
      img.startsWith('http') ? { uri: img } : { uri: `${baseUrl}${img}` },
    [baseUrl],
  );

  // Check if variant is in cart - optimized
  const checkVariantInCart = useCallback(
    (productId: string | number, variantId: string | number) => {
      if (!Array.isArray(cart) || cartCheckingRef.current) return false;

      cartCheckingRef.current = true;
      try {
        return cart.some((item: any) => {
          const cartProductId = item.product_id ?? item.id;
          const cartVariantId = item.variant_id ?? item.variantId ?? null;
          return (
            Number(cartProductId) === Number(productId) &&
            String(cartVariantId) === String(variantId)
          );
        });
      } finally {
        setTimeout(() => {
          cartCheckingRef.current = false;
        }, 100);
      }
    },
    [cart],
  );

  // Process product data efficiently
  const processProductData = useCallback(
    (product: any, resolvedBase: string) => {
      // Process images - only get first 3 initially
      const mainImages = [
        product.front_image,
        product.back_image,
        product.side_image,
      ]
        .filter(Boolean)
        .slice(0, 3)
        .map(img => (img.startsWith('http') ? img : `${resolvedBase}${img}`));

      const allVariants = product.variants || [];
      const firstVariant = allVariants[0] || null;
      const price = firstVariant?.price || product.main_price || '0';
      const actual = firstVariant?.actual_price || price || '0';
      const unit = firstVariant?.unit || '';

      // Lazy load extra images
      const extraImages = product.images
        ? product.images
            .slice(0, 3)
            .map((img: string) =>
              img.startsWith('http') ? img : `${resolvedBase}${img}`,
            )
        : [];

      const allImages = extraImages.length ? extraImages : mainImages;

      return {
        product: {
          ...product,
          images: allImages,
          price,
          unit,
        },
        firstVariant,
        price,
        actual,
        unit,
        allVariants,
        allImages,
      };
    },
    [],
  );

  // Load product data - PARALLEL loading
  const loadProduct = useCallback(
    async (productId: string) => {
      if (!mountedRef.current) return;

      setLoading(true);

      // Check cache first
      const cacheKey = `product_${productId}`;
      const cachedData = productCache.get(cacheKey);

      if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
        // 5 minute cache
        const { data, baseUrl: cachedBase } = cachedData;
        setBaseUrl(cachedBase);

        const processed = processProductData(data, cachedBase);
        setProductData(processed.product);
        setVariantsData(processed);

        // Load related products and reviews in parallel
        Promise.all([
          loadRelatedProducts(data.category_id),
          loadReviews(productId),
        ]).finally(() => {
          if (mountedRef.current) {
            setLoading(false);
          }
        });

        return;
      }

      try {
        const res = await UserService.productDetail(productId);

        if (res?.status === HttpStatusCode.Ok && res.data?.data) {
          const fetchedProducts = Array.isArray(res.data.data)
            ? res.data.data
            : [res.data.data];
          const resolvedBase = res.data.base_url || baseUrl;

          // Cache the data
          productCache.set(cacheKey, {
            data: fetchedProducts[0],
            baseUrl: resolvedBase,
            timestamp: Date.now(),
          });

          setBaseUrl(resolvedBase);
          const product = fetchedProducts[0];

          if (!product) {
            setProductData(null);
            setLoading(false);
            return;
          }

          const processed = processProductData(product, resolvedBase);
          setProductData(processed.product);
          setVariantsData(processed);

          // Load related products and reviews IN PARALLEL
          const promises = [];

          if (product.category_id) {
            promises.push(loadRelatedProducts(product.category_id));
          }

          promises.push(loadReviews(productId));

          await Promise.all(promises);
        }
      } catch (error) {
        console.error('Product fetch error:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to load product',
        });
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [processProductData],
  );

  // Helper to set variant data
  const setVariantsData = useCallback(
    (processed: any) => {
      const { firstVariant, price, actual, unit, allVariants } = processed;

      setDisplayPrice(price);
      setActualPrice(actual);
      setDisplayUnit(unit);
      setSelectedVariant(firstVariant);
      setSelectedIndex(0);

      if (firstVariant && processed.product.id) {
        const inCart = checkVariantInCart(
          processed.product.id,
          firstVariant.id,
        );
        setIsInCart(inCart);
      }
    },
    [checkVariantInCart],
  );

  const loadRelatedProducts = useCallback(
    async (categoryId: string | string[]) => {
      try {
        let categoryIdToUse: string | undefined;

        if (Array.isArray(categoryId)) {
          categoryIdToUse = categoryId[0];
        } else if (typeof categoryId === 'string') {
          try {
            const parsed = JSON.parse(categoryId);
            categoryIdToUse = Array.isArray(parsed) ? parsed[0] : parsed;
          } catch {
            categoryIdToUse = categoryId;
          }
        } else {
          categoryIdToUse = String(categoryId);
        }

        if (!categoryIdToUse) return;

        const res = await UserService.CatbyProduct(categoryIdToUse);
        if (res?.status === HttpStatusCode.Ok && res.data?.data) {
          const fetchedProducts = Array.isArray(res.data.data)
            ? res.data.data
            : [res.data.data];
          const resolvedBase = res.data.base_url || baseUrl;

          // Only process first 5 related products initially
          const initialProducts = fetchedProducts.slice(0, 5).map((p: any) => {
            const mainImages = [p.front_image, p.back_image, p.side_image]
              .filter(Boolean)
              .slice(0, 1)
              .map(img =>
                img.startsWith('http') ? img : `${resolvedBase}${img}`,
              );

            const variant = p.variants?.[0] || null;
            const price = variant?.price || p.main_price || p.price || '0';
            const unit = variant?.unit || p.unit || '';

            return { ...p, images: mainImages, price, unit };
          });

          setRelatedProducts(initialProducts);
        }
      } catch (error) {
        console.error('Related products error:', error);
      }
    },
    [baseUrl],
  );

  const loadReviews = useCallback(async (productId: string) => {
    try {
      const res = await UserService.Reviewlist(productId);
      if (res?.status === HttpStatusCode.Ok && res.data?.data) {
        // Only show first 3 reviews initially
        setReviews(res.data.data.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Reviews fetch error:', error);
    }
  }, []);

  // Carousel autoplay - optimized
  const startAutoplay = useCallback(() => {
    if (
      autoplayRef.current ||
      isInteracting.current ||
      productImages.length <= 1
    )
      return;

    autoplayRef.current = setTimeout(() => {
      const nextIndex = (activeIndex + 1) % productImages.length;

      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);

      // Restart autoplay
      startAutoplay();
    }, 3000);
  }, [activeIndex, productImages.length]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  // Effects with cleanup
  useEffect(() => {
    mountedRef.current = true;

    // Load product immediately
    loadProduct(proDuctID);

    return () => {
      mountedRef.current = false;
      stopAutoplay();
      productCache.clear(); // Consider keeping cache but with limit
    };
  }, [loadProduct, proDuctID, stopAutoplay]);

  useFocusEffect(
    useCallback(() => {
      // Restart autoplay when screen is focused
      if (productImages.length > 1) {
        startAutoplay();
      }

      return () => {
        stopAutoplay();
      };
    }, [productImages.length, startAutoplay, stopAutoplay]),
  );

  useEffect(() => {
    if (variants.length > 0 && productData && !cartCheckingRef.current) {
      const firstVariant = variants[0];
      const inCart = checkVariantInCart(productData.id, firstVariant.id);
      setIsInCart(inCart);
    }
  }, [variants, productData, checkVariantInCart]);

  // Handlers
  const handleVariantSelect = useCallback(
    (index: number, variant: ProductVariant) => {
      setSelectedIndex(index);
      setDisplayPrice(variant.price || productData?.main_price || '0');
      setActualPrice(variant.actual_price || variant.price || '0');
      setDisplayUnit(variant.unit || productData?.unit || '');
      setSelectedVariant(variant);

      if (productData) {
        const inCart = checkVariantInCart(productData.id, variant.id);
        setIsInCart(inCart);
      }
    },
    [productData, checkVariantInCart],
  );

  const handleCartAction = useCallback(async () => {
    if (!productData) return;

    if (isInCart) {
      navigation.navigate('CheckoutScreen');
      return;
    }

    try {
      await addToCart(productData.id, selectedVariant?.id || null);
      setIsInCart(true);
      Toast.show({
        type: 'success',
        text1: 'Added to cart successfully!',
      });
    } catch (error: any) {
      if (error.status === 401) {
        setModalVisible(true);
      } else {
        Toast.show({
          type: 'error',
          text1: error?.message || 'Something went wrong!',
        });
      }
    }
  }, [productData, isInCart, selectedVariant, addToCart, navigation]);

  const checkoutAction = useCallback(async () => {
    if (!productData) return;

    if (isInCart) {
      navigation.navigate('CheckoutScreen');
      return;
    }

    try {
      await addToCart(productData.id, selectedVariant?.id);
      setIsInCart(true);
      Toast.show({
        type: 'success',
        text1: 'Added to cart successfully!',
      });
      navigation.navigate('CheckoutScreen');
    } catch (error: any) {
      if (error.status === 401) {
        setModalVisible(true);
      } else {
        Toast.show({
          type: 'error',
          text1: error?.message || 'Something went wrong!',
        });
      }
    }
  }, [productData, isInCart, selectedVariant, addToCart, navigation]);

  const openZoom = useCallback((index: number) => {
    setZoomIndex(index);
    setZoomVisible(true);
  }, []);

  const closeZoom = useCallback(() => {
    setZoomVisible(false);
  }, []);

  const CartButton = useCallback(() => {
    if (productData?.stock_quantity === 0) {
      return <Text style={styles.outOfStock}>Out of Stock</Text>;
    }

    return (
      <View style={styles.cartButtonContainer}>
        <TouchableOpacity
          style={[styles.cartButton, isInCart && styles.cartButtonActive]}
          onPress={handleCartAction}
        >
          <Text style={styles.cartButtonText}>
            {isInCart ? 'Go to Cart' : 'Add to Bag'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() =>
            isLoggedIn ? checkoutAction() : setModalVisible(true)
          }
        >
          <Text style={styles.checkoutButtonText}>Check-Out</Text>
        </TouchableOpacity>
      </View>
    );
  }, [productData, isInCart, handleCartAction, checkoutAction, isLoggedIn]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.button[100]} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (!productData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header - Optimized with memo */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('../../assets/Png/back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.currencyButton}
          onPress={() => setCurrencyModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.currencyButtonContent}>
            <Text style={styles.currencySymbolSmall}>
              {selectedCurrency === 'USD'
                ? '$'
                : selectedCurrency === 'EUR'
                ? '€'
                : 'Kč'}
            </Text>
            <Text style={styles.currencyCodeText}>{selectedCurrency}</Text>
            <Text style={styles.arrowDown}>▼</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleWishlist(productData.id)}
          activeOpacity={0.7}
          style={styles.wishlistButton}
        >
          {isWishlisted(productData.id) ? (
            <Video
              source={require('../../assets/Png/splash.mp4')}
              style={styles.wishlistVideo}
              muted
              repeat={false}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.wishlistIconContainer}>
              <Image
                source={require('../../assets/Png/heart-1.png')}
                style={styles.wishlistIcon}
                resizeMode="contain"
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      >
        {/* Image Carousel - Optimized with FastImage */}
        <View style={styles.carouselContainer}>
          {productImages.length > 0 ? (
            <>
              <FlatList
                ref={flatListRef}
                data={productImages}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_FULL_WIDTH}
                decelerationRate="fast"
                disableIntervalMomentum
                contentContainerStyle={styles.carouselContent}
                keyExtractor={(_, i) => `image_${i}`}
                getItemLayout={(_, index) => ({
                  length: ITEM_FULL_WIDTH,
                  offset: ITEM_FULL_WIDTH * index,
                  index,
                })}
                initialNumToRender={2}
                maxToRenderPerBatch={3}
                windowSize={3}
                removeClippedSubviews={true}
                onMomentumScrollEnd={e => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / ITEM_FULL_WIDTH,
                  );
                  setActiveIndex(index);
                }}
                onScrollBeginDrag={() => {
                  isInteracting.current = true;
                  stopAutoplay();
                }}
                onScrollEndDrag={() => {
                  isInteracting.current = false;
                  startAutoplay();
                }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openZoom(index)}
                    style={{ width: ITEM_FULL_WIDTH }}
                  >
                    <View style={styles.imageContainer}>
                      <FastImage
                        source={resolveImageSource(item)}
                        style={styles.productImage}
                        resizeMode={FastImage.resizeMode.cover}
                        priority={FastImage.priority.normal}
                        cacheControl={FastImage.cacheControl.immutable}
                      />
                    </View>
                  </TouchableOpacity>
                )}
              />

              {productImages.length > 1 && (
                <View style={styles.dotsContainer}>
                  {productImages.map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        flatListRef.current?.scrollToIndex({
                          index: i,
                          animated: true,
                        });
                        setActiveIndex(i);
                      }}
                    >
                      <View
                        style={[
                          styles.dot,
                          i === activeIndex
                            ? styles.dotActive
                            : styles.dotInactive,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {productData.name || ''}
            </Text>
            <Text style={styles.rating}>
              ★{' '}
              <Text style={styles.ratingCount}>
                ({productData.average_rating || 0})
              </Text>
            </Text>
          </View>

          <Text style={styles.price}>{displayPrices(actualPrice)}</Text>
          {actualPrice !== displayPrice && (
            <Text style={styles.originalPrice}>
              {displayPrices(displayPrice)}
            </Text>
          )}

          {/* Variant Selection - Optimized */}
          {variants.length > 0 && (
            <View style={styles.variantSection}>
              <Text style={styles.variantTitle}>Select an Unit</Text>
              <View style={styles.variantContainer}>
                {variants.map((variant, index) => {
                  const isSelected = selectedIndex === index;
                  const hasDiscount =
                    variant.percentage && variant.percentage > 0;

                  return (
                    <TouchableOpacity
                      key={`variant_${variant.id}`}
                      activeOpacity={0.8}
                      onPress={() => handleVariantSelect(index, variant)}
                      style={[
                        styles.variantButton,
                        isSelected && styles.variantButtonSelected,
                      ]}
                    >
                      {hasDiscount && (
                        <LinearGradient
                          colors={[Colors.button[100], '#ffffff']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.discountBadge}
                        >
                          <Text style={styles.discountText}>
                            {variant.percentage}% OFF
                          </Text>
                        </LinearGradient>
                      )}
                      <Text
                        style={[
                          styles.variantText,
                          isSelected && styles.variantTextSelected,
                        ]}
                      >
                        {variant.unit || variant.weight || variant.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Cart Buttons */}
          <CartButton />

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Product Description</Text>
            <Text
              style={styles.description}
              numberOfLines={descExpanded ? undefined : 3}
            >
              {productData.description || ''}
            </Text>
            {productData.description?.length > 150 && (
              <TouchableOpacity
                onPress={() => setDescExpanded(prev => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.readMoreText}>
                  {descExpanded ? 'Read less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recommended Products - Lazy loaded */}
          {relatedProducts.length > 0 && (
            <View style={styles.recommendedSection}>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
              <FlatList
                data={relatedProducts}
                keyExtractor={item => `recommended_${item.id}`}
                renderItem={({ item }) => (
                  <RecommendedProductCard
                    item={item}
                    navigation={navigation}
                    loadProduct={loadProduct}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendedList}
                initialNumToRender={3}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
              />
            </View>
          )}

          {/* Reviews Section - Optimized */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            <View style={styles.reviewsContent}>
              <View style={styles.reviewsLeft}>
                <Text style={styles.reviewsScore}>
                  {productData.average_rating?.toFixed(1) || '0.0'}
                </Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const rating = productData.average_rating || 0;
                    const isFull = rating >= star;
                    const isHalf = rating >= star - 0.5 && rating < star;
                    return (
                      <View key={star} style={styles.starContainer}>
                        <Text style={styles.starOutline}>★</Text>
                        <View
                          style={[
                            styles.starFill,
                            { width: isFull ? '100%' : isHalf ? '50%' : '0%' },
                          ]}
                        >
                          <Text style={styles.starFilled}>★</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.reviewsCount}>
                  {reviews.length} Reviews
                </Text>
              </View>

              <View style={styles.reviewsRight}>
                {[5, 4, 3, 2, 1].map(star => (
                  <View key={star} style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>{star}</Text>
                    <View style={styles.ratingBarBg}>
                      <View
                        style={[
                          styles.ratingBarFill,
                          { width: '40%' }, // Simplified for performance
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.showReviewsButton}
              onPress={() => {
                reviews.length === 0
                  ? Toast.show({ type: 'info', text1: 'No Review Found' })
                  : setShowModalVisible(true);
              }}
            >
              <Text style={styles.showReviewsButtonText}>Show Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <ImageView
        images={productImages.map(resolveImageSource)}
        imageIndex={zoomIndex}
        visible={zoomVisible}
        onRequestClose={closeZoom}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />

      <LoginModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGoogleLogin={() =>
          Toast.show({ type: 'info', text1: 'Google Login' })
        }
        onFacebookLogin={() =>
          Toast.show({ type: 'info', text1: 'Facebook Login' })
        }
        phoneNumber="email or phone number"
      />

      <CurrencySelectorModal
        visible={currencyModalVisible}
        onClose={() => setCurrencyModalVisible(false)}
      />

      {/* Reviews Modal */}
      <Modal
        visible={showModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reviews</Text>
              <TouchableOpacity
                onPress={() => setShowModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  source={require('../../assets/Png/close.png')}
                  style={styles.closeIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={reviews}
              keyExtractor={item => `review_${item.id}`}
              renderItem={({ item }) => (
                <View style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {item.customer?.name || 'Anonymous'}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {formatDate(item.updated_at)}
                    </Text>
                  </View>
                  <Text style={styles.reviewStars}>
                    {'★'.repeat(item.rating)}
                  </Text>
                  <Text style={styles.reviewText}>{item.review}</Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.reviewsList}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProductDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: Colors.button[100],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  currencyButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currencyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbolSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.button[100],
    marginRight: 4,
  },
  currencyCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 4,
  },
  arrowDown: {
    fontSize: 10,
    color: '#666',
  },
  wishlistButton: {
    padding: 8,
  },
  wishlistVideo: {
    width: 25,
    height: 25,
    borderRadius: 15,
  },
  wishlistIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.button[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistIcon: {
    width: 15,
    height: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  carouselContainer: {
    height: HERO_HEIGHT,
    marginTop: 10,
    position: 'relative',
  },
  carouselContent: {
    paddingHorizontal: SIDE_SPACING,
  },
  imageContainer: {
    width: BANNER_WIDTH,
    height: HERO_HEIGHT,
    marginRight: ITEM_SPACING,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f4f4f4',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#000',
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  noImageContainer: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    marginHorizontal: 12,
  },
  noImageText: {
    color: '#999',
    fontSize: 14,
  },
  productInfo: {
    paddingHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  rating: {
    color: '#F0C419',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingCount: {
    color: '#000',
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    color: '#000',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#999',
    marginTop: 2,
  },
  variantSection: {
    marginTop: hp(2),
  },
  variantTitle: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: hp(1),
  },
  variantContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantButton: {
    borderWidth: 1,
    borderColor: Colors.text[400],
    borderRadius: 8,
    height: 40,
    width: wp(25),
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantButtonSelected: {
    borderColor: '#000',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 2,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '500',
    paddingLeft: 8,
  },
  variantText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  variantTextSelected: {
    color: '#000',
  },
  cartButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(3),
    width: '100%',
  },
  cartButton: {
    backgroundColor: Colors.button[100],
    borderRadius: 20,
    height: 45,
    justifyContent: 'center',
    width: wp(40),
    alignItems: 'center',
  },
  cartButtonActive: {
    backgroundColor: Colors.button[100],
  },
  cartButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  checkoutButton: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 20,
    height: 45,
    justifyContent: 'center',
    width: wp(40),
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  outOfStock: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: 'red',
    textAlign: 'center',
  },
  descriptionSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    lineHeight: 20,
    color: '#333',
    fontSize: 12,
  },
  readMoreText: {
    marginTop: 8,
    color: Colors.button[100],
    fontWeight: '700',
    fontSize: 12,
  },
  recommendedSection: {
    marginTop: 20,
  },
  recommendedList: {
    paddingVertical: 10,
  },
  reviewsSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  reviewsContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewsLeft: {
    width: 100,
    alignItems: 'center',
  },
  reviewsScore: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
  },
  starsContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  starContainer: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  starOutline: {
    color: '#ccc',
    fontSize: 18,
    position: 'absolute',
  },
  starFill: {
    overflow: 'hidden',
    position: 'absolute',
  },
  starFilled: {
    color: '#F0C419',
    fontSize: 18,
  },
  reviewsCount: {
    color: '#666',
    marginTop: 8,
    fontSize: 12,
  },
  reviewsRight: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingLabel: {
    width: 18,
    fontSize: 12,
  },
  ratingBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 6,
    marginLeft: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: 8,
    backgroundColor: '#F0C419',
    borderRadius: 6,
  },
  showReviewsButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  showReviewsButtonText: {
    fontWeight: '500',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeIcon: {
    width: 24,
    height: 24,
  },
  reviewsList: {
    paddingBottom: 20,
  },
  reviewItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontWeight: '700',
    fontSize: 12,
  },
  reviewDate: {
    fontWeight: '400',
    fontSize: 10,
    color: '#666',
  },
  reviewStars: {
    color: '#F0C419',
    fontSize: 12,
    marginVertical: 4,
  },
  reviewText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
