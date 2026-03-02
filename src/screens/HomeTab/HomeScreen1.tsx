import {
  View,
  Text,
  StatusBar,
  Image,
  FlatList,
  Dimensions,
  StyleSheet,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  ImageBackground,
  Alert,
  RefreshControl,
} from 'react-native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../../constant/dimentions';
import { Colors, Fonts } from '../../constant';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { formatDate } from '../../helpers/helpers';
import { WishlistContext } from '../../context';
import Toast from 'react-native-toast-message';

import { UserData, UserDataContext } from '../../context/userDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginModal from '../../components/LoginModal';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import TransletText from '../../components/TransletText';

import {
  convertAndFormatPrice,
  getPriceDisplay,
} from '../../utils/currencyUtils';
// import {
//   convertAndFormatPrice,
//   getPriceDisplay,
//   SupportedCurrency
// } from '../../utils/currencyUtils';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const SMALL_CARD_WIDTH = Math.round(width * 0.3);
const WISHLIST_CARD_WIDTH = Math.round(width * 0.35);

const GAP = 12;
const SMALL_HEIGHT = 120;
const BIG_HEIGHT = SMALL_HEIGHT * 2 + GAP;

const HomeScreen1 = ({ navigation }: any) => {
  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );
  // Fetch rates with caching
  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });

  // Quick price display helper
  const displayPrice = (priceEUR: any): string => {
    return convertAndFormatPrice(priceEUR, selectedCurrency, rates);
  };

  const { setUserData, isLoggedIn, userType } =
    useContext<UserData>(UserDataContext);

  const {
    wishlistItems, // Array of wishlist items
    wishlistIds, // Array of wishlist IDs
    isWishlisted, // Function to check if item is wishlisted
    addToWishlist, // Function to add to wishlist
    removeFromWishlist, // Function to remove from wishlist
    toggleWishlist, // Function to toggle wishlist status
    fetchWishlist, // Function to refresh wishlist
    isLoading, // Loading state
  } = useContext(WishlistContext);
  const [category, setApiCateProducts] = useState([]);
  const [categoryProduct, setcategoryProduct] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    1,
  );
  const [FeaturesProduct, setFeaturesProduct] = useState([]);
  const [salesProduct, setsalesProduct] = useState([]);
  const [apiRecommend, setApiRecommend] = useState<any[]>();

  const [orderitem, setorderitem] = useState<any[]>();
  const [lowestitem, setlowestitem] = useState<any[]>();
  const [Promotional, setPromotional] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { showLoader, hideLoader } = CommonLoader();
  const topPadding =
    Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  const [activeRec, setActiveRec] = useState(0);
  const recRef = useRef<FlatList<any>>(null);

  const onRecommendedScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (WISHLIST_CARD_WIDTH + 12));
    setActiveRec(index);
  };

  // Helper function to get current product type
  const getCurrentProductType = () => {
    // If userType is null or undefined, return null to show ALL products
    if (userType === null || userType === undefined) {
      return null;
    }
    return userType; // 'b2c' or 'b2b'
  };

  // Helper function to filter products by type
  const filterProductsByType = (products: any[]) => {
    if (!Array.isArray(products)) return [];

    const currentType = getCurrentProductType();

    // If currentType is null, return ALL products (no filtering)
    if (currentType === null) {
      return products;
    }

    return products.filter(item => {
      // Check if item has product_type property
      if (!item?.product_type) {
        // If product_type doesn't exist, check if it's a nested object
        if (item?.product?.product_type) {
          return item.product.product_type === currentType;
        }
        return false;
      }
      return item.product_type === currentType;
    });
  };

  // Helper function to get featured products based on user type
  const getFeaturedProducts = (data: any) => {
    const currentType = getCurrentProductType();

    // If userType is null, combine both b2c and b2b featured products
    if (currentType === null) {
      const b2cFeatured = data?.b2c || [];
      const b2bFeatured = data?.b2b || [];
      return [...b2cFeatured, ...b2bFeatured];
    }

    return data?.[currentType] || [];
  };

  // Helper function to get sales products based on user type
  const getSalesProducts = (data: any) => {
    const currentType = getCurrentProductType();

    // If userType is null, combine both b2c and b2b sales products
    if (currentType === null) {
      const b2cSales = data?.b2c || [];
      const b2bSales = data?.b2b || [];
      return [...b2cSales, ...b2bSales];
    }

    return data?.[currentType] || [];
  };

  // Small Card Component
  const ProductSmallCard = ({
    product,
    onPress,
  }: {
    product: any;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: '#F8F6F0',
        borderRadius: 16,
        padding: 10,
        justifyContent: 'space-between',
        minHeight: 100,
      }}
    >
      {/* Product Name */}
      <TransletText
        text={product?.name || 'Product'}
        style={{
          fontSize: 11,
          fontWeight: '400',
          color: '#1A1A1A',
          marginBottom: 4,
          lineHeight: 14,
        }}
        numberOfLines={2}
      />

      {/* Price */}
      {product?.variants?.[0]?.price && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {product?.variants?.[0]?.actual_price && (
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: '#1A1A1A',
              }}
            >
              {displayPrice(product.variants[0].actual_price)}
            </Text>
          )}
          <Text
            style={{
              fontSize: 9,
              color: '#999999',
              textDecorationLine: product?.variants?.[0]?.actual_price
                ? 'line-through'
                : 'none',
            }}
          >
            {displayPrice(product.variants[0].price)}
          </Text>
        </View>
      )}

      {/* Image */}
      {product?.front_image && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 50,
            height: 50,
          }}
        >
          <Image
            source={{ uri: Image_url + product.front_image }}
            style={{
              width: '100%',
              height: '100%',
              resizeMode: 'contain',
            }}
          />
        </View>
      )}
    </TouchableOpacity>
  );

  // Helper function to get promotional banners based on user type
  // Helper function to get promotional banners based on user type
  // Helper function to get promotional banners based on user type
  const getPromotionalBanners = (data: any) => {
    const currentType = getCurrentProductType();

    console.log('Current user type for banners:', currentType);
    console.log('Raw banner data:', data);
    console.log('isLoggedIn:', isLoggedIn); // Add this to see login state

    // If user is NOT logged in, show only b2c banners
    if (!isLoggedIn) {
      console.log('User not logged in, showing only b2c banners');
      const b2cBanners = data?.b2c || [];
      console.log('B2C banners count:', b2cBanners.length);

      // Remove duplicates and return b2c banners only
      return removeDuplicateBanners(b2cBanners);
    }

    // If userType is null or undefined (logged in but no specific type),
    // combine both b2c and b2b banners
    if (currentType === null || currentType === undefined) {
      console.log('User logged in but no specific type, combining all banners');
      const b2cBanners = data?.b2c || [];
      const b2bBanners = data?.b2b || [];

      console.log(
        'Combining banners - b2c:',
        b2cBanners.length,
        'b2b:',
        b2bBanners.length,
      );

      // Combine all banners
      const allBanners = [...b2cBanners, ...b2bBanners];

      // Remove duplicates using multiple criteria
      const uniqueBanners = removeDuplicateBanners(allBanners);

      console.log('Unique banners after deduplication:', uniqueBanners.length);
      return uniqueBanners;
    }

    // For specific user types (b2c or b2b), just return their banners
    const typeBanners = data?.[currentType] || [];
    console.log(`${currentType} banners:`, typeBanners.length);

    // Still deduplicate in case there are duplicates within the same type
    return removeDuplicateBanners(typeBanners);
  };

  const removeDuplicateBanners = (banners: any[]) => {
    if (!Array.isArray(banners) || banners.length === 0) return [];

    const seenCombinations = new Set();
    const uniqueBanners = [];

    for (const banner of banners) {
      if (!banner || typeof banner !== 'object') continue;

      // Create a unique key using multiple properties
      const combinationKey = [
        banner?.id,
        banner?.image_url,
        banner?.product_id,
        banner?.title,
      ]
        .filter(Boolean)
        .join('|');

      // If we haven't seen this combination, add it to unique banners
      if (combinationKey && !seenCombinations.has(combinationKey)) {
        seenCombinations.add(combinationKey);
        uniqueBanners.push(banner);
      }
    }

    return uniqueBanners;
  };

  // Helper function to filter orders by product type
  const filterOrdersByType = (orders: any[]) => {
    if (!Array.isArray(orders)) return [];

    const currentType = getCurrentProductType();

    // If currentType is null, return ALL orders
    if (currentType === null) {
      return orders.filter(
        order => Array.isArray(order.items) && order.items.length > 0,
      );
    }

    return orders.filter(order => {
      if (!Array.isArray(order.items) || order.items.length === 0) {
        return false;
      }

      // Check if any item in the order has the matching product type
      return order.items.some(
        item => item?.product?.product_type === currentType,
      );
    });
  };
  // const refreshAllData = async () => {
  //   try {
  //     showLoader(); // Only show loader once

  //     // Execute all async operations in parallel or sequence
  //     await Promise.all([
  //       GetCategoryProducts(),
  //       bigsale(),
  //       RecommendProducts(),
  //       OrderList(),
  //       ApiSorting(),
  //       GetHeader(),
  //     ]);

  //     await fetchWishlist();
  //   } catch (error) {
  //     console.log('Error refreshing data:', error);
  //   } finally {
  //     hideLoader(); // Hide loader once all operations complete
  //   }
  // };

  useFocusEffect(
    React.useCallback(() => {
      console.log('Home screen focused, refreshing data...');

      // Use silent loading without loader
      loadDataSilently();

      return () => {
        console.log('Home screen unfocused');
      };
    }, [userType, isLoggedIn]),
  );

  // Add this function for silent loading:
  const loadDataSilently = async () => {
    try {
      await Promise.all([
        GetCategoryProductsWithoutLoader(),
        bigsaleWithoutLoader(),
        RecommendProductsWithoutLoader(),
        ApiSortingWithoutLoader(),
        GetHeaderWithoutLoader(),
      ]);

      if (isLoggedIn) {
        await OrderListWithoutLoader();
        await fetchWishlist();
      }
    } catch (error) {
      console.log('Error loading data silently:', error);
    }
  };
  // Inside your HomeScreen1 component, add these logs:
  // Replace your current useEffect debug logs with this more detailed version:

  const RecommendProductsWithoutLoader = async () => {
    try {
      const res = await UserService.recommended();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.data || [];
        const filteredProducts = filterProductsByType(fetchedProducts);
        setApiRecommend(filteredProducts);
      }
    } catch (err) {
      console.log('recommenderror', err);
    }
  };
  useEffect(() => {
    console.log('Wishlist Context Detailed Debug:', {
      isLoggedIn,
      userType,
      wishlistItemsCount: wishlistItems?.length || 0,
      isLoading,
      sampleItem: wishlistItems?.[0]
        ? {
            id: wishlistItems[0]?.id,
            name: wishlistItems[0]?.name,
            product_type: wishlistItems[0]?.product_type,
            front_image: wishlistItems[0]?.front_image,
            variants: wishlistItems[0]?.variants,
            // Check all possible properties
            hasProductProperty: !!wishlistItems[0]?.product,
            productId: wishlistItems[0]?.product?.id,
            productName: wishlistItems[0]?.product?.name,
            productFrontImage: wishlistItems[0]?.product?.front_image,
          }
        : null,
    });
  }, [wishlistItems, isLoggedIn, userType, isLoading]);

  // update wishlist items depending on login state (server vs local)

  useEffect(() => {
    // The context already handles loading wishlist based on login state
    // No need for local state management
    console.log('Wishlist items updated:', wishlistItems.length);
  }, [wishlistItems]);

  // Add this function to get the correct price
  const getCorrectPrice = (item: any) => {
    if (!item) return null;

    console.log('=== PRICE DEBUG ===');
    console.log('Item:', item?.name || 'Unknown');
    console.log('Full item structure:', JSON.stringify(item, null, 2));

    // Check multiple possible price locations
    const priceSources = [
      // First variant's actual_price (discounted price)
      {
        source: 'variants[0].actual_price',
        value: item?.variants?.[0]?.actual_price,
      },
      // First variant's price (original price)
      { source: 'variants[0].price', value: item?.variants?.[0]?.price },
      // Direct price property
      { source: 'price', value: item?.price },
      // Main price property
      { source: 'main_price', value: item?.main_price },
      // From product object if nested
      {
        source: 'product.variants[0].actual_price',
        value: item?.product?.variants?.[0]?.actual_price,
      },
      {
        source: 'product.variants[0].price',
        value: item?.product?.variants?.[0]?.price,
      },
      { source: 'product.main_price', value: item?.product?.main_price },
      // From originalItem
      {
        source: 'originalItem.product.variants[0].actual_price',
        value: item?.originalItem?.product?.variants?.[0]?.actual_price,
      },
      {
        source: 'originalItem.product.variants[0].price',
        value: item?.originalItem?.product?.variants?.[0]?.price,
      },
      {
        source: 'originalItem.product.main_price',
        value: item?.originalItem?.product?.main_price,
      },
    ];

    // Find the first valid price
    for (const priceSource of priceSources) {
      if (
        priceSource.value !== undefined &&
        priceSource.value !== null &&
        priceSource.value !== ''
      ) {
        console.log(
          `Found price in ${priceSource.source}: ${priceSource.value}`,
        );

        // Convert to number if it's a string
        let priceValue = priceSource.value;
        if (typeof priceValue === 'string') {
          priceValue = parseFloat(priceValue);
        }

        // Check if price looks suspicious (100 when it should be 225/250)
        if (priceValue === 100) {
          console.log(
            'WARNING: Price is 100 - checking if this is correct or should be variant price',
          );
          // Check if there are variants with higher prices
          if (
            item?.variants?.[0]?.actual_price &&
            item.variants[0].actual_price > 100
          ) {
            console.log(
              `Found higher variant price: ${item.variants[0].actual_price}, using that instead`,
            );
            return item.variants[0].actual_price;
          }
          if (item?.variants?.[0]?.price && item.variants[0].price > 100) {
            console.log(
              `Found higher variant price: ${item.variants[0].price}, using that instead`,
            );
            return item.variants[0].price;
          }
        }

        return priceValue;
      }
    }

    console.log('No valid price found in any source');
    return null;
  };

  // Simple price formatter
  const formatPrice = (price: any) => {
    if (!price && price !== 0) return '0';

    const priceNum = parseFloat(String(price));
    if (isNaN(priceNum)) return '0';

    // If price has decimals like 250.00, remove .00
    if (priceNum === Math.floor(priceNum)) {
      return priceNum.toString();
    } else {
      return priceNum.toFixed(2);
    }
  };

  const GetCategoryProductsWithoutLoader = async () => {
    try {
      setIsLoadingCategory(true);
      const res = await UserService.GetCategory();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.categories || [];
        setApiCateProducts(fetchedProducts);
        const defaultId = fetchedProducts?.[0]?.id ?? 1;
        setSelectedCategoryId(defaultId);
        await GetCategoryIDWithoutLoader(defaultId);
      }
    } catch (err) {
      console.log('error category', err);
    } finally {
      setIsLoadingCategory(false);
    }
  };

  const featuredproductWithoutLoader = async () => {
    try {
      const res = await UserService.featuredproducts();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res?.data?.data || {};
        const typeProducts = getFeaturedProducts(fetchedProducts);
        setFeaturesProduct(typeProducts);

        if (isLoggedIn) {
          await OrderListWithoutLoader();
        }
      }
    } catch (err) {
      console.log('error featuredproduct', err);
    }
  };
  const OrderListWithoutLoader = async () => {
    try {
      const response = await UserService.order();
      if (response && response.data && response.status === HttpStatusCode.Ok) {
        const orders = response.data?.orders || [];
        const filteredOrders = filterOrdersByType(orders);
        setorderitem(filteredOrders);
      }
    } catch (err) {
      console.log('Order fetch exception:', err);
    }
  };

  const ApiSortingWithoutLoader = async () => {
    try {
      const res = await UserService.Sorting('price_asc');
      if (res?.status === HttpStatusCode.Ok) {
        const sortedProducts = res?.data?.data || [];
        const filteredProducts = filterProductsByType(sortedProducts);
        console.log('Heyyyyyyy', filteredProducts);
        setlowestitem(filteredProducts);
      } else {
        console.log('Failed to sort products:', res);
        Toast.show({
          type: 'error',
          text1: 'Failed to sort products',
        });
      }
    } catch (err) {
      console.log('Sorting error:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to sort products',
      });
    }
  };

  const GetHeaderWithoutLoader = async () => {
    try {
      const res = await UserService.header();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const banners = getPromotionalBanners(res?.data?.data || {});
        setPromotional(banners);
      }
    } catch (err) {
      console.log('GetHeader error:', err);
    }
  };

  const bigsaleWithoutLoader = async () => {
    try {
      const res = await UserService.bigsales();
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res.data?.data || {};
        const typeProducts = getSalesProducts(fetchedProducts);
        const activeSalesProducts = filterActiveBigSaleProducts(typeProducts);

        if (
          Array.isArray(activeSalesProducts) &&
          activeSalesProducts.length > 0
        ) {
          setsalesProduct(activeSalesProducts);
        } else {
          setsalesProduct([]);
        }
      }
    } catch (err) {
      console.log('error bigsale', err);
      setsalesProduct([]);
    }
  };

  const GetCategoryIDWithoutLoader = async (categoryId: any) => {
    try {
      setIsLoadingCategory(true);
      const res = await UserService.GetCategoryByID(categoryId);
      if (res && res.data && res.status === HttpStatusCode.Ok) {
        const fetchedProducts = res?.data?.data || [];
        const filteredProducts = filterProductsByType(fetchedProducts);
        setcategoryProduct(filteredProducts);
        await featuredproductWithoutLoader();
      }
    } catch (err) {
      console.log('error category', err);
    } finally {
      setIsLoadingCategory(false);
    }
  };

  {
    console.log('HEY', wishlistItems);
  }

  // Helper function to check if sale is currently active
  const isSaleActive = (startDate: string, endDate: string) => {
    try {
      const today = new Date();
      const end = new Date(endDate.split(' ')[0]); // Get date only

      // Reset time to compare only dates
      const todayDateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const endDateOnly = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate(),
      );

      return todayDateOnly <= endDateOnly;
    } catch (error) {
      return false;
    }
  };

  const filterActiveBigSaleProducts = (products: any[]) => {
    if (!Array.isArray(products)) return [];

    return products.filter(item => {
      if (!item?.start_date || !item?.end_date) return false;
      return isSaleActive(item.start_date, item.end_date);
    });
  };

  // Call this function when adding/removing from wishlist

  // PromotionalBanner component
  const PromotionalBanner: React.FC<{
    promotional: any[];
    navigation: any;
  }> = ({ promotional = [] as any[], navigation }) => {
    if (!promotional.length) return null;

    return (
      <View style={{ margin: 12, borderRadius: 12 }}>
        {promotional.map((item: any, index: number) => (
          <View
            key={`${item?.id || index}-${item?.image_url || ''}-${
              item?.product_id || ''
            }`}
            style={styles.page}
          >
            <Image
              source={{ uri: Image_url + item.image_url }}
              style={styles.imageBackground}
              resizeMode="cover"
            />
            <View
              style={{
                position: 'absolute',
                top: '20%',
                left: 0,
                right: 0,
                bottom: 0,
                paddingHorizontal: 20,
              }}
            >
              <TransletText
                text="White Peony Tea Co"
                style={styles.bannertittle}
              />

              <TransletText
                text={item?.title || ''}
                style={[styles.bannertittle, { fontSize: 18, marginTop: 7 }]}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={() =>
                  navigation.navigate('ProductDetails', {
                    productId: item.product_id,
                  })
                }
              >
                <TransletText text="Shop Now" style={styles.buttonText} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFF0' }}>
      <StatusBar barStyle={'dark-content'} />

      {/* Header - Refined Dark Theme */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: heightPercentageToDP(2),
          paddingHorizontal: widthPercentageToDP(5),
          backgroundColor: '#FFFFF0',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0', // Subtle gray line instead of gold
        }}
      >
        {/* Left Side - Minimal Decorative */}
        <View
          style={{
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              width: 20,
              height: 2,
              // backgroundColor: '#888888', // Dark gray
              // borderRadius: 1,
              // marginBottom: 4,
            }}
          />
          <View
            style={{
              width: 12,
              height: 2,
              // backgroundColor: '#888888',
              // borderRadius: 1,
              // opacity: 0.5,
            }}
          />
        </View>

        {/* Center - Logo */}
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <Image
            source={require('../../assets/peony_logo.png')}
            style={{
              width: 160,
              height: 30,
              resizeMode: 'contain',
            }}
          />
          <Text
            style={{
              fontSize: 9,
              color: '#888888', // Dark gray
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginTop: 2,
              fontWeight: '300',
            }}
          >
            Premium Tea Collection
          </Text>
        </View>

        {/* Right Side - User Icon */}
        <TouchableOpacity
          onPress={() =>
            isLoggedIn
              ? navigation.navigate('EditProfile')
              : setModalVisible(true)
          }
          style={{
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: '#888888',
              borderRadius: 20,
              padding: 8,
              backgroundColor: 'rgba(0,0,0,0.02)',
            }}
          >
            <Image
              source={require('../../assets/userx.png')}
              style={{
                width: 16,
                height: 16,
                resizeMode: 'cover',
                tintColor: '#666666',
              }}
            />
          </View>
          {isLoggedIn && (
            <View
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#4CAF50',
                borderWidth: 1,
                borderColor: '#FFFFF0',
              }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar - Refined */}
      <View
        style={{
          paddingHorizontal: widthPercentageToDP(5),
          paddingTop: heightPercentageToDP(2),
          paddingBottom: heightPercentageToDP(1),
          backgroundColor: '#FFFFF0',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Searchpage')}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 30,
              height: 52,
              paddingHorizontal: 16,
              backgroundColor: '#FFFFFF',
              borderWidth: 1, // Single border
              borderColor: '#E0E0E0',
            }}
          >
            {/* Search Icon */}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#F5F5F5',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}
            >
              <Image
                source={require('../../assets/Searchx.png')}
                style={{
                  width: 18,
                  height: 18,
                  resizeMode: 'contain',
                  tintColor: '#666666',
                }}
              />
            </View>

            {/* Search Text */}
            <View style={{ flex: 1 }}>
              <TransletText
                text="Search for premium teas..."
                style={{
                  fontSize: 14,
                  color: '#999999',
                  fontWeight: '300',
                  letterSpacing: 0.3,
                }}
              />
            </View>

            {/* Voice Icon - Fixed cutting issue */}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#F5F5F5',
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 4,
              }}
            >
              <Image
                source={require('../../assets/micx.png')}
                style={{
                  width: 18,
                  height: 18,
                  resizeMode: 'contain',
                  tintColor: '#666666',
                }}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Removed decorative line */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#FFFFF0' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            colors={['#666666']}
            tintColor="#666666"
          />
        }
      >
        <View style={{ backgroundColor: '#fff', flex: 1 }}>
          {/* Categories Horizontal List */}
          <View
            style={{
              paddingVertical: heightPercentageToDP(2),
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: widthPercentageToDP(3),
              backgroundColor: '#FFFFF0',
            }}
          ></View>
          <View
            style={{
              borderWidth: 0.7,
              borderColor: '#A7A7A7',
              width: widthPercentageToDP(111),
              paddingHorizontal: 0,
              marginTop: heightPercentageToDP(-2.2),
            }}
          />
          {/* Categories Grid - Horizontal Scrolling */}
          {isLoadingCategory ? (
            <View
              style={{
                paddingHorizontal: widthPercentageToDP(3),
                paddingVertical: 20,
                backgroundColor: '#FFFFFF',
              }}
            >
              <View
                style={{
                  backgroundColor: '#F8F8F8',
                  borderRadius: 16,
                  padding: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TransletText
                  text="Loading products..."
                  style={{
                    fontSize: 14,
                    color: '#999999',
                    fontWeight: '300',
                  }}
                />
              </View>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                paddingTop: 8,
                paddingBottom: 20,
              }}
            >
              {/* Section Header */}
              <View
                style={{
                  paddingHorizontal: widthPercentageToDP(3),
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <TransletText
                    text="Shop by Category"
                    style={{
                      fontSize: 18,
                      fontWeight: '500',
                      color: '#1A1A1A',
                      letterSpacing: 0.3,
                    }}
                  />
                  <View
                    style={{
                      width: 30,
                      height: 2,
                      backgroundColor: '#D4D4D4',
                      marginTop: 4,
                      borderRadius: 1,
                    }}
                  />
                </View>
              </View>

              {/* Category Chips - Light Backgrounds for Dark Icons */}
              <View
                style={{
                  paddingVertical: heightPercentageToDP(2),
                  backgroundColor: '#FFFFFF',
                }}
              >
                <FlatList
                  data={category}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={item => String(item.id)}
                  contentContainerStyle={{
                    paddingHorizontal: widthPercentageToDP(3),
                    gap: 12,
                  }}
                  renderItem={({ item }) => {
                    const isActive = item?.id === selectedCategoryId;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedCategoryId(item.id);
                          GetCategoryIDWithoutLoader(item.id);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isActive ? '#E8E8E8' : '#F8F8F8', // Light backgrounds
                          paddingVertical: 10,
                          paddingHorizontal: 18,
                          borderRadius: 40,
                          borderWidth: 1,
                          borderColor: isActive ? '#D0D0D0' : '#F0F0F0',
                        }}
                      >
                        {/* Icon - No tint, original colors */}
                        <Image
                          source={{ uri: Image_url + item?.icon }}
                          style={{
                            width: 20,
                            height: 20,
                            resizeMode: 'contain',
                            marginRight: 8,
                          }}
                        />

                        {/* Category Name */}
                        <TransletText
                          text={item?.name}
                          style={{
                            fontSize: 13,
                            fontWeight: isActive ? '500' : '400',
                            color: isActive ? '#2C2C2C' : '#666666',
                          }}
                        />
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
              {/* Products - Horizontal Scroll */}
              {Array.isArray(categoryProduct) && categoryProduct.length > 0 ? (
                <FlatList
                  data={categoryProduct}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) =>
                    item?.id ? String(item.id) : `product-${index}`
                  }
                  contentContainerStyle={{
                    paddingHorizontal: widthPercentageToDP(3),
                    gap: 12,
                  }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('ProductDetails', {
                          productId: item.id,
                        })
                      }
                      style={{
                        width: 140, // Fixed width for horizontal items
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#F0F0F0',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Image Container */}
                      <View
                        style={{
                          backgroundColor: '#F8F8F8',
                          aspectRatio: 1,
                          position: 'relative',
                        }}
                      >
                        <Image
                          source={{ uri: Image_url + item?.front_image }}
                          style={{
                            width: '100%',
                            height: '100%',
                            resizeMode: 'cover',
                          }}
                        />

                        {/* Wishlist Button */}
                        <TouchableOpacity
                          onPress={async e => {
                            e.stopPropagation();
                            if (isWishlisted(item.id)) {
                              await removeFromWishlist(item.id);
                            } else {
                              await addToWishlist(item.id);
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: 6,
                            borderRadius: 20,
                            width: 28,
                            height: 28,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Image
                            source={
                              isWishlisted(item.id)
                                ? require('../../assets/heart.png')
                                : require('../../assets/Png/heart-1.png')
                            }
                            style={{
                              width: 12,
                              height: 12,
                              resizeMode: 'cover',
                              tintColor: isWishlisted(item.id)
                                ? '#FF3E6C'
                                : '#666666',
                            }}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Product Info */}
                      <View
                        style={{
                          padding: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '400',
                            color: '#1A1A1A',
                            marginBottom: 4,
                            lineHeight: 16,
                            height: 32,
                          }}
                        >
                          {item?.name || 'Products'}
                        </Text>
                        {/* <TransletText
                          text={item?.name || 'Product'}
                          style={{
                            fontSize: 12,
                            fontWeight: '400',
                            color: '#1A1A1A',
                            marginBottom: 4,
                            lineHeight: 16,
                            height: 32,
                          }}
                          numberOfLines={2}
                        /> */}

                        {/* Price */}
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color: '#1A1A1A',
                          }}
                        >
                          {displayPrice(
                            item?.variants?.[0]?.price || item?.main_price || 0,
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View
                      style={{
                        width: width - widthPercentageToDP(6),
                        backgroundColor: '#F8F8F8',
                        borderRadius: 16,
                        padding: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <TransletText
                        text="No products in this category"
                        style={{
                          fontSize: 14,
                          color: '#999999',
                          fontWeight: '300',
                          marginBottom: 8,
                        }}
                      />
                      <TransletText
                        text="Try selecting another category"
                        style={{
                          fontSize: 12,
                          color: '#CCCCCC',
                        }}
                      />
                    </View>
                  }
                />
              ) : (
                // Empty State
                <View
                  style={{
                    marginHorizontal: widthPercentageToDP(3),
                    backgroundColor: '#F8F8F8',
                    borderRadius: 16,
                    padding: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TransletText
                    text="No products in this category"
                    style={{
                      fontSize: 14,
                      color: '#999999',
                      fontWeight: '300',
                      marginBottom: 8,
                    }}
                  />
                  <TransletText
                    text="Try selecting another category"
                    style={{
                      fontSize: 12,
                      color: '#CCCCCC',
                    }}
                  />
                </View>
              )}
            </View>
          )}
          {/* Frequently Bought */}
          <View
            style={{
              paddingHorizontal: widthPercentageToDP(3),
              backgroundColor: '#fff',
            }}
          >
            {orderitem?.some(order => order.items?.length > 0) ? (
              <>
                <TransletText
                  text="Frequently Bought"
                  style={styles.sectionTitle}
                />

                <FlatList
                  data={orderitem}
                  keyExtractor={item => String(item.id)}
                  horizontal
                  renderItem={({ item }) => {
                    return (
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('ProductDetails', {
                            productId: item?.items[0]?.product?.id,
                          })
                        }
                      >
                        <View style={styles.freqCard}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'center',
                            }}
                          >
                            <Image
                              source={{
                                uri:
                                  Image_url +
                                  item?.items[0]?.product?.front_image,
                              }}
                              style={styles.freqImage}
                            />
                            <View style={{ marginLeft: 5 }}></View>
                            <Image
                              source={{
                                uri:
                                  Image_url +
                                  item?.items[0]?.product?.back_image,
                              }}
                              style={styles.freqImage}
                            />
                          </View>
                          <TransletText
                            text={item?.items[0]?.product?.name || ''}
                            style={styles.freqText}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            ) : null}

            {/* Featured This Week */}
            {/* Featured This Week - Redesigned */}
            <View
              style={{
                marginTop: heightPercentageToDP(2),
                marginBottom: heightPercentageToDP(1),
                backgroundColor: '#FFFFFF',
                paddingVertical: 16,
              }}
            >
              {/* Elegant Header */}
              <View
                style={{
                  paddingHorizontal: widthPercentageToDP(3),
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <TransletText
                      text="Featured This Week"
                      style={{
                        fontSize: 18,
                        fontWeight: '500',
                        color: '#1A1A1A',
                        letterSpacing: 0.3,
                        marginBottom: 4,
                      }}
                    />
                    <View
                      style={{
                        width: 50,
                        height: 2,
                        backgroundColor: '#D4D4D4',
                        borderRadius: 2,
                      }}
                    />
                  </View>

                  {/* Optional subtle "View all" link */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Category')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#999999',
                        marginRight: 4,
                      }}
                    >
                      View all
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#999999',
                      }}
                    >
                      →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Featured Products Carousel */}
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={FeaturesProduct}
                keyExtractor={(item, index) =>
                  item?.id ? String(item.id) : String(index)
                }
                contentContainerStyle={{
                  paddingHorizontal: widthPercentageToDP(3),
                  gap: 16,
                }}
                renderItem={({ item }) => {
                  // Calculate discount percentage if applicable
                  const discountPercentage =
                    item.product?.discount ||
                    (() => {
                      if (item.product?.price_range) {
                        const min = item.product.price_range.min;
                        const max = item.product.price_range.max;
                        if (min && max && max > min) {
                          return Math.round(((max - min) / max) * 100);
                        }
                      }
                      return null;
                    })();

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('ProductDetails', {
                          productId: item?.product?.id,
                        })
                      }
                      style={{
                        width: 180,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#F2F2F2',
                      }}
                    >
                      {/* Image Container */}
                      <View
                        style={{
                          position: 'relative',
                          backgroundColor: '#F9F9F9',
                          aspectRatio: 1,
                        }}
                      >
                        <Image
                          source={{
                            uri: Image_url + item?.product?.front_image,
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            resizeMode: 'cover',
                          }}
                        />

                        {/* Minimal Tag - Only if exists */}
                        {item.tag && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              backgroundColor: 'rgba(44, 44, 44, 0.85)',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 20,
                            }}
                          >
                            <Text
                              style={{
                                color: '#FFFFFF',
                                fontSize: 9,
                                fontWeight: '500',
                                letterSpacing: 0.5,
                                textTransform: 'uppercase',
                              }}
                            >
                              {item.tag}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View
                        style={{
                          padding: 12,
                        }}
                      >
                        {/* Product Name */}
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color: '#1A1A1A',
                            marginBottom: 8,
                            lineHeight: 18,
                            height: 36,
                          }}
                        >
                          {item.product?.name || 'Product Name'}
                        </Text>

                        {/* Price and Rating Row */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                          }}
                        >
                          {/* Price */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'baseline',
                              gap: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: '600',
                                color: '#1A1A1A',
                              }}
                            >
                              {displayPrice(
                                Math.round(item.product.price_range.min || 0),
                              )}
                            </Text>
                            {item.product.price_range.max >
                              item.product.price_range.min && (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: '#999999',
                                }}
                              >
                                -{' '}
                                {displayPrice(
                                  Math.round(item.product.price_range.max),
                                )}
                              </Text>
                            )}
                          </View>

                          {/* Rating */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#F5F5F5',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#666666',
                                marginRight: 2,
                              }}
                            >
                              ★
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#666666',
                                fontWeight: '500',
                              }}
                            >
                              {item.product?.ratingCount || '4.2'}
                            </Text>
                          </View>
                        </View>

                        {/* Delivery Badge - Minimal */}
                        {item.product?.fastDelivery && (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <View
                              style={{
                                width: 3,
                                height: 3,
                                borderRadius: 1.5,
                                backgroundColor: '#2E7D32',
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#2E7D32',
                                fontWeight: '400',
                              }}
                            >
                              Free delivery
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Subtle Pagination Dots - Optional */}
              {FeaturesProduct.length > 4 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 16,
                    gap: 6,
                  }}
                >
                  {[0, 1, 2].map(index => (
                    <View
                      key={index}
                      style={{
                        width: index === 0 ? 24 : 6,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: index === 0 ? '#1A1A1A' : '#E0E0E0',
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
          {/* Big Sale Section - Redesigned */}
          {salesProduct.length > 0 && (
            <View
              style={{
                width: '100%',
                marginTop: 20,
                marginBottom: 10,
                paddingVertical: 15,
                backgroundColor: '#F8F6F0', // Soft, neutral background
              }}
            >
              {/* Section Header */}
              <View
                style={{
                  paddingHorizontal: widthPercentageToDP(3),
                  marginBottom: 15,
                }}
              >
                <TransletText
                  text="News"
                  style={[
                    styles.sectionTitle,
                    {
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#2C2C2C',
                      marginBottom: 4,
                    },
                  ]}
                />
                {salesProduct[0] && (
                  <TransletText
                    text={`${formatDate(salesProduct[0]?.start_date).slice(
                      0,
                      13,
                    )} - ${formatDate(salesProduct[0]?.end_date).slice(0, 13)}`}
                    style={{
                      fontSize: 13,
                      fontWeight: '400',
                      color: '#666666',
                      letterSpacing: 0.3,
                    }}
                  />
                )}
              </View>

              {/* Carousel */}
              <FlatList
                data={salesProduct}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `sale-${index}`}
                contentContainerStyle={{
                  paddingHorizontal: widthPercentageToDP(3),
                  gap: 12,
                }}
                renderItem={({ item }) => {
                  // Calculate discount percentage if not provided
                  const discountPercentage =
                    item?.percentage ||
                    (() => {
                      if (item?.product?.price_range) {
                        const min = item.product.price_range.min;
                        const max = item.product.price_range.max;
                        if (min && max && max > min) {
                          return Math.round(((max - min) / max) * 100);
                        }
                      }
                      return null;
                    })();

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('ProductDetails', {
                          productId: item?.product?.id || item?.id,
                        })
                      }
                      style={{
                        width: 200,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 3,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#F0F0F0',
                      }}
                    >
                      {/* Image Container */}
                      <View
                        style={{
                          position: 'relative',
                          backgroundColor: '#FAFAFA',
                        }}
                      >
                        <Image
                          source={{
                            uri:
                              Image_url +
                              (item?.product?.front_image || item?.front_image),
                          }}
                          style={{
                            width: '100%',
                            height: 160,
                            resizeMode: 'cover',
                          }}
                        />

                        {/* Discount Badge - Optional, remove if you want even more minimal */}
                        {discountPercentage && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              backgroundColor: 'rgba(40, 40, 40, 0.9)',
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 20,
                            }}
                          >
                            <Text
                              style={{
                                color: '#FFFFFF',
                                fontSize: 11,
                                fontWeight: '600',
                                letterSpacing: 0.3,
                              }}
                            >
                              {discountPercentage}% OFF
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View
                        style={{
                          padding: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: '#2C2C2C',
                            marginBottom: 8,
                            lineHeight: 20,
                          }}
                          numberOfLines={2}
                        >
                          {' '}
                          {item?.product?.name || item?.name || 'Product'}
                        </Text>

                        {/* Price */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          {item?.product?.price_range ? (
                            <>
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontWeight: '600',
                                  color: '#2C2C2C',
                                }}
                              >
                                {displayPrice(
                                  Math.round(item.product.price_range.min),
                                )}
                              </Text>
                              {item.product.price_range.max >
                                item.product.price_range.min && (
                                <>
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      color: '#999999',
                                    }}
                                  >
                                    -
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 15,
                                      fontWeight: '600',
                                      color: '#2C2C2C',
                                    }}
                                  >
                                    {displayPrice(
                                      Math.round(item.product.price_range.max),
                                    )}
                                  </Text>
                                </>
                              )}
                            </>
                          ) : (
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: '600',
                                color: '#2C2C2C',
                              }}
                            >
                              {displayPrice(
                                item?.variants?.[0]?.actual_price ||
                                  item?.variants?.[0]?.price,
                              )}
                            </Text>
                          )}
                        </View>

                        {/* Shop Now Link */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            marginTop: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: '#666666',
                              marginRight: 4,
                            }}
                          >
                            Shop now
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: '#2C2C2C',
                            }}
                          >
                            →
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
          {/* Lowest Prices Ever */}
          {/* Lowest Prices Ever - Redesigned */}
          <View
            style={{
              width: '100%',
              marginVertical: heightPercentageToDP(2),
              backgroundColor: '#FFFFFF',
              paddingVertical: 20,
            }}
          >
            {/* Simple Decorative Header Line */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: widthPercentageToDP(3),
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: '#E8E8E8',
                }}
              />
              <View
                style={{
                  paddingHorizontal: 16,
                }}
              >
                <TransletText
                  text="Lowest PRICES EVER"
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: '#2C2C2C',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                />
              </View>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: '#E8E8E8',
                }}
              />
            </View>

            {/* Subtitle */}
            <TransletText
              text="Unbeatable prices on premium products"
              style={{
                fontSize: 13,
                color: '#666666',
                textAlign: 'center',
                marginBottom: 20,
                fontStyle: 'italic',
              }}
            />

            {/* Products Carousel */}
            <FlatList
              data={lowestitem}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `lowest-${index}`}
              contentContainerStyle={{
                paddingHorizontal: widthPercentageToDP(3),
                gap: 16,
              }}
              renderItem={({ item }) => {
                const wished = isWishlisted(item.id);

                // Extract price information
                const getPriceInfo = (product: any) => {
                  if (!product)
                    return { discountedPrice: null, originalPrice: null };

                  let discountedPrice = null;
                  if (
                    product?.variants?.[0]?.actual_price !== undefined &&
                    product?.variants?.[0]?.actual_price !== null
                  ) {
                    discountedPrice = product.variants[0].actual_price;
                  }

                  let originalPrice = null;
                  if (
                    product?.variants?.[0]?.price !== undefined &&
                    product?.variants?.[0]?.price !== null
                  ) {
                    originalPrice = product.variants[0].price;
                  }

                  if (
                    !discountedPrice &&
                    !originalPrice &&
                    product?.main_price
                  ) {
                    originalPrice = product.main_price;
                  }

                  if (
                    discountedPrice &&
                    !originalPrice &&
                    product?.main_price
                  ) {
                    originalPrice = product.main_price;
                  }

                  return { discountedPrice, originalPrice };
                };

                const { discountedPrice, originalPrice } = getPriceInfo(item);
                const hasDiscount =
                  discountedPrice &&
                  originalPrice &&
                  discountedPrice !== originalPrice;
                const savingsPercentage = hasDiscount
                  ? Math.round(
                      ((originalPrice - discountedPrice) / originalPrice) * 100,
                    )
                  : null;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('ProductDetails', {
                        productId: item.id,
                      })
                    }
                    style={{
                      width: 160,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#F0F0F0',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Image Container */}
                    <View
                      style={{
                        position: 'relative',
                        backgroundColor: '#FAFAFA',
                      }}
                    >
                      <Image
                        source={{ uri: Image_url + item?.front_image }}
                        style={{
                          width: '100%',
                          height: 160,
                          resizeMode: 'cover',
                        }}
                      />

                      {/* Savings Badge - Only show if significant savings */}
                      {savingsPercentage && savingsPercentage > 10 && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            backgroundColor: 'rgba(44, 44, 44, 0.9)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 20,
                          }}
                        >
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 10,
                              fontWeight: '600',
                              letterSpacing: 0.3,
                            }}
                          >
                            -{savingsPercentage}%
                          </Text>
                        </View>
                      )}

                      {/* Wishlist Button - Subtle */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={async e => {
                          e.stopPropagation();
                          if (isWishlisted(item.id)) {
                            await removeFromWishlist(item.id);
                          } else {
                            await addToWishlist(item.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          padding: 6,
                          borderRadius: 20,
                          width: 28,
                          height: 28,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Image
                          source={
                            isWishlisted(item.id)
                              ? require('../../assets/heart.png')
                              : require('../../assets/Png/heart-1.png')
                          }
                          style={{
                            width: 14,
                            height: 14,
                            resizeMode: 'cover',
                            tintColor: isWishlisted(item.id)
                              ? '#FF3E6C'
                              : '#666666',
                          }}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Product Info */}
                    <View
                      style={{
                        padding: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: '#2C2C2C',
                          marginBottom: 8,
                          lineHeight: 18,
                          height: 36,
                        }}
                        numberOfLines={2}
                      >
                        {item?.name || 'Unnamed Product'}
                      </Text>

                      {/* Price Section */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'baseline',
                          gap: 8,
                        }}
                      >
                        {hasDiscount ? (
                          <>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: '#2C2C2C',
                              }}
                            >
                              {displayPrice(discountedPrice)}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: '#999999',
                                textDecorationLine: 'line-through',
                              }}
                            >
                              {displayPrice(originalPrice)}
                            </Text>
                          </>
                        ) : originalPrice ? (
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '600',
                              color: '#2C2C2C',
                            }}
                          >
                            {displayPrice(originalPrice)}
                          </Text>
                        ) : (
                          <TransletText
                            text="Price unavailable"
                            style={{
                              fontSize: 12,
                              color: '#999999',
                              fontStyle: 'italic',
                            }}
                          />
                        )}
                      </View>

                      {/* View Details Link */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          marginTop: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#888888',
                            marginRight: 4,
                          }}
                        >
                          View details
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#2C2C2C',
                          }}
                        >
                          →
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* See All Link - Minimal */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Category')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: '#666666',
                  marginRight: 6,
                  fontWeight: '400',
                }}
              >
                Browse all products
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#2C2C2C',
                }}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
          // Wishlist Section - Replace your current wishlist section with this
          {wishlistItems && wishlistItems.length > 0 ? (
            <View
              style={{
                paddingHorizontal: widthPercentageToDP(3),
                marginTop: heightPercentageToDP(2),
              }}
            >
              <TransletText
                text={`Your Wishlist (${wishlistItems.length})`}
                style={styles.sectionTitle}
              />

              <FlatList
                data={wishlistItems}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => {
                  // Use multiple possible ID sources

                  const id = item?.id || item?.product_id || index.toString();

                  return `wishlist-${id}-${index}`;
                }}
                contentContainerStyle={{ paddingVertical: 8 }}
                renderItem={({ item, index }) => {
                  console.log(`Rendering wishlist item ${index}:`, item);

                  if (!item) return null;

                  // Extract data from the transformed item structure
                  const productId = item?.id || item?.product_id;
                  const productName = item?.name || 'Product';
                  const price = item?.price || item?.main_price;

                  // Get image - use the pre-transformed image URL first, then fallback
                  let imageUri = item?.image;
                  if (!imageUri && item?.front_image) {
                    // Check if front_image already has full URL
                    if (item.front_image.startsWith('http')) {
                      imageUri = item.front_image;
                    } else {
                      imageUri = Image_url + item.front_image;
                    }
                  }

                  // Also check originalItem for image
                  if (!imageUri && item?.originalItem?.product?.front_image) {
                    const frontImage = item.originalItem.product.front_image;
                    if (frontImage.startsWith('http')) {
                      imageUri = frontImage;
                    } else {
                      imageUri = Image_url + frontImage;
                    }
                  }

                  // Check if wishlisted
                  const wished = isWishlisted(item.id);
                  const correctPrice = getCorrectPrice(item);

                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (productId) {
                          navigation.navigate('ProductDetails', {
                            productId: productId,
                          });
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.wishlistCard,
                          { width: WISHLIST_CARD_WIDTH, marginRight: 12 },
                        ]}
                      >
                        {/* Image with fallback */}
                        {imageUri ? (
                          <Image
                            source={{ uri: imageUri }}
                            style={styles.wishlistImage}
                            onError={e =>
                              console.log(
                                `Image load error for item ${index}:`,
                                e.nativeEvent.error,
                              )
                            }
                          />
                        ) : (
                          <View
                            style={[
                              styles.wishlistImage,
                              {
                                backgroundColor: '#EFEFCA',
                                justifyContent: 'center',
                                alignItems: 'center',
                              },
                            ]}
                          >
                            <Text style={{ fontSize: 10, color: '#666' }}>
                              No Image
                            </Text>
                          </View>
                        )}

                        {/* Product Name */}
                        <Text
                          style={[
                            styles.wishlistTitle,
                            {
                              fontWeight: '400',
                              height: heightPercentageToDP(4),
                              marginTop: 8,
                            },
                          ]}
                        >
                          {productName}
                        </Text>
                        {/* <TransletText
                          text={productName}
                          style={[
                            styles.wishlistTitle,
                            {
                              fontWeight: '400',
                              height: heightPercentageToDP(4),
                              marginTop: 8,
                            },
                          ]}
                          numberOfLines={2}
                        /> */}

                        {/* Price */}
                        {correctPrice !== null ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginTop: 4,
                            }}
                          >
                            <Text style={styles.smallPrice}>
                              {displayPrice(correctPrice)}
                            </Text>
                          </View>
                        ) : (
                          <TransletText
                            text="Loading price..."
                            style={{
                              fontSize: 12,
                              color: '#666',
                              marginTop: 4,
                            }}
                          />
                        )}

                        {/* Wishlist Heart Button */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={async e => {
                            e.stopPropagation();
                            console.log('Toggling wishlist for:', productId);
                            await toggleWishlist(productId);
                          }}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: Colors.button[100],
                            padding: 6,
                            borderRadius: 12,
                            width: 28,
                            height: 28,
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 10,
                          }}
                        >
                          <Image
                            source={
                              wished
                                ? require('../../assets/heart.png')
                                : require('../../assets/Png/heart-1.png')
                            }
                            style={{
                              width: 14,
                              height: 14,
                              resizeMode: 'cover',
                            }}
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          ) : (
            // Empty wishlist state
            <View
              style={{
                paddingHorizontal: widthPercentageToDP(3),
                marginTop: heightPercentageToDP(2),
              }}
            >
              <TransletText
                text={`Your Wishlist (${wishlistItems.length})`}
                style={styles.sectionTitle}
              />

              <View
                style={{
                  padding: 20,
                  alignItems: 'center',
                  backgroundColor: '#F9F9F9',
                  borderRadius: 10,
                }}
              >
                <TransletText
                  text="No items in your wishlist"
                  style={{ color: '#666', marginBottom: 10 }}
                />

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('BottomTabScreen', {
                      screen: 'Category',
                    })
                  }
                  style={{
                    backgroundColor: '#2E2E2E',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                >
                  <TransletText
                    text="Browse Products →"
                    style={{ color: '#fff', fontWeight: '600' }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {/* Promotional Banner */}
          <PromotionalBanner
            promotional={Promotional}
            navigation={navigation}
          />
          {/* Recommended For You */}
          {/* Recommended For You - Redesigned */}
          <View
            style={{
              marginTop: heightPercentageToDP(3),
              marginBottom: heightPercentageToDP(4),
              backgroundColor: '#FFFFFF',
              paddingVertical: 20,
              borderTopWidth: 1,
              borderTopColor: '#F0F0F0',
            }}
          >
            {/* Sophisticated Header */}
            <View
              style={{
                paddingHorizontal: widthPercentageToDP(3),
                marginBottom: 20,
              }}
            >
              <TransletText
                text="Recommended for you"
                style={{
                  fontSize: 18,
                  fontWeight: '400',
                  color: '#1A1A1A',
                  letterSpacing: 0.3,
                  marginBottom: 4,
                }}
              />
              <TransletText
                text="Based on your preferences"
                style={{
                  fontSize: 12,
                  fontWeight: '300',
                  color: '#999999',
                  fontStyle: 'italic',
                }}
              />
            </View>

            {/* Recommended Carousel */}
            <FlatList
              ref={recRef}
              data={apiRecommend}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `rec-${item.id || index}`}
              snapToInterval={WISHLIST_CARD_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: widthPercentageToDP(3),
                gap: 16,
              }}
              onScroll={onRecommendedScroll}
              renderItem={({ item, index }) => {
                const wished = isWishlisted(item.id);
                const correctPrice = getCorrectPrice(item);

                // Get original price if available
                const originalPrice = item.variants?.[0]?.price;
                const hasDiscount =
                  originalPrice && correctPrice && originalPrice > correctPrice;
                const discountPercentage = hasDiscount
                  ? Math.round(
                      ((originalPrice - correctPrice) / originalPrice) * 100,
                    )
                  : null;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('ProductDetails', {
                        productId: item.id,
                      })
                    }
                    style={{
                      width: WISHLIST_CARD_WIDTH,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#F2F2F2',
                    }}
                  >
                    {/* Image Container */}
                    <View
                      style={{
                        position: 'relative',
                        backgroundColor: '#F9F9F9',
                        aspectRatio: 1,
                      }}
                    >
                      <Image
                        source={{ uri: Image_url + item?.front_image }}
                        style={{
                          width: '100%',
                          height: '100%',
                          resizeMode: 'cover',
                        }}
                      />

                      {/* Subtle Discount Indicator - Only if significant */}
                      {discountPercentage && discountPercentage > 5 && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            backgroundColor: 'rgba(44, 44, 44, 0.85)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 20,
                          }}
                        >
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 9,
                              fontWeight: '500',
                              letterSpacing: 0.3,
                            }}
                          >
                            -{discountPercentage}%
                          </Text>
                        </View>
                      )}

                      {/* Wishlist Button - Refined */}
                      <TouchableOpacity
                        onPress={async e => {
                          e.stopPropagation();
                          if (isWishlisted(item.id)) {
                            await removeFromWishlist(item.id);
                          } else {
                            await addToWishlist(item.id);
                          }
                        }}
                        activeOpacity={0.7}
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          padding: 8,
                          borderRadius: 20,
                          width: 32,
                          height: 32,
                          justifyContent: 'center',
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.05,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                      >
                        <Image
                          source={
                            wished
                              ? require('../../assets/heart.png')
                              : require('../../assets/Png/heart-1.png')
                          }
                          style={{
                            width: 14,
                            height: 14,
                            resizeMode: 'cover',
                            tintColor: wished ? '#FF3E6C' : '#666666',
                          }}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View
                      style={{
                        padding: 12,
                      }}
                    >
                      {/* Product Name */}
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '400',
                          color: '#1A1A1A',
                          marginBottom: 8,
                          lineHeight: 18,
                          height: 36,
                        }}
                        numberOfLines={2}
                      >
                        {item?.name || 'Unnamed Product'}
                      </Text>

                      {/* Price Section */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'baseline',
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '500',
                            color: '#1A1A1A',
                          }}
                        >
                          {displayPrice(
                            correctPrice ||
                              item.variants[0]?.actual_price ||
                              item.variants[0]?.price,
                          )}
                        </Text>

                        {hasDiscount && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: '#999999',
                              textDecorationLine: 'line-through',
                            }}
                          >
                            {displayPrice(originalPrice)}
                          </Text>
                        )}
                      </View>

                      {/* Quick View Indicator */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 10,
                          opacity: 0.5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: '#666666',
                            marginRight: 4,
                          }}
                        >
                          Quick view
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: '#666666',
                          }}
                        >
                          →
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Minimal Pagination Dots */}
            {Array.isArray(apiRecommend) && apiRecommend.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                  gap: 8,
                }}
              >
                {apiRecommend.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: activeRec === i ? 24 : 6,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: activeRec === i ? '#1A1A1A' : '#E0E0E0',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        <LoginModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onGoogleLogin={() => Alert.alert('Google Login')}
          onFacebookLogin={() => Alert.alert('Facebook Login')}
          phoneNumber="email or phone number"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default React.memo(HomeScreen1);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: widthPercentageToDP(3),
    backgroundColor: '#FFFFF0',
  },

  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },

  stack: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '65%',
    gap: 8,
  },

  card: {
    width: widthPercentageToDP(30),
    borderRadius: 14,
    padding: 8,
  },

  imageBig: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
    top: 20,
    borderRadius: 12,
  },

  imageSmall: {
    width: '100%',
    height: 60,
    resizeMode: 'cover',
    top: heightPercentageToDP(1),
    borderRadius: 12,
  },

  title: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E2E2E',
    width: '90%',
    textAlign: 'center',
    fontFamily: Fonts.Anciza_Medium_Italic,
  },

  bannertittle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2E2E',
    fontFamily: Fonts.Anciza_Medium_Italic,
  },
  button: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 4,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  buttonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryCard: {
    backgroundColor: '#F1F4C3',
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  largeCard: {
    height: 240,
  },
  moveToWishlistText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  categoryImage: {
    width: '100%',
    height: 90,
    resizeMode: 'contain',
    marginVertical: 8,
  },
  categoryTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 12,
    color: '#4CAF50',
  },
  imageBackground: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },

  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  oldPrice: {
    textDecorationLine: 'line-through',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  priceBadge: {
    backgroundColor: '#D4E157',
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  price: {
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginVertical: heightPercentageToDP(1),
    fontFamily: 'REDHATDISPLAY-ITALIC',
  },

  freqCard: {
    padding: 10,
    backgroundColor: '#F4F1E8',
    borderRadius: 10,
  },
  freqImage: {
    width: 60,
    height: 60,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  freqText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '700',
    width: CARD_WIDTH - 30,
  },

  featuredCard: {
    width: 110,
    // height: 130,
    borderRadius: 10,
    marginRight: 12,
    padding: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#236FE3',
  },
  featuredImage: {
    width: '100%',
    height: heightPercentageToDP(13),
    borderRadius: 10,
    resizeMode: 'cover',
  },
  tag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#8BC34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
  },

  /* New small card styles */
  smallCard: {
    borderRadius: 8,
    padding: 8,
    marginRight: 10,
  },
  smallImage: {
    width: '100%',
    height: SMALL_CARD_WIDTH - 0,
    resizeMode: 'cover',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  smallTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  smallPrice: {
    fontWeight: '700',
    fontSize: 11,
    color: '#333',
  },
  smallOldPrice: {
    textDecorationLine: 'line-through',
    color: '#999',
    marginLeft: 8,
    fontSize: 9,
  },

  /* Wishlist / recommended cards */
  wishlistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    alignItems: 'flex-start',
  },
  wishlistImage: {
    width: '100%',
    height: WISHLIST_CARD_WIDTH - 0,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  wishlistTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },

  /* Pagination dots */
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: '#DDD',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#AEB254',
    width: 30,
    height: 6,
    borderRadius: 6,
  },

  productCard: {
    width: 160,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  productContainer: {
    flex: 1,
    padding: 12,
  },

  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
  },

  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FF3E6C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },

  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.Anciza_Medium_Italic,
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 6,
    lineHeight: 18,
    fontFamily: Fonts.Anciza_Medium_Italic,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },

  currentPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
    marginRight: 8,
  },

  originalPrice: {
    fontSize: 12,
    color: '#878787',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },

  discountPercent: {
    fontSize: 11,
    color: '#388E3C',
    fontWeight: '600',
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },

  star: {
    fontSize: 12,
    color: '#FFD700',
  },

  ratingCount: {
    fontSize: 11,
    color: '#878787',
  },

  deliveryBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  deliveryText: {
    fontSize: 10,
    color: '#212121',
    fontWeight: '500',
  },
});
