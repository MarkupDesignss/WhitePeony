import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import LoginModal from '../../components/LoginModal';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import Toast from 'react-native-toast-message';
import AddressModal from '../../components/AddressModal';
import { useFocusEffect } from '@react-navigation/native';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../../constant/dimentions';
import { useCart } from '../../context/CartContext';
import { WebView } from 'react-native-webview';
import { Colors, Images } from '../../constant';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import { calculateCheckout } from '../../utils/checkoutCalculator';
const SCREEN_WIDTH = Dimensions.get('window').width;

type DisplayWishlistItem = {
  id: string; // product id
  wishlistItemId: string;
  name: string;
  price: string;
  image: string | null;
  unit?: string;
};

type CartItem = {
  id?: string;
  product_id: number | string;
  front_image?: string;
  product_name?: string;
  variant_sku?: string;
  total_price?: number;
  actual_price?: number;
  quantity: number;
  variants?: { variant_id?: number | string }[];
  variant_id?: number | string; // Make sure this exists
  name?: string;
  unit?: string;
};

type Address = {
  id: string | number;
  address_type?: string;
  name?: string;
  full_address?: string;
  phone?: string;
  postal_code?: string | number;
  city?: string;
  email?: string;
};

const CheckoutScreen = ({ navigation }: { navigation: any }) => {
  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency
  );

  // Fetch rates with caching
  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });

  // Price display helper
  const displayPrice = (priceEUR: any): string => {
    return convertAndFormatPrice(priceEUR, selectedCurrency, rates);
  };

  const {
    addToCart,
    removeFromCart,
    getCartDetails,
    syncCartAfterLogin,
    cart,
  } = useCart();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAddress, setModalAddress] = useState(false);
  const [modalAddressADD, setmodalAddressADD] = useState(false);
  const [items, setItems] = useState<DisplayWishlistItem[]>([]);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const { showLoader, hideLoader } = CommonLoader();
  const [cartData, setApiCartData] = useState<any>({
    items: [],
    total_amount: 0,
    id: null,
  });
  const [cartid, setcartid] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);

  // Shipping state
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(
    null,
  );
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);

  const [promoOptions, setPromoOptions] = useState<any[]>([]);
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState({
    code: '',
    type: '',
    discount: '',
    max_discount: '',
  });
  const [isFetchingPromo, setIsFetchingPromo] = useState(false);

  ///coupans code
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Calculate shipping cost
  const getShippingCost = () => {
    if (selectedShippingId && shippingOptions.length > 0) {
      const selectedShipping = shippingOptions.find(
        s => Number(s.id) === Number(selectedShippingId)
      );
      return selectedShipping?.cost || 0;
    }
    return 0;
  };

  // Calculate checkout breakdown
  const checkoutBreakdown = calculateCheckout(
    cartData?.subtotal_amount || 0,
    cartData?.total_savings || 0,
    discountAmount || 0,
    getShippingCost(), // Get actual shipping cost
    selectedCurrency,
    rates
  );

  const recalculateCoupon = () => {
    const total = Number(cartData?.discounted_total || 0);

    const discountType = String(selectedPromoCode.type).toLowerCase();
    const discountValue = Number(selectedPromoCode.discount || 0);
    const maxDiscount = Number(selectedPromoCode.max_discount || 0);

    let calculatedDiscount = 0;

    if (discountType === 'percentage') {
      calculatedDiscount = (total * discountValue) / 100;
      if (maxDiscount > 0 && calculatedDiscount > maxDiscount) {
        calculatedDiscount = maxDiscount;
      }
    } else {
      calculatedDiscount = discountValue;
    }

    calculatedDiscount = Math.min(calculatedDiscount, total);

    setDiscountAmount(Math.round(calculatedDiscount * 100) / 100);
  };

  useEffect(() => {
    if (appliedPromo && selectedPromoCode?.code) {
      recalculateCoupon();
    }
  }, [cartData?.discounted_total]);

  // Add useEffect to sync when cart context changes
  useEffect(() => {
    const syncCart = async () => {
      console.log('Cart context changed, syncing checkout...');
      await GetCartDetails();
    };
    syncCart();
  }, [cart.length]); // Trigger when cart items count changes

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await UserService.wishlist();
        const apiWishlist = res?.data?.data || [];
        setItems(apiWishlist);
      } catch (e) {
        const error = e as any;
        if (error.status === 401) {
          console.log('Unauthorized access - perhaps token expired');
        } else {
          console.log('error fetching wishlist', error);
        }
      }
    };

    const fetchInitialData = async () => {
      await Promise.all([
        fetchWishlist(),
        Getshiping(),
        GetCartDetails(), // Fetch cart on initial load
      ]);
    };

    fetchInitialData();
  }, []);

  const moveToWishlist = (itemId: string | number | undefined) => {
    Alert.alert('Moved to wishlist', `Item ID: ${itemId}`);
  };

  const UpdateCart = async (item: CartItem, change: number) => {
    console.log('UpdateCart called with item:', item, 'change:', change);
    showLoader();
    try {
      const currentQty = Number(item.quantity);
      const newQty = currentQty + change;

      if (newQty < 1)
        return Toast.show({ type: 'info', text1: 'Minimum quantity is 1' });
      if (newQty > 99)
        return Toast.show({ type: 'info', text1: 'Maximum quantity is 99' });

      // The payload should match what your backend expects
      const payload = {
        product_id: item.product_id,
        quantity: newQty,
        variant_id: item.variant_id || item.variants?.[0]?.variant_id || null,
      };

      console.log('UpdateCart payload:', payload);

      const res = await UserService.UpdateCart(payload);
      hideLoader();

      if (res?.data?.success === true) {
        Toast.show({
          type: 'success',
          text1: res.data?.message || 'Cart updated!',
        });
        console.log('UpdateCart response:', res?.data);
        await GetCartDetails(); // Refresh cart after update
      } else {
        console.log('errcheckout', res?.data);
        Toast.show({ type: 'error', text1: 'Failed to update cart' });
      }
    } catch (err: any) {
      console.log('errcheckout', JSON.stringify(err));
      hideLoader();
      Toast.show({
        type: 'error',
        text1:
          err?.response?.data?.message ||
          'Something went wrong! Please try again.',
      });
    }
  };
  const renderRightActions = (item: CartItem) => {
    console.log('DEBUG - Item structure for removal:', {
      product_id: item.product_id,
      variant_id: item.variant_id,
      variants: item.variants,
      fullItem: JSON.stringify(item, null, 2),
    });

    return (
      <TouchableOpacity
        onPress={async () => {
          try {
            showLoader();

            // Extract product ID - handle both string and number
            const productId = parseInt(String(item.product_id), 10);

            // Extract variant ID from multiple possible locations
            let variantId: number | null = null;

            // Check different possible locations for variant_id
            if (item.variant_id !== undefined && item.variant_id !== null) {
              variantId = parseInt(String(item.variant_id), 10);
              console.log(
                'DEBUG - Found variant_id in item.variant_id:',
                variantId,
              );
            }
            // Check variants[0].variant_id
            else if (item.variants?.[0]?.variant_id) {
              variantId = parseInt(String(item.variants[0].variant_id), 10);
              console.log(
                'DEBUG - Found variant_id in variants[0].variant_id:',
                variantId,
              );
            }
            // Check variants[0].id (sometimes it's just 'id')
            else if (item.variants?.[0]?.id) {
              variantId = parseInt(String(item.variants[0].id), 10);
              console.log(
                'DEBUG - Found variant_id in variants[0].id:',
                variantId,
              );
            }

            console.log('DEBUG - Final extracted IDs:', {
              productId,
              variantId,
            });

            if (isNaN(productId)) {
              console.error('ERROR - Invalid productId:', productId);
              Toast.show({ type: 'error', text1: 'Invalid product ID' });
              return;
            }

            await removeFromCart(productId, variantId);
          } catch (err: any) {
            console.log('DEBUG - Remove button error details:', {
              message: err.message,
              response: err.response?.data,
              status: err.response?.status,
              stack: err.stack,
            });
            Toast.show({
              type: 'error',
              text1: 'Failed to remove item',
              text2: err.message || 'Please try again',
            });
          } finally {
            hideLoader();
          }
        }}
        style={styles.deleteBox}
      >
        <Image
          source={require('../../assets/Png/delete.png')}
          style={{ width: 28, height: 28, tintColor: '#000' }}
        />
      </TouchableOpacity>
    );
  };

  const renderShipmentItem = ({ item }: { item: CartItem }) => {
    // Convert prices to numbers for comparison
    const actualPriceNum = parseFloat(item.actual_price || '0');
    const totalPriceNum = parseFloat(item.total_price || '0');
    const hasDiscount = totalPriceNum > actualPriceNum;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <View style={styles.shipmentItemCard}>
          <Image
            source={{ uri: Image_url + item.front_image }}
            style={styles.shipmentImage}
          />

          <View
            style={{
              width: widthPercentageToDP(65),
              left: widthPercentageToDP(5),
            }}
          >
            <Text style={styles.shipmentName}>
              {item.product_name || item.name}
            </Text>
            <Text style={styles.shipmentWeight}>{item?.unit || null}</Text>

            <TouchableOpacity
              onPress={() => moveToWishlist(item.id)}
              style={styles.moveToWishlistBtn}
            >
              <Text style={styles.moveToWishlistText}>Move to wishlist</Text>
            </TouchableOpacity>

            {/* Price display - show discount if available */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              {/* Discounted price (actual price) */}
              <Text style={styles.shipmentActualPrice}>
                {displayPrice(actualPriceNum)}
              </Text>

              {/* Original price with strikethrough if discount exists */}
              {hasDiscount && (
                <>
                  <Text style={styles.shipmentOriginalPrice}>
                    {displayPrice(totalPriceNum)}
                  </Text>
                  {/* Show savings amount */}
                  {/* <Text style={styles.savingsText}>
                    Save {(totalPriceNum - actualPriceNum).toFixed(2)} €
                  </Text> */}
                </>
              )}
            </View>

            <View style={styles.qtyControlContainer}>
              <TouchableOpacity
                onPress={() => UpdateCart(item, -1)}
                disabled={item.quantity <= 1}
                style={styles.qtyBtn}
              >
                <Image
                  source={require('../../assets/Png/minus.png')}
                  style={{ width: 20, height: 20 }}
                />
              </TouchableOpacity>

              <Text style={styles.qtyText}>{item.quantity}</Text>

              <TouchableOpacity
                onPress={() => UpdateCart(item, +1)}
                style={styles.qtyBtn}
              >
                <Image
                  source={require('../../assets/Png/add.png')}
                  style={{ width: 20, height: 20 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderSuggestionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('ProductDetails', {
          productId: item.product_id || item.id,
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.suggestionCard}>
        <Image
          source={
            item.image
              ? { uri: Image_url + item.image }
              : require('../../assets/Png/product.png')
          }
          style={styles.suggestionImage}
        />
        <Text style={styles.suggestionName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 0 }}>
          {[1, 2, 3, 4, 5].map(r => {
            const isFull = item?.average_rating >= r;
            const isHalf =
              item?.average_rating >= r - 0.5 && item?.average_rating < r;
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
        <Text style={styles.suggestionPrice}>
          {item?.variants?.[0]?.unit || item?.unit}
        </Text>
        <Text style={[styles.suggestionPrice, { color: '#000' }]}>
          {displayPrice(item?.variants?.[0]?.price || item?.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // In the SetPromo function, fix the field mapping:
  const SetPromo = () => {
    if (!selectedPromoCode?.code) {
      Toast.show({ type: 'info', text1: 'Please select a coupon first' });
      return;
    }

    const total =
      Number(cartData?.discounted_total) || Number(cartData?.total_amount) || 0;

    // IMPORTANT: Use correct field names from your API response
    const discountType = String(selectedPromoCode.type).toLowerCase(); // "percentage"
    const discountValue = parseFloat(selectedPromoCode.discount); // "10.00" -> 10
    const maxDiscount = parseFloat(selectedPromoCode.max_discount) || Infinity; // "20" -> 20

    let calculatedDiscount = 0;

    if (discountType === 'percentage') {
      calculatedDiscount = (total * discountValue) / 100;

      // Apply max discount limit
      if (maxDiscount && calculatedDiscount > maxDiscount) {
        calculatedDiscount = maxDiscount;
      }
    } else {
      // Fixed amount discount
      calculatedDiscount = discountValue;
    }

    // Ensure discount doesn't exceed total
    if (calculatedDiscount > total) {
      calculatedDiscount = total;
    }

    // Round to 2 decimal places
    calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

    setDiscountAmount(calculatedDiscount);
    setAppliedPromo({
      code: selectedPromoCode.code,
      discountType,
      discountValue,
      maxDiscount
    });

    Toast.show({
      type: 'success',
      text1: `Coupon applied! Saved ${displayPrice(calculatedDiscount)}`
    });
    setPromoModalVisible(false);
  };

  const removeCoupon = () => {
    setSelectedPromoCode({ code: '', type: '', discount: '', max_discount: '' });
    setAppliedPromo(null);
    setDiscountAmount(0);
    Toast.show({ type: 'info', text1: 'Coupon removed.' });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await GetCartDetails();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      GetCartDetails();
      return () => { };
    }, []),
  );

  const GetCartDetails = async () => {
    try {
      setLoadingCart(true);
      const res = await UserService.viewCart();

      if (res && res.data) {
        const cartDataFromResponse = res.data.cart || res.data;

        // Process items with proper price handling
        const processedItems = (cartDataFromResponse?.items || []).map(item => {
          // Extract variant information if available
          const variant = item.variants?.[0] || {};

          // Determine actual price (discounted price)
          let actualPrice =
            variant.actual_price ||
            item.actual_price ||
            variant.price ||
            item.total_price;

          // Determine display price (original price)
          let displayPrice = variant.price || item.total_price;

          // If there's a percentage discount, calculate the original price
          if (variant.percentage && parseFloat(variant.percentage) > 0) {
            // Calculate original price from discounted price and percentage
            const discountPercent = parseFloat(variant.percentage);
            actualPrice = variant.price; // This is the discounted price from API
            displayPrice =
              (parseFloat(actualPrice) * 100) / (100 - discountPercent);
          }

          return {
            ...item,
            actual_price: actualPrice,
            total_price: displayPrice, // This becomes the original/original price
            unit: variant.unit || item.unit,
            variant_id: variant.id || item.variant_id,
          };
        });
        const round = (n: number) => Math.round(n * 100) / 100;
        // Calculate totals with actual prices (discounted prices)
        const discountedTotal = round(
          processedItems.reduce((sum, item) => {
            const price =
              Number(item.actual_price || 0) * Number(item.quantity || 1);
            return sum + price;
          }, 0),
        );

        // Calculate original total (before discounts)
        const originalTotal = round(
          processedItems.reduce((sum, item) => {
            const price =
              Number(item.total_price || 0) * Number(item.quantity || 1);
            return sum + price;
          }, 0),
        );

        const totalSavings = originalTotal - discountedTotal;

        const processedCartData = {
          items: processedItems,
          total_amount: discountedTotal, // Final amount to pay (after discounts)
          subtotal_amount: originalTotal, // Original total before discounts
          discounted_total: discountedTotal,
          total_savings: totalSavings,
          id: cartDataFromResponse?.id || null,
        };

        setApiCartData(processedCartData);
        setcartid(processedCartData?.id);

        console.log('Cart prices calculated:', {
          discountedTotal,
          originalTotal,
          totalSavings,
        });
      } else {
        setApiCartData({ items: [], total_amount: 0, id: null });
      }
    } catch (err: any) {
      console.log('GetCartDetails error', JSON.stringify(err));
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message || 'Failed to fetch cart',
      });
      setApiCartData({ items: [], total_amount: 0, id: null });
    } finally {
      setLoadingCart(false);
      hideLoader();
    }
  };
  const GetPromo = async () => {
    try {
      setIsFetchingPromo(true);

      const res = await UserService.GetPromo_Code();
      const data = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data ?? res?.data;

      setPromoOptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('GetPromo', err);
      Toast.show({ type: 'error', text1: 'Failed to fetch coupons' });
      setPromoOptions([]);
    } finally {
      setIsFetchingPromo(false);
    }
  };

  const Getshiping = async () => {
    try {
      setIsFetchingShipping(true);
      const res = await UserService.Shiping();
      if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? res.data?.error ?? res.data;
        const options = Array.isArray(data) ? data : [];
        setShippingOptions(options);
        const firstActive =
          options.find((o: any) => o.is_active === '1' || o.is_active === 1) ||
          options[0];
        if (firstActive) setSelectedShippingId(Number(firstActive.id));
        return options;
      } else {
        console.log('Getshiping response', res?.data);
        return [];
      }
    } catch (err) {
      console.log('Getshiping error', err);
      return [];
    } finally {
      setIsFetchingShipping(false);
    }
  };

  const PlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('', 'Please, select Address');
      return;
    }

    if (!cartid) {
      Toast.show({ type: 'error', text1: 'Cart is empty' });
      return;
    }

    // Calculate the amount to pay (rounded as shown to user)
    const shippingCost = getShippingCost();
    const breakdown = calculateCheckout(
      cartData?.subtotal_amount || 0,
      cartData?.total_savings || 0,
      discountAmount || 0,
      shippingCost,
      selectedCurrency,
      rates
    );

    // Show currency conversion warning
    if (selectedCurrency !== 'EUR') {
      // Alert.alert(
      //   'Currency Conversion Notice',
      //   `Your order total: ${breakdown.displayAmountToPay}\n\n` +
      //   `Payment will be processed in EUR: ${displayPrice(breakdown.grandTotalEUR)}\n\n` +
      //   'Your bank/card will handle the currency conversion.\n' +
      //   'The exact amount may vary based on your bank\'s exchange rate.',
      //   [
      //     { text: 'Cancel', style: 'cancel' },
      //     {
      //       text: 'Continue to Payment',
      //       onPress: async () => {
      //         await proceedWithPayment(breakdown);
      //       },
      //       style: 'default'
      //     }
      //   ]
      // );
    } else {
      await proceedWithPayment(breakdown);
    }
  };

  // Separate function for actual payment
  const proceedWithPayment = async (breakdown: any) => {
    // Send both EUR amount and selected currency
    const payload = {
      cart_id: cartid,
      address_id: selectedAddress?.id,
      shipping_id: selectedShippingId || 1,
      // Send promo code if applied
      ...(appliedPromo && { promo_code: appliedPromo.code }),
      // Send currency info for backend
      currency: selectedCurrency,
      // Send the amount that should be charged (in EUR for payment gateway)
      amount_eur: breakdown.grandTotalEUR, // Important: Send EUR amount
      amount_to_pay: breakdown.amountToPay, // Rounded amount in selected currency
    };

    console.log('Payment calculation:', {
      userSees: breakdown.displayAmountToPay,
      gatewayReceives: `${breakdown.grandTotalEUR} EUR`,
      conversionRate: rates?.[selectedCurrency],
      difference: `${breakdown.amountToPay} ${selectedCurrency} = ${breakdown.grandTotalEUR} EUR`
    });

    try {
      showLoader();
      const res = await UserService.Placeorder(payload);
      if (
        res &&
        res.data &&
        (res.status === HttpStatusCode.Ok || res.status === 200)
      ) {
        setShippingModalVisible(false);
        console.log('PlaceOrder success', res?.data);

        if (res.data.payment_url) {
          setPaymentUrl(res.data.payment_url);
          setShowWebView(true);

          // Log for debugging
          console.log('Payment gateway should show:', {
            expectedEUR: breakdown.grandTotalEUR,
            userCurrency: selectedCurrency,
            convertedAmount: breakdown.amountToPay,
            conversionNote: `Gateway shows EUR, user sees ${selectedCurrency}`
          });
        } else {
          // ... success without payment
        }
      }
    } catch (err: any) {
      // ... error handling
    } finally {
      hideLoader();
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require('../../assets/Png/back.png')}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Checkout</Text>
            {cartData?.items?.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartData.items.length}
                </Text>
              </View>
            )}
          </View>
          <View style={{ width: 24 }} />
        </View>

        {loadingCart ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#AEB254" />
            <Text style={styles.loadingText}>Loading cart...</Text>
          </View>
        ) : cartData?.items?.length > 0 ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#AEB254']}
                tintColor={'#AEB254'}
              />
            }
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: Colors.text[400],
                borderRadius: 10,
                margin: 5,
                marginTop: 10,
              }}
            >
              <Text style={styles.sectionTitle}>
                Shipment of {cartData?.items?.length} items
              </Text>

              <FlatList
                data={cartData?.items || []}
                keyExtractor={(item, index) =>
                  (item.id ?? `${item.product_id}-${index}`).toString()
                }
                renderItem={renderShipmentItem}
                scrollEnabled={false}
                style={{ marginBottom: 20 }}
              />
            </View>

            {/* You Might Also Like */}
            {items.length > 0 && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Colors.text[400],
                  borderRadius: 10,
                  margin: 5,
                  marginTop: 10,
                }}
              >
                <Text style={styles.sectionTitle}>You Might Also Like</Text>
                <FlatList
                  data={items}
                  horizontal
                  keyExtractor={item => item.id}
                  renderItem={renderSuggestionItem}
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={{ paddingHorizontal: 10 }}
                  ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
                />

                {items.length >= 3 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('WishlistScreen')}
                  >
                    <View
                      style={{
                        backgroundColor: '#F3F3F3',
                        borderRadius: 6,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        paddingVertical: 7,
                        margin: 20,
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
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Use Coupons */}
            <TouchableOpacity
              style={styles.couponBtn}
              activeOpacity={0.8}
              onPress={() => {
                setPromoModalVisible(true); // ✅ open instantly
                GetPromo(); // ✅ fetch in background
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  tintColor={'#AEB254'}
                  source={require('../../assets/Png/discount.png')}
                  style={{
                    width: 25,
                    height: 25,
                    marginLeft: 10,
                    alignSelf: 'center',
                  }}
                />
                <Text style={styles.couponText}>
                  {selectedPromoCode?.code?.trim()
                    ? selectedPromoCode.code
                    : 'Use Coupons'}
                </Text>
              </View>
              <Image
                source={require('../../assets/Png/next.png')}
                style={{
                  width: 10,
                  height: 10,
                  marginRight: 10,
                  alignSelf: 'center',
                }}
              />
            </TouchableOpacity>

            {/* Coupon Modal */}
            <Modal
              visible={promoModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setPromoModalVisible(false)}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  justifyContent: 'flex-end',
                }}
              >
                <TouchableWithoutFeedback
                  onPress={() => setPromoModalVisible(false)}
                >
                  <View style={{ flex: 1 }} />
                </TouchableWithoutFeedback>

                <View
                  style={{
                    backgroundColor: '#fff',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    padding: 16,
                    maxHeight: '70%',
                  }}
                >
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <View
                      style={{
                        width: 40,
                        height: 5,
                        backgroundColor: '#ccc',
                        borderRadius: 3,
                      }}
                    />
                  </View>

                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      marginBottom: 12,
                    }}
                  >
                    Available Coupons
                  </Text>

                  {isFetchingPromo ? (
                    <ActivityIndicator size="small" color="#5DA53B" />
                  ) : promoOptions.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#666' }}>
                      No coupons available
                    </Text>
                  ) : (
                    <FlatList
                      data={promoOptions}
                      keyExtractor={(it, idx) =>
                        (it.id ?? it.code ?? it.promo_code ?? idx).toString()
                      }
                      renderItem={({ item }) => {
                        // Extract coupon details correctly
                        const code = item?.coupon_code || item?.code || '';

                        // Check if coupon is selected
                        const isSelected = selectedPromoCode?.code === code;

                        // Prepare description text
                        let discountText = '';
                        if (item.discount_type === 'percentage') {
                          discountText = `${item.discount_value}% off (max ${displayPrice(item.max_discount)})`;
                        } else {
                          discountText = `${displayPrice(item.discount_value)} off`;
                        }

                        return (
                          <TouchableOpacity
                            onPress={() => {
                              console.log('Selected coupon:', {
                                code: item.coupon_code,
                                type: item.discount_type,
                                discount: item.discount_value,
                                max_discount: item.max_discount
                              });

                              setSelectedPromoCode({
                                code: item.coupon_code,  // Your API uses "coupon_code"
                                type: item.discount_type, // "percentage"
                                discount: item.discount_value, // "10.00"
                                max_discount: item.max_discount // "20"
                              });
                            }}
                            style={{
                              borderWidth: 1,
                              borderColor: isSelected ? '#AEB254' : '#EAEAEA',
                              backgroundColor: isSelected ? '#F7F9E5' : '#fff',
                              padding: 12,
                              borderRadius: 8,
                              marginBottom: 10,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '700' }}>{code}</Text>
                              <Text style={{ color: '#666', marginTop: 4, fontSize: 12 }}>
                                {discountText}
                              </Text>
                              {item.description ? (
                                <Text style={{ color: '#888', marginTop: 2, fontSize: 11 }}>
                                  {item.description}
                                </Text>
                              ) : null}
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 12, color: '#888' }}>
                                {item.start_date ? new Date(item.start_date).toLocaleDateString() : ''}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#5DA53B', marginTop: 2 }}>
                                {item.is_valid ? 'Valid' : 'Expired'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                      contentContainerStyle={{ paddingBottom: 10 }}
                    />
                  )}

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setPromoModalVisible(false);
                      }}
                      style={{
                        backgroundColor: '#eee',
                        paddingVertical: 12,
                        borderRadius: 28,
                        alignItems: 'center',
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: '#333' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => SetPromo()}
                      disabled={isApplyingPromo}
                      style={{
                        backgroundColor: Colors.button[100],
                        paddingVertical: 12,
                        borderRadius: 28,
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <Text style={{ color: '#000', fontWeight: '700' }}>
                        {isApplyingPromo ? 'Applying...' : 'Apply Coupon'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Bill details */}
            {cartData && (
              <View style={styles.billSection}>
                <Text style={styles.billTitle}>Bill details</Text>

                {(() => {
                  const breakdown = checkoutBreakdown;

                  return (
                    <>
                      {/* Subtotal */}
                      <View style={styles.billRow}>
                        <Text style={styles.billLabel}>
                          Subtotal ({cartData.items.length} items)
                        </Text>
                        <Text style={styles.billValue}>
                          {breakdown.displaySubtotal}
                        </Text>
                      </View>

                      {/* Total savings */}
                      {cartData?.total_savings && cartData.total_savings > 0 && (
                        <View style={styles.billRow}>
                          <Text style={[styles.billLabel, styles.savingsLabel]}>
                            Total Savings
                          </Text>
                          <Text style={[styles.billValue, styles.savingsValue]}>
                            {breakdown.displaySavings}
                          </Text>
                        </View>
                      )}

                      {/* Coupon discount */}
                      {appliedPromo && (
                        <View style={styles.billRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.billLabel, styles.couponLabel]}>
                              Coupon ({appliedPromo.code ?? appliedPromo.promo_code})
                            </Text>
                            <TouchableOpacity onPress={removeCoupon} style={{ marginLeft: 6 }}>
                              <Text style={{ color: '#FF0000', fontSize: 12 }}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.billValue, styles.couponValue]}>
                            {breakdown.displayCoupon}
                          </Text>
                        </View>
                      )}

                      {/* Delivery charges */}
                      <View style={styles.billRow}>
                        <Text style={[styles.billLabel, styles.deliveryLabel]}>
                          Delivery Charges
                        </Text>
                        <Text style={[styles.billValue, styles.deliveryValue]}>
                          {breakdown.displayDelivery}
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      {/* Grand total (with conversion) */}
                      <View style={styles.billRow}>
                        <Text style={[styles.billLabel, styles.grandTotalLabel]}>
                          Grand total
                        </Text>
                        <Text style={[styles.billValue, styles.grandTotalValue]}>
                          {breakdown.displayGrandTotal}
                        </Text>
                      </View>

                      {/* Optional: Show round off if you want */}
                      {Math.abs(breakdown.roundOffAmount) > 0.01 && (
                        <View style={styles.billRow}>
                          <Text style={[styles.billLabel, styles.roundOffLabel]}>
                            Round Off
                          </Text>
                          <Text style={[styles.billValue, styles.roundOffValue]}>
                            {breakdown.displayRoundOff}
                          </Text>
                        </View>
                      )}

                      {/* Amount to Pay (rounded) */}
                      <View style={[styles.billRow, styles.amountToPayRow]}>
                        <Text style={styles.amountToPayLabel}>Amount to Pay</Text>
                        <Text style={styles.amountToPayValue}>
                          {breakdown.displayAmountToPay}
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            )}

            {/* Delivery address */}
            <View style={styles.deliveryAddressCard}>
              <View style={{ alignSelf: 'center', flexDirection: 'row' }}>
                <Image
                  source={Images.home}
                  style={{
                    width: 25,
                    height: 25,
                    alignSelf: 'center',
                    resizeMode: 'cover',
                    tintColor: '#878B2F',
                  }}
                />
                <View style={{ alignSelf: 'center', marginLeft: 20 }}>
                  <Text style={styles.deliveryAddressTitle}>
                    {selectedAddress?.address_type
                      ? `Delivering to ${selectedAddress.address_type
                        ?.toString()
                        .charAt(0)
                        .toUpperCase()}${selectedAddress.address_type
                          ?.toString()
                          .slice(1)}`
                      : 'Delivering to Home'}
                  </Text>
                  <Text style={styles.deliveryAddress}>
                    {selectedAddress
                      ? `${selectedAddress.name}, ${selectedAddress.full_address
                      }${selectedAddress.city
                        ? `, ${selectedAddress.city}`
                        : ''
                      }${selectedAddress.postal_code
                        ? `, ${selectedAddress.postal_code}`
                        : ''
                      }${selectedAddress.phone
                        ? ` • ${selectedAddress.phone}`
                        : ''
                      }`
                      : 'Please Select Delivery Address'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{ alignSelf: 'center' }}
                activeOpacity={0.7}
                onPress={async () => {
                  const opts = await Getshiping();
                  if (opts && opts.length) {
                    setShippingModalVisible(true);
                  }
                }}
              >
                <Text style={styles.changeAddress}>
                  {selectedAddress ? 'Change' : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Checkout Button */}
            <TouchableOpacity
              style={styles.checkoutButton}
              activeOpacity={0.8}
              onPress={async () => {
                if (!selectedAddress) {
                  Alert.alert('', 'Please, select Address');
                  return;
                }
                await PlaceOrder();
              }}
            >
              <Image
                source={require('../../assets/Png/shopping-cart.png')}
                tintColor={'#000'}
                style={{
                  width: 20,
                  height: 20,
                  right: 10,
                }}
              />
              <Text style={styles.checkoutBtnText}>Check Out</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View
            style={{ justifyContent: 'center', alignSelf: 'center', flex: 1 }}
          >
            <Text
              style={[
                styles.headerTitle,
                { alignSelf: 'center', marginBottom: 10 },
              ]}
            >
              Your cart is empty
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('BottomTabScreen')}
            >
              <View
                style={{
                  width: widthPercentageToDP(70),
                  borderRadius: 12,
                  backgroundColor: Colors.button[100],
                  paddingVertical: 12,
                  alignSelf: 'center',
                }}
              >
                <Text style={{ fontSize: 14, alignSelf: 'center' }}>
                  Continue For shopping
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Shipping selection modal */}
      <Modal
        visible={shippingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShippingModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setShippingModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'flex-end',
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  padding: 16,
                  maxHeight: '70%',
                }}
              >
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      width: 40,
                      height: 5,
                      backgroundColor: '#ccc',
                      borderRadius: 3,
                    }}
                  />
                </View>
                <Text
                  style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}
                >
                  Delivery Method
                </Text>
                {isFetchingShipping ? (
                  <ActivityIndicator size="small" color="#E2E689" />
                ) : (
                  <FlatList
                    data={shippingOptions}
                    keyExtractor={it => String(it.id)}
                    renderItem={({ item }) => {
                      const isSelected =
                        Number(item.id) === Number(selectedShippingId);
                      return (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedShippingId(Number(item.id)),
                              GetCartDetails();
                          }}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            borderWidth: 1,
                            borderColor: isSelected ? '#AEB254' : '#EAEAEA',
                            backgroundColor: isSelected ? '#F7F9E5' : '#fff',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 10,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600', fontSize: 14 }}>
                              {item.type}
                            </Text>
                            <Text
                              style={{
                                color: '#666',
                                marginTop: 4,
                                fontSize: 12,
                              }}
                            >
                              Estimated Time: {item.estimated_time}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={{
                                color: '#888',
                                fontSize: 14,
                                fontWeight: '600',
                              }}
                            >
                              Cost
                            </Text>
                            {/* ✅ FIXED: Shipping cost wrapped in displayPrice */}
                            <Text style={{ color: '#AEB254', fontSize: 12 }}>
                              {displayPrice(item.cost)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    contentContainerStyle={{ paddingBottom: 10 }}
                  />
                )}

                <TouchableOpacity
                  onPress={() => {
                    setShippingModalVisible(false), setModalAddress(true);
                  }}
                  style={{
                    backgroundColor: '#AEB254',
                    paddingVertical: 14,
                    borderRadius: 28,
                    alignItems: 'center',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: '#000', fontWeight: '700' }}>
                    Continue to Address
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <LoginModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGoogleLogin={() => Alert.alert('Google Login')}
        onFacebookLogin={() => Alert.alert('Facebook Login')}
        phoneNumber="+420 605 476 490"
        onVerify={otp => Alert.alert('OTP Verified', otp)}
      />

      {/* Payment WebView */}
      {showWebView && checkoutBreakdown && (
        <SafeAreaView
          style={{
            flex: 1,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: '#fff',
          }}
        >
          {/* Header with currency info */}
          <View
            style={{
              height: 80,
              backgroundColor: '#f5f5f5',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#ddd',
            }}
          >
            <View style={{ flex: 1, }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
                Payment Gateway
              </Text>

              {/* Show both amounts for clarity */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>
                    Your order: {checkoutBreakdown.displayAmountToPay}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    (Payment processed in EUR)
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, color: '#5DA53B', fontWeight: '600' }}>
                    ≈ {displayPrice(checkoutBreakdown.grandTotalEUR)}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                    Your card will charge in EUR
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Cancel Payment?',
                  'Are you sure you want to cancel this payment?',
                  [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Yes',
                      onPress: () => setShowWebView(false),
                      style: 'destructive'
                    }
                  ]
                );
              }}
              style={{ marginLeft: 10 }}
            >
              <Text style={{ fontSize: 18, color: '#000' }}>✕</Text>
            </TouchableOpacity>
          </View   >

          <WebView
            style={{ flex: 1 }}
            source={{ uri: paymentUrl }}
            onLoadStart={() => {
              console.log('Payment Amount Details:', {
                // What user sees
                displayToUser: checkoutBreakdown.displayAmountToPay,
                // What's sent to payment gateway
                sentToGateway: `${checkoutBreakdown.grandTotalEUR} EUR`,
                // Conversion details
                conversion: `${checkoutBreakdown.grandTotalEUR} EUR = ${checkoutBreakdown.amountToPay} ${selectedCurrency}`,
                // Exchange rate used
                exchangeRate: rates?.[selectedCurrency],
                // Breakdown
                breakdown: {
                  subtotal: cartData?.subtotal_amount,
                  savings: cartData?.total_savings,
                  coupon: discountAmount,
                  shipping: getShippingCost(),
                  totalEUR: checkoutBreakdown.grandTotalEUR,
                  totalConverted: checkoutBreakdown.amountToPay,
                }
              });
            }}
            onNavigationStateChange={navState => {
              console.log('Payment navigation state:', {
                url: navState.url,
                title: navState.title,
                loading: navState.loading,
              });

              // Check for success URLs
              const successPatterns = [
                'payment-success',
                'success',
                'thank-you',
                'completed',
                'order-confirmed',
                'payment/complete',
                'checkout/success'
              ];

              const cancelPatterns = [
                'cancel',
                'cancelled',
                'payment-cancelled',
                'checkout/cancel',
                'payment/failed'
              ];

              const isSuccess = successPatterns.some(pattern =>
                navState.url.toLowerCase().includes(pattern.toLowerCase())
              );

              const isCancel = cancelPatterns.some(pattern =>
                navState.url.toLowerCase().includes(pattern.toLowerCase())
              );

              if (isSuccess) {
                console.log('Payment successful, closing WebView...');

                setTimeout(() => {
                  // Close WebView
                  setShowWebView(false);

                  // Clear cart
                  GetCartDetails();

                  // Clear promo codes
                  setAppliedPromo(null);
                  setDiscountAmount(0);
                  setSelectedPromoCode({ code: '', type: '', discount: '', max_discount: '' });

                  // Show success message
                  Toast.show({
                    type: 'success',
                    text1: 'Payment successful!',
                    text2: 'Your order has been confirmed'
                  });

                  // Navigate to confirmation screen
                  navigation.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'OrderConfirmation',
                        params: {
                          paymentSuccess: true,
                          timestamp: new Date().toISOString(),
                          orderAmount: checkoutBreakdown.displayAmountToPay,
                          eurAmount: displayPrice(checkoutBreakdown.grandTotalEUR),
                          currencyNote: selectedCurrency !== 'EUR' ?
                            `Your card was charged in EUR and converted to ${selectedCurrency}` :
                            null
                        }
                      }
                    ],
                  });
                }, 1500); // Slightly shorter delay

              } else if (isCancel) {
                console.log('Payment cancelled, closing WebView...');

                setShowWebView(false);

                Toast.show({
                  type: 'info',
                  text1: 'Payment cancelled',
                  text2: 'You can try again when ready'
                });

              } else {
                // Monitor URL changes for debugging
                if (navState.url !== paymentUrl) {
                  console.log('Navigated within payment gateway:', navState.url);

                  // Check if the payment gateway shows amount in URL or title
                  if (navState.title) {
                    const titleLower = navState.title.toLowerCase();
                    const amountPattern = /(\d+\.?\d*)\s*(€|eur|usd|czk|kč)/i;
                    const match = navState.title.match(amountPattern);

                    if (match) {
                      console.log('Detected amount in page title:', {
                        fullTitle: navState.title,
                        extractedAmount: match[1],
                        extractedCurrency: match[2],
                        expectedAmount: checkoutBreakdown.grandTotalEUR,
                      });
                    }
                  }

                  // Check URL parameters for amount
                  try {
                    const urlObj = new URL(navState.url);
                    const amountParam = urlObj.searchParams.get('amount');
                    const currencyParam = urlObj.searchParams.get('currency');

                    if (amountParam) {
                      console.log('Payment gateway amount in URL:', {
                        amount: amountParam,
                        currency: currencyParam || 'EUR',
                        expected: checkoutBreakdown.grandTotalEUR,
                      });

                      // Optional: Show amount to user in a toast
                      if (currencyParam && currencyParam !== selectedCurrency) {
                        Toast.show({
                          type: 'info',
                          text1: `Payment in ${currencyParam}`,
                          text2: `Amount: ${amountParam} ${currencyParam}`,
                          visibilityTime: 3000,
                        });
                      }
                    }
                  } catch (e) {
                    // Not a valid URL or can't parse
                  }
                }
              }
            }}
            onError={(error) => {
              console.error('WebView error:', error);
              Toast.show({
                type: 'error',
                text1: 'Payment gateway error',
                text2: 'Please try again or contact support',
              });
            }}
            onHttpError={(error) => {
              console.error('WebView HTTP error:', error);
            }}
            renderError={(errorDomain, errorCode, errorDesc) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10 }}>
                  Payment Gateway Error
                </Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
                  {errorDesc || 'Unable to load payment page'}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#AEB254',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                  onPress={() => setShowWebView(false)}
                >
                  <Text style={{ color: '#000', fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </SafeAreaView>
      )}

      <AddressModal
        visible={modalAddress}
        onClose={() => setModalAddress(false)}
        onAddNew={() => {
          setModalAddress(false);
          setmodalAddressADD(true);
        }}
        onSelect={(addr: any) => {
          setSelectedAddress(addr);
          setModalAddress(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.3,
    borderBottomColor: '#ccc',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  cartBadge: {
    backgroundColor: '#AEB254',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 10,
  },
  shipmentItemCard: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shipmentImage: {
    width: widthPercentageToDP(35),
    height: heightPercentageToDP(15),
    borderRadius: 16,
    resizeMode: 'cover',
  },
  shipmentName: {
    fontWeight: '500',
    fontSize: 14,
    color: '#444',
    textTransform: 'capitalize',
  },
  shipmentWeight: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  shipmentPrice: {
    marginTop: 4,
    fontWeight: '600',
    fontSize: 14,
    color: '#111',
  },
  moveToWishlistBtn: {
    marginTop: 6,
  },
  moveToWishlistText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5f621a',
  },
  qtyControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.button[100],
    backgroundColor: Colors.button[100],
    width: widthPercentageToDP(27),
    justifyContent: 'center',
    marginTop: 4,
    height: heightPercentageToDP(3.5),
  },
  qtyBtn: {
    paddingHorizontal: 0,
  },
  deleteBox: {
    backgroundColor: Colors.button[100],
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 8,
    borderRadius: 12,
  },
  qtyText: {
    paddingHorizontal: 12,
    fontWeight: '600',
    fontSize: 16,
    color: '#000',
  },
  wishlistItemCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 120,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    alignItems: 'center',
  },
  wishlistImage: {
    width: 84,
    height: 70,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  wishlistName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#444',
    marginTop: 6,
    textAlign: 'center',
  },
  wishlistPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
    marginTop: 2,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 120,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.text[400],
  },
  suggestionImage: {
    width: 84,
    height: 70,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  suggestionName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    marginTop: 6,
    textAlign: 'center',
  },
  suggestionPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f621a',
    marginTop: 5,
  },
  seeAllBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFD56C',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#5E6935',
    fontWeight: '600',
    fontSize: 14,
  },
  couponBtn: {
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.text[400],
    backgroundColor: '#FFF',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  couponText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
    marginLeft: 10,
  },
  shipmentActualPrice: {
    marginTop: 4,
    fontWeight: '600',
    fontSize: 14,
    color: '#111',
  },

  shipmentOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },

  billTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 12,
    color: '#878B2F',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 14,
    color: '#444',
  },
  billValue: {
    fontSize: 14,
    color: '#444',
  },
  deliveryAddressCard: {
    backgroundColor: '#fff',
    marginVertical: 12,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: SCREEN_WIDTH - 0,
    borderTopWidth: 1,
    borderColor: Colors.text[400],
  },
  deliveryAddressTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#878B2F',
  },
  deliveryAddress: {
    fontSize: 14,
    marginTop: 6,
    color: '#444',
    width: SCREEN_WIDTH - 150,
  },
  changeAddress: {
    color: '#878B2F',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  checkoutButton: {
    marginVertical: 20,
    alignSelf: 'center',
    backgroundColor: Colors.button[100],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 32,
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  checkoutBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  // Add to your styles:
  billSection: {
    borderWidth: 1,
    borderColor: Colors.text[400],
    borderRadius: 12,
    margin: 10,
    padding: 15,
    backgroundColor: '#fff',
  },
  savingsLabel: {
    color: '#5DA53B',
  },
  savingsValue: {
    color: '#5DA53B',
    fontWeight: '600',
  },
  couponLabel: {
    color: Colors.button[100],
  },
  couponValue: {
    color: Colors.button[100],
    fontWeight: '700',
  },
  deliveryLabel: {
    fontWeight: '500',
  },
  deliveryValue: {
    color: '#878B2F',
    fontWeight: '600',
  },
  divider: {
    height: 0.6,
    width: '100%',
    backgroundColor: Colors.text[400],
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontWeight: '700',
    fontSize: 14,
  },
  grandTotalValue: {
    fontWeight: '700',
    fontSize: 14,
  },
  roundOffLabel: {
    color: '#666',
    fontSize: 12,
  },
  roundOffValue: {
    color: '#666',
    fontSize: 12,
  },
  amountToPayRow: {
    marginTop: 12,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.text[400],
  },
  amountToPayLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  amountToPayValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
});

export default CheckoutScreen;