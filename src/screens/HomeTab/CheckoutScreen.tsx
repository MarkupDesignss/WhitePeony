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
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';

type DisplayWishlistItem = {
  id: string;
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
  variant_id?: number | string;
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
    state => state.currency.selectedCurrency,
  );

  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });

  const displayPrice = (priceEUR: any): string => {
    return convertAndFormatPrice(priceEUR, selectedCurrency, rates);
  };

  const { cart } = useCart();
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
    vat_percentage: 0,
  });
  const [cartid, setcartid] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(
    null,
  );
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);

  const { translatedText: selectShippingText } = useAutoTranslate(
    'Please select a shipping method',
  );
  const { translatedText: selectAddressText } = useAutoTranslate(
    'Please select address',
  );
  const { translatedText: cancelPaymentTitle } =
    useAutoTranslate('Cancel Payment?');
  const { translatedText: cancelPaymentMessage } = useAutoTranslate(
    'Are you sure you want to cancel this payment?',
  );
  const { translatedText: noText } = useAutoTranslate('No');
  const { translatedText: yesText } = useAutoTranslate('Yes');

  const [promoOptions, setPromoOptions] = useState<any[]>([]);
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState({
    code: '',
    type: '',
    discount: '',
    max_discount: '',
  });
  const [isFetchingPromo, setIsFetchingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const getShippingCost = () => {
    if (selectedShippingId && shippingOptions.length > 0) {
      const selectedShipping = shippingOptions.find(
        s => Number(s.id) === Number(selectedShippingId),
      );
      return selectedShipping?.cost || 0;
    }
    return 0;
  };

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

  useEffect(() => {
    const syncCart = async () => {
      await GetCartDetails();
    };
    syncCart();
  }, [cart.length]);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await UserService.wishlist();
        const apiWishlist = res?.data?.data || [];
        setItems(apiWishlist);
      } catch (e) {
        console.log('error fetching wishlist', e);
      }
    };

    const fetchInitialData = async () => {
      await Promise.all([fetchWishlist(), Getshiping(), GetCartDetails()]);
    };

    fetchInitialData();
  }, []);

  const moveToWishlist = (itemId: string | number | undefined) => {
    Alert.alert('✨', 'Item moved to wishlist');
  };

  const UpdateCart = async (item: CartItem, change: number) => {
    showLoader();
    try {
      const currentQty = Number(item.quantity);
      const newQty = currentQty + change;

      if (newQty < 1) {
        Toast.show({ type: 'info', text1: 'Minimum quantity is 1' });
        return;
      }
      if (newQty > 99) {
        Toast.show({ type: 'info', text1: 'Maximum quantity is 99' });
        return;
      }

      const payload = {
        product_id: item.product_id,
        quantity: newQty,
        variant_id: item.variant_id || item.variants?.[0]?.variant_id || null,
      };

      const res = await UserService.UpdateCart(payload);
      hideLoader();

      if (res?.data?.success === true) {
        Toast.show({
          type: 'success',
          text1: res.data?.message || 'Cart updated!',
        });
        await GetCartDetails();
      } else {
        Toast.show({ type: 'error', text1: 'Failed to update cart' });
      }
    } catch (err: any) {
      hideLoader();
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message || 'Something went wrong!',
      });
    }
  };

  const renderRightActions = (item: CartItem) => {
    return (
      <TouchableOpacity
        onPress={async () => {
          try {
            showLoader();
            const productId = parseInt(String(item.product_id), 10);
            let variantId: number | null = null;

            if (item.variant_id !== undefined && item.variant_id !== null) {
              variantId = parseInt(String(item.variant_id), 10);
            } else if (item.variants?.[0]?.variant_id) {
              variantId = parseInt(String(item.variants[0].variant_id), 10);
            } else if (item.variants?.[0]?.id) {
              variantId = parseInt(String(item.variants[0].id), 10);
            }

            await removeFromCart(productId, variantId);
            Toast.show({ type: 'success', text1: 'Item removed from cart' });
          } catch (err: any) {
            Toast.show({
              type: 'error',
              text1: 'Failed to remove item',
            });
          } finally {
            hideLoader();
          }
        }}
        style={styles.deleteBox}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    );
  };

  const renderShipmentItem = ({ item }: { item: CartItem }) => {
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

          <View style={styles.itemDetailsContainer}>
            <TransletText
              text={item.product_name || item.name}
              style={styles.shipmentName}
              numberOfLines={2}
            />

            {item?.unit && (
              <TransletText text={item.unit} style={styles.shipmentWeight} />
            )}

            <TouchableOpacity
              onPress={() => moveToWishlist(item.id)}
              style={styles.moveToWishlistBtn}
            >
              <Text style={styles.moveToWishlistText}>❤️ Move to wishlist</Text>
            </TouchableOpacity>

            <View style={styles.priceContainer}>
              <Text style={styles.shipmentActualPrice}>
                {displayPrice(actualPriceNum)}
              </Text>

              {hasDiscount && (
                <Text style={styles.shipmentOriginalPrice}>
                  {displayPrice(totalPriceNum)}
                </Text>
              )}
            </View>

            <View style={styles.qtyControlContainer}>
              <TouchableOpacity
                onPress={() => UpdateCart(item, -1)}
                disabled={item.quantity <= 1}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.qtyText}>{item.quantity}</Text>

              <TouchableOpacity
                onPress={() => UpdateCart(item, +1)}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>+</Text>
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
      style={styles.suggestionCard}
    >
      <Image
        source={
          item.image
            ? { uri: Image_url + item.image }
            : require('../../assets/Png/product.png')
        }
        style={styles.suggestionImage}
      />
      <TransletText
        text={item.name}
        style={styles.suggestionName}
        numberOfLines={1}
      />

      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map(r => {
          const isFull = item?.average_rating >= r;
          const isHalf =
            item?.average_rating >= r - 0.5 && item?.average_rating < r;
          return (
            <View key={r} style={styles.starWrapper}>
              <Text style={styles.starEmpty}>★</Text>
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

      <Text style={styles.suggestionUnit}>
        {item?.variants?.[0]?.unit || item?.unit}
      </Text>
      <Text style={styles.suggestionPrice}>
        {displayPrice(item?.variants?.[0]?.price || item?.price)}
      </Text>
    </TouchableOpacity>
  );

  const SetPromo = () => {
    if (!selectedPromoCode?.code) return;

    const total =
      Number(cartData?.discounted_total) || Number(cartData?.total_amount) || 0;
    const discountType = String(selectedPromoCode.type).toLowerCase();
    const discountValue = parseFloat(selectedPromoCode.discount);
    const maxDiscount = parseFloat(selectedPromoCode.max_discount) || Infinity;

    let calculatedDiscount = 0;

    if (discountType === 'percentage') {
      calculatedDiscount = (total * discountValue) / 100;
      if (maxDiscount && calculatedDiscount > maxDiscount) {
        calculatedDiscount = maxDiscount;
      }
    } else {
      calculatedDiscount = discountValue;
    }

    calculatedDiscount = Math.min(calculatedDiscount, total);
    calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

    setDiscountAmount(calculatedDiscount);
    setAppliedPromo({
      code: selectedPromoCode.code,
      discountType,
      discountValue,
      maxDiscount,
    });

    Toast.show({
      type: 'success',
      text1: `🎉 Coupon applied! Saved ${displayPrice(calculatedDiscount)}`,
    });
    setPromoModalVisible(false);
  };

  const removeCoupon = () => {
    setSelectedPromoCode({
      code: '',
      type: '',
      discount: '',
      max_discount: '',
    });
    setAppliedPromo(null);
    setDiscountAmount(0);
    Toast.show({ type: 'info', text1: 'Coupon removed' });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await GetCartDetails();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      GetCartDetails();
    }, []),
  );

  const GetCartDetails = async () => {
    try {
      setLoadingCart(true);
      const res = await UserService.viewCart();

      // Get VAT percentage from API response
      const vatPercentage = res?.data?.vat_percentage || 0;

      if (res && res.data && res.data.cart?.items?.length > 0) {
        const cartDataFromResponse = res.data.cart;

        const processedItems = (cartDataFromResponse?.items || []).map(item => {
          const variant = item.variants?.[0] || {};
          let actualPrice =
            variant.actual_price ||
            item.actual_price ||
            variant.price ||
            item.total_price;
          let displayPrice = variant.price || item.total_price;

          if (variant.percentage && parseFloat(variant.percentage) > 0) {
            const discountPercent = parseFloat(variant.percentage);
            actualPrice = variant.price;
            displayPrice =
              (parseFloat(actualPrice) * 100) / (100 - discountPercent);
          }

          return {
            ...item,
            actual_price: actualPrice,
            total_price: displayPrice,
            unit: variant.unit || item.unit,
            variant_id: variant.id || item.variant_id,
          };
        });

        const round = (n: number) => Math.round(n * 100) / 100;

        const discountedTotal = round(
          processedItems.reduce((sum, item) => {
            const price =
              Number(item.actual_price || 0) * Number(item.quantity || 1);
            return sum + price;
          }, 0),
        );

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
          total_amount: discountedTotal,
          subtotal_amount: originalTotal,
          discounted_total: discountedTotal,
          total_savings: totalSavings,
          id: cartDataFromResponse?.id || null,
          vat_percentage: vatPercentage,
        };

        setApiCartData(processedCartData);
        setcartid(processedCartData?.id);
      } else {
        setApiCartData({
          items: [],
          total_amount: 0,
          id: null,
          vat_percentage: vatPercentage,
        });
      }
    } catch (err: any) {
      console.log('GetCartDetails error', err);
      setApiCartData({
        items: [],
        total_amount: 0,
        id: null,
        vat_percentage: 0,
      });
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
      console.log('GetPromo error', err);
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
      }
      return [];
    } catch (err) {
      console.log('Getshiping error', err);
      return [];
    } finally {
      setIsFetchingShipping(false);
    }
  };

  const PlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('', selectAddressText);
      return;
    }

    if (!cartid) {
      Toast.show({ type: 'error', text1: 'Cart is empty' });
      return;
    }

    if (!selectedShippingId) {
      Toast.show({ type: 'error', text1: selectShippingText });
      return;
    }

    const shippingCost = getShippingCost();
    const breakdown = calculateCheckout(
      cartData?.subtotal_amount || 0,
      cartData?.total_savings || 0,
      discountAmount || 0,
      shippingCost,
      selectedCurrency,
      rates,
    );

    if (selectedCurrency !== 'EUR') {
      Alert.alert(
        'Currency Conversion',
        `Your order: ${breakdown.displayAmountToPay}\n\n` +
          `Payment in EUR: ${displayPrice(breakdown.grandTotalEUR)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => proceedWithPayment(breakdown) },
        ],
      );
    } else {
      await proceedWithPayment(breakdown);
    }
  };

  const proceedWithPayment = async (breakdown: any) => {
    const payload = {
      cart_id: cartid,
      address_id: selectedAddress?.id,
      shipping_id: selectedShippingId || 1,
      ...(appliedPromo && { promo_code: appliedPromo.code }),
      currency: selectedCurrency,
      grand_total: breakdown.amountToPay,
      amount_to_pay: breakdown.amountToPay,
    };

    try {
      showLoader();
      const res = await UserService.Placeorder(payload);

      if (
        res &&
        res.data &&
        (res.status === HttpStatusCode.Ok || res.status === 200)
      ) {
        if (res.data.payment_url) {
          setPaymentUrl(res.data.payment_url);
          setShowWebView(true);
        } else {
          Toast.show({ type: 'error', text1: 'No payment URL received' });
        }
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Payment failed',
        text2: err.response?.data?.message || 'Please try again',
      });
    } finally {
      hideLoader();
    }
  };

  const renderBillDetails = () => {
    if (!cartData || !cartData.items?.length) return null;

    const shippingCost = getShippingCost();
    const breakdown = calculateCheckout(
      cartData?.subtotal_amount || 0,
      cartData?.total_savings || 0,
      discountAmount || 0,
      shippingCost,
      selectedCurrency,
      rates,
    );

    const vatPercentage = cartData.vat_percentage || 0;

    const subtotal = Number(cartData?.subtotal_amount || 0);
    const savings = Number(cartData?.total_savings || 0);
    const couponDiscount = Number(discountAmount || 0);
    const deliveryCost = Number(shippingCost || 0);

    const subtotalAfterDiscounts = subtotal - savings - couponDiscount;
    const taxableAmount = subtotalAfterDiscounts + deliveryCost;
    const vatAmount =
      vatPercentage > 0 ? (taxableAmount * vatPercentage) / 100 : 0;
    const grandTotalWithVAT = taxableAmount + vatAmount;

    return (
      <View style={styles.billSection}>
        <Text style={styles.billTitle}>Bill Details</Text>

        <View style={styles.billRow}>
          <Text style={styles.billLabel}>
            Subtotal ({cartData.items.length} items)
          </Text>
          <Text style={styles.billValue}>{displayPrice(subtotal)}</Text>
        </View>

        {savings > 0 && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, styles.savingsLabel]}>
              Total Savings
            </Text>
            <Text style={[styles.billValue, styles.savingsValue]}>
              -{displayPrice(savings)}
            </Text>
          </View>
        )}

        {appliedPromo && discountAmount > 0 && (
          <View style={styles.billRow}>
            <View style={styles.couponRow}>
              <Text style={[styles.billLabel, styles.couponLabel]}>
                Coupon ({appliedPromo.code})
              </Text>
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={styles.removeCouponText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.billValue, styles.couponValue]}>
              -{displayPrice(discountAmount)}
            </Text>
          </View>
        )}

        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Delivery Charges</Text>
          <Text style={[styles.billValue, styles.deliveryValue]}>
            {deliveryCost > 0 ? displayPrice(deliveryCost) : 'Free'}
          </Text>
        </View>

        {vatPercentage > 0 && (
          <>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Taxable Amount</Text>
              <Text style={styles.billValue}>
                {displayPrice(taxableAmount)}
              </Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>VAT ({vatPercentage}%)</Text>
              <Text style={styles.billValue}>{displayPrice(vatAmount)}</Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.billRow}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          <Text style={styles.grandTotalValue}>
            {displayPrice(grandTotalWithVAT)}
          </Text>
        </View>

        <View style={[styles.billRow, styles.amountToPayRow]}>
          <Text style={styles.amountToPayLabel}>Amount to Pay</Text>
          <Text style={styles.amountToPayValue}>
            {displayPrice(grandTotalWithVAT)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Checkout</Text>
            {cartData?.items?.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartData.items.length}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight} />
        </View>

        {loadingCart ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#AEB254" />
            <Text style={styles.loadingText}>Loading your cart...</Text>
          </View>
        ) : cartData?.items?.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#AEB254']}
                tintColor="#AEB254"
              />
            }
          >
            <View style={styles.shipmentSection}>
              <Text style={styles.sectionTitle}>
                Shipment ({cartData.items.length}{' '}
                {cartData.items.length === 1 ? 'item' : 'items'})
              </Text>

              <FlatList
                data={cartData.items}
                keyExtractor={(item, index) =>
                  (item.id ?? `${item.product_id}-${index}`).toString()
                }
                renderItem={renderShipmentItem}
                scrollEnabled={false}
              />
            </View>

            {items.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.sectionTitle}>You Might Also Like</Text>

                <FlatList
                  data={items}
                  horizontal
                  keyExtractor={item => item.id}
                  renderItem={renderSuggestionItem}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsList}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                />

                {items.length >= 3 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('WishlistScreen')}
                    style={styles.seeAllButton}
                  >
                    <Text style={styles.seeAllText}>See all products →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.couponButton}
              activeOpacity={0.8}
              onPress={() => {
                setPromoModalVisible(true);
                GetPromo();
              }}
            >
              <View style={styles.couponButtonContent}>
                <Text style={styles.couponButtonIcon}>🏷️</Text>
                <Text style={styles.couponButtonText}>
                  {selectedPromoCode?.code?.trim()
                    ? selectedPromoCode.code
                    : 'Apply Coupon'}
                </Text>
              </View>
              <Text style={styles.couponButtonArrow}>→</Text>
            </TouchableOpacity>

            {renderBillDetails()}

            <View style={styles.deliveryAddressCard}>
              <View style={styles.addressIconContainer}>
                <Text style={styles.addressIcon}>🏠</Text>
                <View style={styles.addressDetails}>
                  <Text style={styles.deliveryAddressTitle}>
                    {selectedAddress?.address_type
                      ? `Deliver to ${selectedAddress.address_type}`
                      : 'Delivery Address'}
                  </Text>
                  <Text style={styles.deliveryAddress} numberOfLines={2}>
                    {selectedAddress
                      ? `${selectedAddress.name}, ${
                          selectedAddress.full_address
                        }${
                          selectedAddress.city
                            ? `, ${selectedAddress.city}`
                            : ''
                        }${
                          selectedAddress.postal_code
                            ? `, ${selectedAddress.postal_code}`
                            : ''
                        }${
                          selectedAddress.phone
                            ? ` • ${selectedAddress.phone}`
                            : ''
                        }`
                      : 'No address selected'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={async () => {
                  const opts = await Getshiping();
                  if (opts && opts.length) {
                    setShippingModalVisible(true);
                  }
                }}
              >
                <Text style={styles.changeAddress}>
                  {selectedAddress ? 'Change' : 'Select'} →
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                (!selectedAddress || !selectedShippingId) &&
                  styles.checkoutButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={PlaceOrder}
              disabled={!selectedAddress || !selectedShippingId}
            >
              <Text style={styles.checkoutButtonIcon}>🛒</Text>
              <Text style={styles.checkoutBtnText}>Proceed to Payment</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.emptyCartContainer}>
            <Text style={styles.emptyCartIcon}>🛒</Text>
            <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
            <Text style={styles.emptyCartSubtitle}>
              Looks like you haven't added anything yet
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('BottomTabScreen')}
              style={styles.shopNowButton}
            >
              <Text style={styles.shopNowText}>Continue Shopping →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={shippingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShippingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback
            onPress={() => setShippingModalVisible(false)}
          >
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Delivery Method</Text>

            {isFetchingShipping ? (
              <ActivityIndicator
                size="small"
                color="#AEB254"
                style={styles.modalLoader}
              />
            ) : (
              <FlatList
                data={shippingOptions}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => {
                  const isSelected =
                    Number(item.id) === Number(selectedShippingId);
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedShippingId(Number(item.id));
                        GetCartDetails();
                      }}
                      style={[
                        styles.shippingOption,
                        isSelected && styles.shippingOptionSelected,
                      ]}
                    >
                      <View style={styles.shippingOptionLeft}>
                        <Text style={styles.shippingOptionType}>
                          {item.type}
                        </Text>
                        <Text style={styles.shippingOptionTime}>
                          {item.estimated_time}
                        </Text>
                      </View>
                      <View style={styles.shippingOptionRight}>
                        <Text style={styles.shippingOptionCost}>
                          {displayPrice(item.cost)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.shippingList}
              />
            )}

            <TouchableOpacity
              onPress={() => {
                setShippingModalVisible(false);
                setModalAddress(true);
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>Continue to Address →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={promoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPromoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setPromoModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Available Coupons</Text>

            {isFetchingPromo ? (
              <ActivityIndicator
                size="small"
                color="#AEB254"
                style={styles.modalLoader}
              />
            ) : promoOptions.length === 0 ? (
              <Text style={styles.noCouponsText}>No coupons available</Text>
            ) : (
              <FlatList
                data={promoOptions}
                keyExtractor={(item, idx) =>
                  (item.id ?? item.code ?? idx).toString()
                }
                renderItem={({ item }) => {
                  const code = item?.coupon_code || item?.code || '';
                  const isSelected = selectedPromoCode?.code === code;

                  let discountText = '';
                  if (item.discount_type === 'percentage') {
                    discountText = `${
                      item.discount_value
                    }% off (max ${displayPrice(item.max_discount)})`;
                  } else {
                    discountText = `${displayPrice(item.discount_value)} off`;
                  }

                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPromoCode({
                          code: item.coupon_code,
                          type: item.discount_type,
                          discount: item.discount_value,
                          max_discount: item.max_discount,
                        });
                      }}
                      style={[
                        styles.couponItem,
                        isSelected && styles.couponItemSelected,
                      ]}
                    >
                      <View style={styles.couponItemLeft}>
                        <Text style={styles.couponCode}>{code}</Text>
                        <Text style={styles.couponDiscount}>
                          {discountText}
                        </Text>
                        {item.description && (
                          <Text style={styles.couponDescription}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.couponItemRight}>
                        {item.start_date && (
                          <Text style={styles.couponDate}>
                            {new Date(item.start_date).toLocaleDateString()}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.couponStatus,
                            item.is_valid
                              ? styles.couponValid
                              : styles.couponExpired,
                          ]}
                        >
                          {item.is_valid ? 'Valid' : 'Expired'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.couponList}
              />
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                onPress={() => setPromoModalVisible(false)}
                style={[styles.modalButton, styles.modalButtonSecondary]}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={SetPromo}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Text style={styles.modalButtonTextPrimary}>Apply Coupon</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showWebView && (
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <View style={styles.webViewHeaderLeft}>
              <Text style={styles.webViewTitle}>Payment Gateway</Text>
              <Text style={styles.webViewAmount}>
                {
                  calculateCheckout(
                    cartData?.subtotal_amount || 0,
                    cartData?.total_savings || 0,
                    discountAmount || 0,
                    getShippingCost(),
                    selectedCurrency,
                    rates,
                  ).displayAmountToPay
                }
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert(cancelPaymentTitle, cancelPaymentMessage, [
                  { text: noText, style: 'cancel' },
                  { text: yesText, onPress: () => setShowWebView(false) },
                ]);
              }}
              style={styles.webViewCloseButton}
            >
              <Text style={styles.webViewCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <WebView
            style={styles.webView}
            source={{ uri: paymentUrl }}
            onNavigationStateChange={navState => {
              const successPatterns = [
                'success',
                'thank-you',
                'completed',
                'order-confirmed',
              ];
              const isSuccess = successPatterns.some(pattern =>
                navState.url.toLowerCase().includes(pattern),
              );

              if (isSuccess) {
                setTimeout(() => {
                  setShowWebView(false);
                  GetCartDetails();
                  setAppliedPromo(null);
                  setDiscountAmount(0);
                  Toast.show({ type: 'success', text1: 'Payment successful!' });
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'OrderConfirmation' }],
                  });
                }, 1500);
              }
            }}
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
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#333',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerRight: {
    width: 32,
  },
  cartBadge: {
    backgroundColor: '#AEB254',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  shipmentSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  shipmentItemCard: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  shipmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  itemDetailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  shipmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  shipmentWeight: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  moveToWishlistBtn: {
    marginBottom: 4,
  },
  moveToWishlistText: {
    fontSize: 11,
    color: '#AEB254',
    fontWeight: '400',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  shipmentActualPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  shipmentOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  qtyControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#AEB254',
  },
  qtyText: {
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  deleteBox: {
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    marginVertical: 6,
    borderRadius: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
  suggestionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionsList: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  suggestionCard: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  suggestionImage: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    resizeMode: 'cover',
    marginBottom: 6,
  },
  suggestionName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  starWrapper: {
    width: 14,
    height: 14,
    position: 'relative',
  },
  starEmpty: {
    color: '#DDD',
    fontSize: 12,
    position: 'absolute',
  },
  starFill: {
    overflow: 'hidden',
    position: 'absolute',
  },
  starFilled: {
    color: '#FFD700',
    fontSize: 12,
  },
  suggestionUnit: {
    fontSize: 10,
    color: '#666',
    marginBottom: 1,
  },
  suggestionPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AEB254',
  },
  seeAllButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  couponButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
  },
  couponButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  couponButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  couponButtonArrow: {
    fontSize: 14,
    color: '#AEB254',
  },
  billSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    color: '#666',
  },
  billValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  savingsLabel: {
    color: '#4CAF50',
  },
  savingsValue: {
    color: '#4CAF50',
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponLabel: {
    color: '#AEB254',
  },
  removeCouponText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 6,
    fontWeight: '500',
  },
  couponValue: {
    color: '#AEB254',
    fontWeight: '600',
  },
  deliveryValue: {
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEB254',
  },
  amountToPayRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#AEB254',
  },
  amountToPayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  amountToPayValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#AEB254',
  },
  deliveryAddressCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  addressIconContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  addressIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  addressDetails: {
    flex: 1,
  },
  deliveryAddressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  deliveryAddress: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  changeAddress: {
    fontSize: 12,
    color: '#AEB254',
    fontWeight: '500',
  },
  checkoutButton: {
    backgroundColor: '#AEB254',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#AEB254',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0.1,
  },
  checkoutButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyCartIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyCartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptyCartSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  shopNowButton: {
    backgroundColor: '#AEB254',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#AEB254',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  shopNowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 32,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  modalLoader: {
    marginVertical: 24,
  },
  shippingList: {
    paddingBottom: 12,
  },
  shippingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  shippingOptionSelected: {
    borderColor: '#AEB254',
    backgroundColor: '#F8F9E5',
  },
  shippingOptionLeft: {
    flex: 1,
  },
  shippingOptionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  shippingOptionTime: {
    fontSize: 12,
    color: '#666',
  },
  shippingOptionRight: {
    marginLeft: 8,
  },
  shippingOptionCost: {
    fontSize: 15,
    fontWeight: '600',
    color: '#AEB254',
  },
  modalButton: {
    backgroundColor: '#AEB254',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 6,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginRight: 6,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#AEB254',
  },
  modalButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modalButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  couponList: {
    paddingBottom: 12,
  },
  couponItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  couponItemSelected: {
    borderColor: '#AEB254',
    backgroundColor: '#F8F9E5',
  },
  couponItemLeft: {
    flex: 1,
  },
  couponCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  couponDiscount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
  couponDescription: {
    fontSize: 11,
    color: '#999',
  },
  couponItemRight: {
    alignItems: 'flex-end',
  },
  couponDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  couponStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  couponValid: {
    color: '#4CAF50',
  },
  couponExpired: {
    color: '#FF6B6B',
  },
  noCouponsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 24,
  },
  webViewContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  webViewHeaderLeft: {
    flex: 1,
  },
  webViewTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 1,
  },
  webViewAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#AEB254',
  },
  webViewCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewCloseIcon: {
    fontSize: 16,
    color: '#666',
  },
  webView: {
    flex: 1,
  },
});

export default CheckoutScreen;
