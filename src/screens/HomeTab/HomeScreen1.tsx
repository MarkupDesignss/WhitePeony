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
import LinearGradient from 'react-native-linear-gradient';
import { UserData, UserDataContext } from '../../context/userDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginModal from '../../components/LoginModal';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
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
              <Text style={styles.bannertittle}>White Peony Tea Co</Text>
              <Text
                style={[styles.bannertittle, { fontSize: 18, marginTop: 7 }]}
              >
                {item?.title}
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() =>
                  navigation.navigate('ProductDetails', {
                    productId: item.product_id,
                  })
                }
              >
                <Text style={styles.buttonText}>Shop Now</Text>
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

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: heightPercentageToDP(3),
          paddingHorizontal: widthPercentageToDP(3),
        }}
      >
        <View />
        <Image
          source={require('../../assets/peony_logo.png')}
          style={{ width: 140, height: 25, resizeMode: 'contain', left: 10 }}
        />
        <TouchableOpacity
          onPress={() =>
            isLoggedIn
              ? navigation.navigate('EditProfile')
              : setModalVisible(true)
          }
        >
          <View
            style={{
              borderColor: '#A7A7A7',
              borderWidth: 1,
              borderRadius: 20,
              padding: 5,
              marginRight: 10,
            }}
          >
            <Image
              source={require('../../assets/userx.png')}
              style={{ width: 15, height: 15, resizeMode: 'cover' }}
            />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#FFFFF0' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            // onRefresh={onRefresh}
            colors={['#2E2E2E']}
            tintColor="#2E2E2E"
          />
        }
      >
        {/* Search Bar */}
        <TouchableOpacity onPress={() => navigation.navigate('Searchpage')}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderColor: '#A7A7A7',
              borderWidth: 1,
              borderRadius: 30,
              height: 50,
              backgroundColor: '#fff',
              marginHorizontal: widthPercentageToDP(3),
            }}
          >
            <Image
              source={require('../../assets/Searchx.png')}
              style={{
                width: 20,
                height: 20,
                resizeMode: 'contain',
                marginLeft: 10,
                alignSelf: 'center',
              }}
            />
            <Text
              style={{
                alignSelf: 'center',
                color: '#A7A7A7',
                fontSize: 16,
                flex: 1,
                marginLeft: 10,
              }}
            >
              Search "Products"
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: '#A7A7A7',
                marginVertical: 8,
                right: 10,
              }}
            />
            <Image
              source={require('../../assets/micx.png')}
              style={{
                width: 20,
                height: 20,
                resizeMode: 'contain',
                marginRight: 10,
                alignSelf: 'center',
              }}
            />
          </View>
        </TouchableOpacity>

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
          >
            <FlatList
              data={category}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => {
                const isActive = item?.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategoryId(item.id);
                      GetCategoryIDWithoutLoader(item.id);
                    }}
                    style={{ alignItems: 'center', marginHorizontal: 10 }}
                  >
                    <Image
                      source={{ uri: Image_url + item?.icon }}
                      style={{
                        width: 25,
                        height: 25,
                        resizeMode: 'cover',
                        opacity: isActive ? 1 : 0.35,
                        transform: [{ scale: isActive ? 1.05 : 1 }],
                      }}
                    />
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 12,
                        marginTop: heightPercentageToDP(1),
                        color: isActive ? '#000' : '#A7A7A7',
                      }}
                    >
                      {item?.name}
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        height: 3,
                        width: 30,
                        borderRadius: 4,
                        backgroundColor: isActive ? '#2E2E2E' : 'transparent',
                      }}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          <View
            style={{
              borderWidth: 0.7,
              borderColor: '#A7A7A7',
              width: widthPercentageToDP(111),
              paddingHorizontal: 0,
              marginTop: heightPercentageToDP(-2.2),
            }}
          />
          {/* Categories Grid */}
          {/* Categories Grid */}
          // Update the Categories Grid section with this code:
          {isLoadingCategory ? (
            <View style={styles.container}>
              <View style={[styles.row, { justifyContent: 'center' }]}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    backgroundColor: '#EFEFCA',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: BIG_HEIGHT,
                  }}
                >
                  <Text style={[styles.title, { marginTop: 10 }]}>
                    Loading products...
                  </Text>
                </View>
              </View>
            </View>
          ) : Array.isArray(categoryProduct) && categoryProduct.length > 0 ? (
            <View style={styles.container}>
              {/* Calculate available products count */}
              {(() => {
                const availableProducts = categoryProduct.filter(
                  item => item && item.id && item.name,
                );

                // If no products available after filtering
                if (availableProducts.length === 0) {
                  return (
                    <View
                      style={{
                        borderRadius: 12,
                        backgroundColor: '#EFEFCA',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: BIG_HEIGHT,
                        padding: 20,
                      }}
                    >
                      <Text
                        style={[
                          styles.title,
                          { fontSize: 16, marginBottom: 10 },
                        ]}
                      >
                        No Products Found
                      </Text>
                      <Text
                        style={[
                          styles.title,
                          { color: '#666', textAlign: 'center' },
                        ]}
                      >
                        Try selecting a different category or check back later.
                      </Text>
                    </View>
                  );
                }

                // Function to get product at index safely
                const getProductAt = (index: number) => {
                  return availableProducts[index] || null;
                };

                // Count available products
                const hasProduct1 = getProductAt(0) !== null;
                const hasProduct2 = getProductAt(1) !== null;
                const hasProduct3 = getProductAt(2) !== null;
                const hasProduct4 = getProductAt(3) !== null;
                const hasProduct5 = getProductAt(4) !== null;

                // Calculate layout based on available products
                const smallCardsCount = [
                  hasProduct2,
                  hasProduct3,
                  hasProduct4,
                  hasProduct5,
                ].filter(Boolean).length;

                let layoutHeight = BIG_HEIGHT;

                // Adjust height based on number of small cards
                if (smallCardsCount === 0 && hasProduct1) {
                  // Only big card exists
                  layoutHeight = BIG_HEIGHT;
                } else if (smallCardsCount <= 2) {
                  // Some small cards missing, reduce height
                  layoutHeight = BIG_HEIGHT * 0.75;
                }

                return (
                  <View style={[styles.row, { height: layoutHeight }]}>
                    {/* Big Card (Only render if product exists) */}
                    {hasProduct1 ? (
                      <LinearGradient
                        colors={['#EFEFCA', '#E2E689']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={{ flex: 1, borderRadius: 12 }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate('ProductDetails', {
                              productId: availableProducts[0].id,
                            })
                          }
                        >
                          <View style={[styles.card, { height: '100%' }]}>
                            <Text style={{ ...styles.title }}>All</Text>
                            <Text
                              numberOfLines={2}
                              style={[
                                styles.title,
                                { color: '#000', marginTop: 8 },
                              ]}
                            >
                              {availableProducts[0]?.name || 'Product'}
                            </Text>
                            {availableProducts[0]?.variants?.[0]?.price && (
                              <>
                                <View
                                  style={{
                                    borderRadius: 4,
                                    backgroundColor: '#5f621a',

                                    alignSelf: 'center',
                                    padding: 5,
                                    justifyContent: 'center',
                                    marginTop: 10,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontWeight: '700',
                                      fontSize: 12,
                                      alignSelf: 'center',
                                      color: '#fff',
                                      textDecorationLine: 'line-through',
                                      textAlignVertical: 'center',
                                    }}
                                  >
                                    {displayPrice(
                                      availableProducts[0]?.variants?.[0]
                                        ?.price,
                                    )}
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    borderRadius: 4,
                                    backgroundColor: '#E0CB54',

                                    alignSelf: 'center',
                                    marginTop: 10,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontWeight: '700',
                                      fontSize: 12,
                                      alignSelf: 'center',
                                      padding: 5,
                                      color: '#000',
                                    }}
                                  >
                                    {displayPrice(
                                      availableProducts[0]?.variants?.[0]
                                        ?.actual_price || 0,
                                    )}
                                  </Text>
                                </View>
                              </>
                            )}
                            {availableProducts[0]?.front_image ? (
                              <Image
                                source={{
                                  uri:
                                    Image_url +
                                    availableProducts[0]?.front_image,
                                }}
                                style={styles.imageBig}
                              />
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      </LinearGradient>
                    ) : (
                      // Empty big card placeholder
                      <LinearGradient
                        colors={['#EFEFCA', '#E2E689']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={{
                          flex: 1,
                          borderRadius: 12,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={styles.title}>No Product Available</Text>
                      </LinearGradient>
                    )}

                    {/* Right side small cards */}
                    <View style={styles.stack}>
                      {/* First column */}
                      <View
                        style={{
                          justifyContent: 'space-between',
                          gap: 8,
                          flex: 1,
                        }}
                      >
                        {hasProduct2 ? (
                          <LinearGradient
                            key={`first-${availableProducts[1].id}`}
                            colors={['#EFEFCA', '#E2E689']}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={{ flex: 1, borderRadius: 12 }}
                          >
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate('ProductDetails', {
                                  productId: availableProducts[1].id,
                                })
                              }
                              style={{ flex: 1 }}
                            >
                              <View style={[styles.card, { height: '100%' }]}>
                                <Text numberOfLines={2} style={styles.title}>
                                  {availableProducts[1].name}
                                </Text>
                                <Image
                                  source={{
                                    uri:
                                      Image_url +
                                      availableProducts[1].front_image,
                                  }}
                                  style={styles.imageSmall}
                                />
                              </View>
                            </TouchableOpacity>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1 }} /> // Empty space
                        )}

                        {hasProduct3 ? (
                          <LinearGradient
                            key={`second-${availableProducts[2].id}`}
                            colors={['#EFEFCA', '#E2E689']}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={{ flex: 1, borderRadius: 12 }}
                          >
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate('ProductDetails', {
                                  productId: availableProducts[2].id,
                                })
                              }
                              style={{ flex: 1 }}
                            >
                              <View style={[styles.card, { height: '100%' }]}>
                                <Text numberOfLines={2} style={styles.title}>
                                  {availableProducts[2].name}
                                </Text>
                                <Image
                                  source={{
                                    uri:
                                      Image_url +
                                      availableProducts[2].front_image,
                                  }}
                                  style={styles.imageSmall}
                                />
                              </View>
                            </TouchableOpacity>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1 }} /> // Empty space
                        )}
                      </View>

                      {/* Second column */}
                      <View
                        style={{
                          justifyContent: 'space-between',
                          gap: 8,
                          flex: 1,
                        }}
                      >
                        {hasProduct4 ? (
                          <LinearGradient
                            key={`third-${availableProducts[3].id}`}
                            colors={['#EFEFCA', '#E2E689']}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={{ flex: 1, borderRadius: 12 }}
                          >
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate('ProductDetails', {
                                  productId: availableProducts[3].id,
                                })
                              }
                              style={{ flex: 1 }}
                            >
                              <View style={[styles.card, { height: '100%' }]}>
                                <Text numberOfLines={2} style={styles.title}>
                                  {availableProducts[3].name}
                                </Text>
                                <Image
                                  source={{
                                    uri:
                                      Image_url +
                                      availableProducts[3].front_image,
                                  }}
                                  style={styles.imageSmall}
                                />
                              </View>
                            </TouchableOpacity>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1 }} /> // Empty space
                        )}

                        {hasProduct5 ? (
                          <LinearGradient
                            key={`fourth-${availableProducts[4].id}`}
                            colors={['#EFEFCA', '#E2E689']}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={{ flex: 1, borderRadius: 12 }}
                          >
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate('ProductDetails', {
                                  productId: availableProducts[4].id,
                                })
                              }
                              style={{ flex: 1 }}
                            >
                              <View style={[styles.card, { height: '100%' }]}>
                                <Text numberOfLines={2} style={styles.title}>
                                  {availableProducts[4].name}
                                </Text>
                                <Image
                                  source={{
                                    uri:
                                      Image_url +
                                      availableProducts[4].front_image,
                                  }}
                                  style={styles.imageSmall}
                                />
                              </View>
                            </TouchableOpacity>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1 }} /> // Empty space
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}
            </View>
          ) : (
            // No products at all
            <View style={styles.container}>
              <View
                style={{
                  borderRadius: 12,
                  backgroundColor: '#EFEFCA',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: BIG_HEIGHT,
                  padding: 20,
                }}
              >
                <Text
                  style={[styles.title, { fontSize: 16, marginBottom: 10 }]}
                >
                  No Products Found
                </Text>
                <Text
                  style={[styles.title, { color: '#666', textAlign: 'center' }]}
                >
                  Try selecting a different category or check back later.
                </Text>
              </View>
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
                <Text style={styles.sectionTitle}>Frequently Bought</Text>
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
                          <Text style={styles.freqText}>
                            {item?.items[0]?.product?.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            ) : null}

            {/* Featured This Week */}
            <Text style={styles.sectionTitle}>Featured This Week</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={FeaturesProduct}
              keyExtractor={(item, index) =>
                item?.id ? String(item.id) : String(index)
              }
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    style={styles.productCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('ProductDetails', {
                        productId: item?.product?.id,
                      })
                    }
                  >
                    <View style={styles.productContainer}>
                      <Image
                        source={{ uri: Image_url + item?.product?.front_image }}
                        style={styles.productImage}
                        resizeMode="contain"
                      />

                      {/* Sale/Discount Tag */}
                      {item.tag && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>{item.tag}</Text>
                        </View>
                      )}

                      {/* Product Info Container */}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {item.product?.name || 'Product Name'}
                        </Text>

                        {/* Price Container */}
                        <View style={styles.priceContainer}>
                          <Text style={styles.currentPrice}>
                            {displayPrice(
                              Math.round(item.product.price_range.min || 0),
                            )}{' '}
                            -{' '}
                            {displayPrice(
                              Math.round(item.product.price_range.max || 0),
                            )}
                          </Text>
                          {item.product?.originalPrice && (
                            <Text style={styles.originalPrice}>
                              {displayPrice(item.product.originalPrice)}
                            </Text>
                          )}
                          {item.product?.discount && (
                            <Text style={styles.discountPercent}>
                              {item.product.discount}% off
                            </Text>
                          )}
                        </View>

                        {/* Rating */}
                        <View style={styles.ratingContainer}>
                          <View style={styles.stars}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Text key={star} style={styles.star}>
                                ★
                              </Text>
                            ))}
                          </View>
                          <Text style={styles.ratingCount}>
                            ({item.product?.ratingCount || '4.2'})
                          </Text>
                        </View>

                        {/* Quick Delivery Badge */}
                        {item.product?.fastDelivery && (
                          <View style={styles.deliveryBadge}>
                            <Text style={styles.deliveryText}>
                              Free Delivery
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          {/* Big Sale Section */}
          {salesProduct.length > 0 && (
            <View
              style={{
                width: '100%',
                height: heightPercentageToDP(30),
                marginTop: 20,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#fecf5d',
              }}
            >
              <Image
                source={require('../../assets/bg3x.png')}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />
              <View
                style={{ position: 'absolute', top: 10, alignItems: 'center' }}
              >
                <Image
                
                  source={require('../../assets/bigsales.png')}
                  style={{ width: 75, height: 65, resizeMode: 'contain' }}
                />
                <Text
                  style={{ fontSize: 12, fontWeight: '700', marginTop: 15 }}
                >
                  {formatDate(salesProduct[0]?.start_date).slice(0, 13)} -{' '}
                  {formatDate(salesProduct[0]?.end_date).slice(0, 13)}
                </Text>
                <FlatList
                  data={salesProduct}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => String(index)}
                  renderItem={({ item }) => {
                    return (
                      <TouchableOpacity
                        style={{
                          borderWidth: 1,
                          marginLeft: 10,
                          marginTop: heightPercentageToDP(2),
                          borderColor: 'lightgrey',
                          borderRadius: 8,
                        }}
                        onPress={() =>
                          navigation.navigate('ProductDetails', {
                            productId: item?.product?.id,
                          })
                        }
                      >
                        <View
                          style={{
                            borderRadius: 8,
                            alignItems: 'center',
                            backgroundColor: '#FFEEBC',
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: '#FFFFFF',

                              height: 17,
                              borderRadius: 8,
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 8,
                                fontWeight: '700',
                                alignSelf: 'center',
                                padding: 2,
                              }}
                            >
                              Upto {item?.percentage}% Off
                            </Text>
                          </View>
                          <Image
                            resizeMode="contain"
                            source={{
                              uri: Image_url + item?.product?.front_image,
                            }}
                            style={{
                              width: 70,
                              height: 80,
                              resizeMode: 'cover',
                              marginTop: 5,
                              borderRadius: 8,
                            }}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>
          )}
          {/* Lowest Prices Ever */}
          <View
            style={{
              width: '100%',
              marginVertical: heightPercentageToDP(0),
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Image
              source={require('../../assets/Subtraction2.png')}
              style={{
                width: '100%',
                height: heightPercentageToDP(40),
                resizeMode: 'cover',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 10,
                paddingHorizontal: widthPercentageToDP(3),
              }}
            >
              <Text style={[styles.sectionTitle, { alignSelf: 'center' }]}>
                LOWEST PRICES EVER
              </Text>
              <FlatList
                data={lowestitem}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => String(index)}
                // In your HomeScreen1.tsx, replace the Lowest Prices Ever FlatList renderItem with this:

                renderItem={({ item }) => {
                  const wished = isWishlisted(item.id);

                  // Extract price information
                  const getPriceInfo = (product: any) => {
                    if (!product)
                      return { discountedPrice: null, originalPrice: null };

                    // Get the discounted price (actual_price)
                    let discountedPrice = null;
                    if (
                      product?.variants?.[0]?.actual_price !== undefined &&
                      product?.variants?.[0]?.actual_price !== null
                    ) {
                      discountedPrice = product.variants[0].actual_price;
                    }

                    // Get the original price (price)
                    let originalPrice = null;
                    if (
                      product?.variants?.[0]?.price !== undefined &&
                      product?.variants?.[0]?.price !== null
                    ) {
                      originalPrice = product.variants[0].price;
                    }

                    // If no discounted price but we have main_price, use that as original
                    if (
                      !discountedPrice &&
                      !originalPrice &&
                      product?.main_price
                    ) {
                      originalPrice = product.main_price;
                    }

                    // If we have discounted price but no original, use main_price as original
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

                  return (
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('ProductDetails', {
                          productId: item.id,
                        })
                      }
                    >
                      <View
                        style={[styles.smallCard, { width: SMALL_CARD_WIDTH }]}
                      >
                        <Image
                          source={{ uri: Image_url + item?.front_image }}
                          style={styles.smallImage}
                        />
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.smallTitle,
                            { height: heightPercentageToDP(4) },
                          ]}
                        >
                          {item?.name}
                        </Text>

                        {/* PRICE DISPLAY - Updated with currency conversion */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 4,
                            minHeight: 20,
                          }}
                        >
                          {hasDiscount ? (
                            <>
                              <Text
                                style={[
                                  styles.smallPrice,
                                  { color: '#2E2E2E', fontWeight: '700' },
                                ]}
                              >
                                {displayPrice(discountedPrice)}
                              </Text>
                              <Text
                                style={[
                                  styles.smallOldPrice,
                                  { marginLeft: 8 },
                                ]}
                              >
                                {displayPrice(originalPrice)}
                              </Text>
                            </>
                          ) : originalPrice ? (
                            <Text
                              style={[
                                styles.smallPrice,
                                { color: '#2E2E2E', fontWeight: '700' },
                              ]}
                            >
                              {displayPrice(originalPrice)}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 12, color: '#666' }}>
                              Price not available
                            </Text>
                          )}
                        </View>

                        <View
                          style={{
                            backgroundColor: '#EAE6B9',
                            borderRadius: 4,
                            marginVertical: 10,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            paddingVertical: 5,
                            paddingHorizontal: 3,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: '#000' }}>
                            see more like this{' '}
                            <Text style={{ color: '#008009' }}>▶</Text>{' '}
                          </Text>
                        </View>

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
                            top: heightPercentageToDP(1.5),
                            right: widthPercentageToDP(4),
                            backgroundColor: Colors.button[100],
                            padding: 6,
                            borderRadius: 12,
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
                            }}
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('Category')}
              >
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    height: 40,
                    width: widthPercentageToDP(90),
                    alignSelf: 'center',
                  }}
                >
                  <Image
                    source={require('../../assets/Png/Ellipse.png')}
                    style={{
                      width: 14,
                      height: 14,
                      alignSelf: 'center',
                      right: 10,
                    }}
                  />
                  <Text
                    style={[
                      styles.moveToWishlistText,
                      { alignSelf: 'center', color: '#000' },
                    ]}
                  >
                    See all products
                  </Text>
                  <Image
                    source={require('../../assets/Png/next.png')}
                    style={{
                      width: 12,
                      height: 12,
                      alignSelf: 'center',
                      left: 10,
                      tintColor: '#000000',
                    }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          // Wishlist Section - Replace your current wishlist section with this
          {wishlistItems && wishlistItems.length > 0 ? (
            <View
              style={{
                paddingHorizontal: widthPercentageToDP(3),
                marginTop: heightPercentageToDP(2),
              }}
            >
              <Text style={styles.sectionTitle}>
                Your Wishlist ({wishlistItems.length})
              </Text>

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
                          numberOfLines={2}
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
                          <Text
                            style={{
                              fontSize: 12,
                              color: '#666',
                              marginTop: 4,
                            }}
                          >
                            Loading price...
                          </Text>
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
              <Text style={styles.sectionTitle}>Your Wishlist (0)</Text>
              <View
                style={{
                  padding: 20,
                  alignItems: 'center',
                  backgroundColor: '#F9F9F9',
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#666', marginBottom: 10 }}>
                  No items in your wishlist
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('CategoryScreen')}
                  style={{
                    backgroundColor: '#2E2E2E',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    Browse Products →
                  </Text>
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
          <View
            style={{
              paddingHorizontal: widthPercentageToDP(3),
              marginTop: heightPercentageToDP(2),
              marginBottom: heightPercentageToDP(4),
            }}
          >
            <Text style={styles.sectionTitle}>Recommended For You</Text>
            <FlatList
              ref={recRef}
              data={apiRecommend}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              snapToInterval={WISHLIST_CARD_WIDTH + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: 8 }}
              onScroll={onRecommendedScroll}
              renderItem={({ item }) => {
                const wished = isWishlisted(item.id);
                const correctPrice = getCorrectPrice(item);

                return (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ProductDetails', {
                        productId: item.id,
                      })
                    }
                  >
                    <View
                      style={[
                        styles.wishlistCard,
                        { width: WISHLIST_CARD_WIDTH },
                      ]}
                    >
                      <Image
                        source={{ uri: Image_url + item?.front_image }}
                        style={styles.wishlistImage}
                      />
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.wishlistTitle,
                          {
                            fontWeight: '400',
                            height: heightPercentageToDP(4),
                          },
                        ]}
                      >
                        {item?.name}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Text style={styles.smallPrice}>
                          {displayPrice(
                            item.variants[0]?.actual_price ||
                              item.variants[0]?.price,
                          )}
                        </Text>
                        {item.variants[0]?.price && (
                          <Text style={styles.smallOldPrice}>
                            {displayPrice(item.variants[0]?.price)}
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={async () => {
                          if (isWishlisted(item.id)) {
                            await removeFromWishlist(item.id);
                          } else {
                            await addToWishlist(item.id);
                          }
                        }}
                        activeOpacity={0.7}
                        style={{
                          position: 'absolute',
                          top: heightPercentageToDP(1.5),
                          right: widthPercentageToDP(4),
                          backgroundColor: Colors.button[100],
                          padding: 6,
                          borderRadius: 12,
                          width: 20,
                          height: 20,
                          justifyContent: 'center',
                        }}
                      >
                        <Image
                          source={
                            isWishlisted(item.id)
                              ? require('../../assets/heart.png') // Filled heart (wishlisted)
                              : require('../../assets/Png/heart-1.png') // Outline heart (not wishlisted)
                          }
                          style={{
                            position: 'absolute',
                            width: 12,
                            height: 12,
                            alignSelf: 'center',
                            resizeMode: 'cover',
                          }}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Dots */}
            <View style={styles.dotsContainer}>
              {Array.isArray(apiRecommend) &&
                apiRecommend.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, activeRec === i && styles.activeDot]}
                  />
                ))}
            </View>
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

export default HomeScreen1;

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
    fontSize: 14,
    color: '#333',
  },
  smallOldPrice: {
    textDecorationLine: 'line-through',
    color: '#999',
    marginLeft: 8,
    fontSize: 12,
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
    fontSize: 13,
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
