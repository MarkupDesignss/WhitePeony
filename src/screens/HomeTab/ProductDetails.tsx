import React, { useState, useRef, useEffect, useContext } from 'react';
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
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
  StatusBar
} from 'react-native';
// gesture handling for custom zoom removed in favor of `react-native-image-viewing`
import { Colors } from '../../constant';
import ImageView from 'react-native-image-viewing';
import { useNavigation } from '@react-navigation/native';
import { UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import Toast from 'react-native-toast-message';
import { formatDate } from '../../helpers/helpers';
import { WishlistContext } from '../../context';
import { useCart } from '../../context/CartContext';
import RecommendedProductCard from './RecommendedProductCard';
import { heightPercentageToDP, widthPercentageToDP } from '../../constant/dimentions';
import LinearGradient from 'react-native-linear-gradient';
import Video from 'react-native-video';
import LoginModal from '../../components/LoginModal';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = 300;

type ProductDetailsProps = {
  route: { params: { productId: string } };
};


const ProductDetails = ({ route }: ProductDetailsProps) => {
  const { addToCart, cart, isLoggedIn } = useCart(); // ✅ hook at top
  const { productId: proDuctID } = route.params;
  const navigation = useNavigation<any>();
  const { showLoader, hideLoader } = CommonLoader();
  const { toggleWishlist, isWishlisted } = useContext(WishlistContext);
  const [productData, setProductData] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [baseUrl, setBaseUrl] = useState<string>(
    'https://www.markupdesigns.net/whitepeony/storage/',
  );
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [displayPrice, setDisplayPrice] = useState<any>('0');
  const [displayUnit, setDisplayUnit] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isInCart, setIsInCart] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);


  useEffect(() => {
    try {
      if (!productData) return;
      const variantId = selectedVariant?.id ?? null;
      const present = Array.isArray(cart)
        ? cart.some((c: any) => {
          const cartProductId = c.product_id ?? c.id;
          const cartVariantId = c.variant_id ?? null;
          return (
            Number(cartProductId) === Number(productData.id) &&
            String(cartVariantId) === String(variantId)
          );
        })
        : false;
      // also respect locally set productData.is_cart to prevent flicker
      setIsInCart(Boolean(present || productData?.is_cart));
    } catch (e) {
      console.log('isInCart sync error', e);
    }
  }, [cart, selectedVariant, productData?.id]);




  // Load a product by id and set up state (images, variants, related products, reviews)
  const loadProduct = async (productId: any) => {
    showLoader();
    try {
      const res = await UserService.productDetail(productId);
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        hideLoader();
        const fetchedProducts = res.data?.data || [];
        const resolvedBase = res.data?.base_url || baseUrl;
        setBaseUrl(resolvedBase);

        const first = Array.isArray(fetchedProducts) ? fetchedProducts[0] : fetchedProducts;

        if (first) {
          const images = [first.front_image, first.back_image, first.side_image]
            .filter(Boolean)
            .map((img: string) => (img.startsWith('http') ? img : `${resolvedBase}${img}`));

          const extraImgs = (first.images || []).map((img: string) =>
            img.startsWith('http') ? img : `${resolvedBase}${img}`,
          );
          const allImages = extraImgs.length ? extraImgs : images;

          const allVariants = first.variants || [];
          setVariants(allVariants);

          const variantItems = allVariants.map((v: any, index: number) => ({
            label: `${v.weight || v.unit || v.name} - ₹${v.price}`,
            value: v.id,
            discount: v.percentage
          }));
          setWeightItems(allVariants);
          console.log('varients', allVariants)

          const variant0 = allVariants.length ? allVariants[0] : null;
          const price = variant0?.price || first.main_price || '0';
          const unit = variant0?.unit || '';
          const normalized = { ...first, images: allImages, price, unit };

          setProductData(normalized);
          setDisplayPrice(price);
          setDisplayUnit(unit);

          // fetch related products using first category if available
          try {
            const firstCategory = Array.isArray(normalized.category_id)
              ? normalized.category_id[0]
              : normalized.category_id;
            if (firstCategory) await CategorieProduct(firstCategory);
          } catch (e) {
            hideLoader();
          }
          try {
            const variantId = variant0?.id ?? null;
            const present = Array.isArray(cart)
              ? cart.some((c: any) => (
                (c.id ?? c.product_id) === normalized.id &&
                ((c.variant_id ?? c.variantId ?? null) === (variantId || null))
              ))
              : false;
            setIsInCart(Boolean(present || normalized?.is_cart));
          } catch {
            hideLoader();
          }

          if (variant0) {
            setSelectedVariant(variant0);
            setWeightValue(variant0.id);
          }

          // fetch reviews for this product
          ShowReview(productId);
        } else {
          setProductData(null);
        }
      }
    } catch (err) {
      console.log('Product fetch error:', err);
    }
  };

  const CategorieProduct = async (categoryIdParam?: any) => {
    // Accept either an array or a single id (string/number)
    try {
      const categoryIdRaw = categoryIdParam || productData?.category_id;
      let categoryId: any = null;
      if (Array.isArray(categoryIdRaw)) categoryId = categoryIdRaw[0];
      else if (typeof categoryIdRaw === 'string') {
        try {
          const parsed = JSON.parse(categoryIdRaw);
          categoryId = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          categoryId = categoryIdRaw;
        }
      } else categoryId = categoryIdRaw;
      if (!categoryId) {
        setRelatedProducts([]);
        return;
      }
      const res = await UserService.CatbyProduct(categoryId);
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.data || [];
        console.log('Related products fetched for category:', categoryId);
        const resolvedBase = res.data?.base_url || baseUrl;
        setBaseUrl(resolvedBase);

        const mapped = (Array.isArray(fetchedProducts) ? fetchedProducts : [fetchedProducts]).map((p: any) => {
          const images = [p.front_image, p.back_image, p.side_image]
            .filter(Boolean)
            .map((img: string) => (img.startsWith('http') ? img : `${resolvedBase}${img}`));
          const extraImgs = (p.images || []).map((img: string) => (img.startsWith('http') ? img : `${resolvedBase}${img}`));
          const allImages = extraImgs.length ? extraImgs : images;
          const variant = p.variants && p.variants.length ? p.variants[0] : null;
          const price = variant?.price || p.main_price || p.price || '0';
          const unit = variant?.unit || p.unit || '';
          return { ...p, images: allImages, price, unit };
        });
        setRelatedProducts(mapped);
      } else {
        setRelatedProducts([]);
      }
    } catch (err) {
      console.log('CategorieProduct error:', err);
      setRelatedProducts([]);
    }
  };

  const ShowReview = async (productIdParam?: any) => {
    try {
      const idToUse = productIdParam || proDuctID;
      const res = await UserService.Reviewlist(idToUse);

      if (res?.status === HttpStatusCode.Ok && res?.data) {
        const { data } = res.data;
        setReviews(data || []);
        // console.log("review data", res?.data?.data[0]?.customer)
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Something went wrong!',
        });
      }
    } catch (e) {
      hideLoader();
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      } else {
        // Toast.show({
        //   type: 'error',
        //   text1: error || 'Something went wrong!',
        // });
      }
    }
  };

  useEffect(() => {
    loadProduct(proDuctID);
  }, []);

  const productImages: any[] =
    productData?.images && productData.images.length ? productData.images : [];

  // helper to convert string URLs into image sources
  const resolveImageSource = (img: any) =>
    typeof img === 'string' ? { uri: img } : img;


  // Reviews modal state
  const [showModalVisible, setShowModalVisible] = useState(false);
  const [reviews, setReviews] = useState<Array<any>>([]);
  // description expand/collapse
  const [descExpanded, setDescExpanded] = useState<boolean>(false);
  // weight dropdown state
  const [weightValue, setWeightValue] = useState('0');
  const [modalVisible, setModalVisible] = useState(false);

  const [weightItems, setWeightItems] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  // when productData changes, populate weightItems from variants
  useEffect(() => {
    if (productData && Array.isArray(productData.variants)) {
      const items = productData.variants.map((v: any, i: number) => ({
        label: v.unit || v.weight || `Option ${i + 1}`,
        price: v.price,
        unit: v.unit,
        value: v.id,
        discount: v.percentage
      }));
      setWeightItems(items);
      setVariants(productData.variants);
      if (items.length) {
        setWeightValue('0');
        setDisplayPrice(items[0].price ?? productData.price ?? '0');
        setDisplayUnit(items[0].unit ?? productData.unit ?? '');
      }
    }
  }, [productData]);
  // carousel state
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList<any> | null>(null);
  const animOpacity = useRef(new Animated.Value(1)).current;
  const autoplayRef = useRef<number | null>(null);

  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isInteracting]);

  // reset active index when product images change
  useEffect(() => {
    setActiveIndex(0);
    stopAutoplay();
    startAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productImages.length]);

  const startAutoplay = () => {
    if (autoplayRef.current != null) return;
    if (isInteracting) return;
    // do not start autoplay if there's 0 or 1 image
    if (!productImages || productImages.length <= 1) return;
    autoplayRef.current = setInterval(() => {
      const next = (activeIndex + 1) % productImages.length;
      animateToIndex(next);
    }, 3000) as unknown as number;
  };

  const stopAutoplay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current as any);
      autoplayRef.current = null;
    }
  };

  const animateToIndex = (nextIndex: number) => {
    // fade out
    Animated.timing(animOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: false });
      setActiveIndex(nextIndex);
      // fade in
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  // zoom modal state
  const [zoomVisible, setZoomVisible] = useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const openZoom = (index: number) => {
    setZoomIndex(index);
    setZoomScale(1);
    setZoomVisible(true);
  };

  const closeZoom = () => {
    setZoomVisible(false);
    setZoomScale(1);
  };

  // Unified cart action handler for main product
  const handleCartAction = async () => {
    if (!productData) return;

    if (isInCart) {
      navigation.navigate('CheckoutScreen');
      return;
    }

    try {
      await addToCart(productData.id, selectedVariant?.id);
      // mark in-cart immediately without waiting for API flag
      setProductData((prev: any) => (prev ? { ...prev, is_cart: true } : prev));
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Added to cart successfully!'
      });
    } catch (e) {
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      } else {
        Toast.show({
          type: 'error',
          text1: error || 'Something went wrong!',
        });
      }
    }
  };

  const checkoutAction = async () => {
    if (!productData) return;

    if (isInCart) {
      navigation.navigate('CheckoutScreen');
      return;
    }

    try {
      await addToCart(productData.id, selectedVariant?.id);
      // mark in-cart immediately without waiting for API flag
      setProductData((prev: any) => (prev ? { ...prev, is_cart: true } : prev));
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Added to cart successfully!'
      });
      navigation.navigate('CheckoutScreen');

    } catch (e) {
      const error = e as any;
      if (error.status === 401) {
        console.log('Unauthorized access - perhaps token expired');
      } else {
        Toast.show({
          type: 'error',
          text1: error || 'Something went wrong!',
        });
      }
    }
  };



  // Replace existing cart button with new component
  const CartButton = () => {
    if (productData?.stock_quantity === 0) {
      return <Text style={styles.outOfStock}>Out of Stock</Text>;
    }

    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: heightPercentageToDP(3), width: '100%' }}>

        <TouchableOpacity
          style={[
            styles.cartButton,
            isInCart && styles.cartButtonActive,
          ]}
          onPress={handleCartAction}
        >
          <Text style={styles.cartButtonText}>
            {isInCart ? 'Go to Cart' : 'Add to Bag'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (isLoggedIn) {
              checkoutAction();
            } else {
              setModalVisible(true);
            }
          }}
        >
          <View style={{ borderWidth: 1, borderColor: '#999', borderRadius: 20, height: 45, justifyContent: 'center', width: widthPercentageToDP(40) }}>
            <Text style={{ fontSize: 12, fontWeight: '700', alignSelf: 'center' }}>Check-Out</Text>
          </View>
        </TouchableOpacity>


      </View >


    );
  };

  // Example review data (from backend)
  const reviewStats = {
    average_rating: productData?.average_rating || 0,
    total_reviews: productData?.reviews?.length || 0,
    breakdown: {
      5: 2,
      4: 1,
      3: 0,
      2: 0,
      1: 0,
    },
  };

  const total = Object.values(reviewStats.breakdown).reduce((a, b) => a + b, 0);
  const average = reviewStats.average_rating || 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../assets/Png/back.png')}
            style={{ width: 20, height: 20 }}
          />
        </TouchableOpacity>

        <View style={styles.headerRightVideo}>
          <TouchableOpacity
            onPress={() => toggleWishlist(productData?.id)}
            activeOpacity={0.7}
            style={{ position: 'absolute', top: 10, right: 10 }}
          >
            {isWishlisted(productData?.id) ? (
              <Video
                source={require('../../assets/Png/splash.mp4')}
                style={{  width: 25, height: 25, borderRadius: 15, justifyContent: 'center', alignItems: 'center', }}
                muted={true}
                repeat={true}
                resizeMode="cover"
                onError={(e) => console.log('Video error', e)}
              />
            ) : (
              // Use the outline heart image for non-wishlisted state so touch events are not intercepted
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.button[100], justifyContent: 'center', alignItems: 'center', }}>
                <Image
                  source={require('../../assets/Png/heart-1.png')}
                  style={{ position: 'absolute', width: 15, height: 15, alignSelf: 'center' }}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {/* Image carousel with dots. Tap an image to open zoom modal */}
        <View>
          <FlatList
            ref={r => {
              flatListRef.current = r;
            }}
            data={productImages}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveIndex(idx);
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openZoom(index)}
                style={{ width }}
                onPressIn={() => {
                  setIsInteracting(true);
                  stopAutoplay();
                }}
                onPressOut={() => {
                  setIsInteracting(false);
                  stopAutoplay();
                  startAutoplay();
                }}
              >

                {/* Animated fade for image change */}
                <Animated.View style={{ opacity: animOpacity }}>
                  <Image
                    source={resolveImageSource(item)}
                    style={styles.heroImage}
                    resizeMode='contain'
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
          />
          {productImages && productImages.length ? (
            <View style={styles.dotsRow}>
              {productImages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeIndex ? styles.dotActive : undefined,
                  ]}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                width,
                height: HERO_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f6f6f6',
              }}
            >
              <Text style={{ color: '#999' }}>No images available</Text>
            </View>
          )}
        </View>

        {/* Zoom viewer using react-native-image-viewing */}
        <ImageView
          images={productImages.map((img: any) => (typeof img === 'string' ? { uri: img } : img))}
          imageIndex={zoomIndex}
          visible={zoomVisible}
          onRequestClose={closeZoom}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />

        <LoginModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onGoogleLogin={() => Alert.alert("Google Login")}
          onFacebookLogin={() => Alert.alert("Facebook Login")}
          phoneNumber="email or phone number"
        />



        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <Text style={styles.title}>
            {productData?.name !== null ? productData?.name : ''}
          </Text>
          <Text style={{ color: '#F0C419', fontSize: 14, fontWeight: '700' }}>
            ★ <Text style={{ color: '#000', fontWeight: '500' }}>({productData?.average_rating})</Text>
          </Text>
        </View>

        <Text style={styles.price}>{Math.round(displayPrice)}€ </Text>

        <View style={{ marginTop: heightPercentageToDP(2) }}>
          <Text style={{ fontWeight: '600', fontSize: 12 }}>
            Select an Unit
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: heightPercentageToDP(1),
            }}
          >
            {weightItems.map((item, index) => {
              const isSelected = selectedIndex === index;

              return (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.8}
                  onPress={() => {
                    const v = variants[index];
                    if (v) {
                      setSelectedIndex(index);
                      setDisplayPrice(v.price ?? productData.price ?? displayPrice);
                      setDisplayUnit(v.unit ?? productData.unit ?? displayUnit);
                      setSelectedVariant(v);
                    }
                  }}
                  style={{
                    borderColor: isSelected ? '#000' : Colors.text[400],
                    borderWidth: 1,
                    borderRadius: 8,
                    height: item.discount != 0 || null ? 50: 40,
                    width: widthPercentageToDP(25),
                    marginBottom: heightPercentageToDP(1),
                    backgroundColor: '#FFF',
                  }}
                >
                  {/* percentage badge */}
                  {item.discount != 0 || null ?
                    <LinearGradient
                      colors={[Colors.button[100], '#ffffff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderTopLeftRadius: 6,
                        borderTopRightRadius: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '500',
                          paddingLeft: 8,
                        }}
                      >
                        {item.discount}% OFF
                      </Text>
                    </LinearGradient> : null
                  }

                  {/* Unit */}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      alignSelf: 'center',
                      marginTop: item.discount != 0 || null ? 6 : 10,
                      color: isSelected ? '#000' : '#333',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <CartButton />

        <Text style={{ marginTop: 20, fontWeight: '700', }}>
          Product Description
        </Text>
        <Text
          style={{ marginTop: 8, lineHeight: 20, color: '#333' }}
          numberOfLines={descExpanded ? undefined : 3}
        >
          {productData?.description ?? ''}
        </Text>
        {descExpanded ? <TouchableOpacity
          onPress={() => setDescExpanded(prev => !prev)}
          activeOpacity={0.7}
        >
          <Text style={{ marginTop: 8, color: Colors.button[100], fontWeight: '700' }}>
            {descExpanded ? 'Read less' : 'Read more'}
          </Text>
        </TouchableOpacity> : null}

        {/* recommended row placeholder */}
        <Text style={{ marginTop: 20, fontWeight: '700', bottom: 10 }}>
          Recommended For You
        </Text>


        <FlatList
          data={relatedProducts}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <RecommendedProductCard
              item={item}
              navigation={navigation}
              loadProduct={loadProduct}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />

        {/* Customer Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsTitle}>Customer Reviews</Text>

          <View style={styles.reviewsRow}>
            {/* LEFT SIDE: Average Score + Stars */}
            <View style={styles.reviewsLeft}>
              <Text style={styles.reviewsScore}>{average.toFixed(1)}</Text>

              {/* Stars display (with half-star overlay trick) */}
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {[1, 2, 3, 4, 5].map(r => {
                  const isFull = average >= r;
                  const isHalf = average >= r - 0.5 && average < r;
                  return (
                    <View key={r} style={{ width: 18, height: 18, position: 'relative' }}>
                      <Text style={{ color: '#ccc', fontSize: 18, position: 'absolute' }}>★</Text>
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
              <Text style={styles.reviewsCount}>{total} Reviews</Text>
            </View>

            {/* RIGHT SIDE: Rating Breakdown Bars */}
            <View style={styles.reviewsRight}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviewStats.breakdown[star] || 0;
                const percent = total ? count / total : 0;

                return (
                  <View key={star} style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>{star}</Text>
                    <View style={styles.ratingBarBg}>
                      <View
                        style={[
                          styles.ratingBarFill,
                          { width: `${percent * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.reviewsButtons}>
            <TouchableOpacity
              style={styles.showBtn}
              onPress={() => { reviews.length == 0 ? Toast.show({ type: 'info', text1: 'No Review Found' }) : setShowModalVisible(true) }}
            >
              <Text style={styles.showBtnText}>Show Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Show Reviews Modal */}
        <Modal visible={showModalVisible} transparent animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <View
              style={{
                backgroundColor: '#fff',
                padding: 16,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                maxHeight: '70%',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Reviews</Text>
              <ScrollView style={{ marginTop: 12 }}>
                {reviews.map(r => (
                  <View
                    key={r.id}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", flex: 1, }}>
                      <Text style={{ fontWeight: '700' }}>
                        {r.customer?.name}{' '}
                      </Text>
                      <Text style={{ fontWeight: '400', }}>{formatDate(r.updated_at)}</Text>

                    </View>
                    <Text style={{ color: '#F0C419' }}>
                      {'★'.repeat(r.rating)}
                    </Text>
                    <Text style={{ marginTop: 4 }}>{r.review}</Text>
                  </View>
                ))}
              </ScrollView>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  marginTop: 12,
                }}
              >
                <TouchableOpacity onPress={() => setShowModalVisible(false)}>
                  <Text style={{ color: '#007AFF' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default ProductDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  hero: {
    width: width,
    height: HERO_HEIGHT,
    justifyContent: 'flex-start',
    marginTop: '5%',
  },
  heroImage: {
    width: width,
    height: HERO_HEIGHT,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: StatusBar.currentHeight,
    paddingHorizontal: 12,
  },
  sideVideoWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sideVideo: { width: '100%', height: '100%' },
  sideVideoInner: { width: '100%', height: '100%', },
  playOverlay: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {

    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  backText: { fontSize: 18 },
  headerRightVideo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  actionsRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },

  card: {
    paddingHorizontal: 8,
  },
  CateView: {
    width: 'auto',
    height: 32,
    backgroundColor: Colors.button[100],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    paddingHorizontal: 10,
    margin: 5,
  },
  cardImage: { width: 177, height: 245, borderRadius: 9 },
  cardBody: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '600' },
  cardPrice: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  addBtn: {
    marginTop: 10,
    backgroundColor: Colors.button[100],
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: Colors.button[100],
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.button[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  qtyCount: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
    color: '#000',
  },
  outOfStock: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: 'red',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  filterBtn: {
    marginRight: 8,
    padding: 8,
    backgroundColor: Colors.button[100],
    borderRadius: 20,
    width: '45%',
    alignItems: 'center',
  },
  filterText: { color: Colors.text[300] },
  sortBtn: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  sortText: { color: Colors.text[300] },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  dropdownWrapper: { width: 140 },
  reviewsSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  reviewsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  reviewsRow: { flexDirection: 'row' },
  reviewsLeft: { width: 100, alignItems: 'center' },
  reviewsScore: { fontSize: 32, fontWeight: '800' },
  star: { color: '#F0C419', marginRight: 4 },
  reviewsCount: { color: '#666', marginTop: 8 },
  reviewsRight: { flex: 1, paddingLeft: 12, justifyContent: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ratingLabel: { width: 18 },
  ratingBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 6,
    marginLeft: 8,
  },
  ratingBarFill: { height: 8, backgroundColor: '#F0C419', borderRadius: 6 },
  reviewsButtons: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  writeBtn: {
    backgroundColor: Colors.button[100],
    padding: 12,
    borderRadius: 20,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  writeBtnText: { fontWeight: '700' },
  showBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  showBtnText: {},
  dotsRow: {
    position: 'absolute',
    bottom: 12,
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: '#fff' },

  cartButton: {
    backgroundColor: Colors.button[100],
    borderRadius: 20, height: 45, justifyContent: 'center', width: widthPercentageToDP(40)

  },
  cartButtonActive: {
    backgroundColor: Colors.button[100],
  },
  cartButtonDisabled: {
    opacity: 0.7,
  },
  cartButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    alignSelf: 'center'
  },
  cartPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '70%',
    alignItems: 'center',
  },
});
