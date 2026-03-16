import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { Image_url, UserService } from '../../service/ApiService';
import { HttpStatusCode } from 'axios';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import Toast from 'react-native-toast-message';
import AddressModal from '../../components/AddressModal';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../../context/CartContext';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import TransletText from '../../components/TransletText';
import { useAutoTranslate } from '../../hooks/useAutoTranslate';

// Types
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
  available_quantity?: number;
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const selectedCurrency = useAppSelector(
    state => state.currency.selectedCurrency,
  );

  const { data: rates } = useGetRatesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });

  const displayPrice = (price: any): string => {
    return convertAndFormatPrice(price, selectedCurrency, rates);
  };

  const { cart, removeFromCart, clearCart, cartVersion, refreshCart } = useCart();
  const [modalAddress, setModalAddress] = useState(false);
  const [modalAddressADD, setmodalAddressADD] = useState(false);
  const [items, setItems] = useState<DisplayWishlistItem[]>([]);
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
  const [stockErrors, setStockErrors] = useState<any[]>([]);
  const [showStockErrorModal, setShowStockErrorModal] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(
    null,
  );
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);

  // Payment state - IMPORTANT: Add all these states
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [orderCurrency, setOrderCurrency] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendResponse, setBackendResponse] = useState<any>(null);

  const { translatedText: selectShippingText } = useAutoTranslate(
    'Please select a shipping method',
  );
  const { translatedText: selectAddressText } = useAutoTranslate(
    'Please select address',
  );
  const { translatedText: stockErrorTitle } =
    useAutoTranslate('Insufficient Stock');
  const { translatedText: stockErrorMessage } = useAutoTranslate(
    'Some items in your cart are out of stock or have insufficient quantity.',
  );
  const { translatedText: updateCartText } = useAutoTranslate('Update Cart');
  const { translatedText: removeItemsText } = useAutoTranslate(
    'Remove Out of Stock Items',
  );

  const { translatedText: confirmPaymentText } = useAutoTranslate('Confirm Payment');
  const { translatedText: totalAmountText } = useAutoTranslate('Total amount');
  const { translatedText: cancelText } = useAutoTranslate('Cancel');
  const { translatedText: payNowText } = useAutoTranslate('Pay Now');
  const { translatedText: couponAppliedText } = useAutoTranslate('Coupon applied! Saved');
  const { translatedText: couponRemovedText } = useAutoTranslate('Coupon removed');
  const { translatedText: cartUpdatedText } = useAutoTranslate('Cart updated!');
  const { translatedText: updateCartFailedText } = useAutoTranslate('Failed to update cart');
  const { translatedText: insufficientStockText } = useAutoTranslate('Insufficient Stock');
  const { translatedText: itemRemovedText } = useAutoTranslate('Item removed from cart');
  const { translatedText: removeFailedText } = useAutoTranslate('Failed to remove item');
  const { translatedText: minQuantityText } = useAutoTranslate('Minimum quantity is 1');
  const { translatedText: maxQuantityText } = useAutoTranslate('Maximum quantity is 99');
  const { translatedText: cartEmptyText } = useAutoTranslate('Cart is empty');
  const { translatedText: selectShippingMethodText } = useAutoTranslate('Select shipping method');
  const { translatedText: shippingMethodSelectedText } = useAutoTranslate('selected');
  const { translatedText: freeText } = useAutoTranslate('Free');
  const { translatedText: deliveryText } = useAutoTranslate('Delivery');
  const { translatedText: noShippingMethodsText } = useAutoTranslate('No shipping methods available');
  const { translatedText: failedToLoadShippingText } = useAutoTranslate('Failed to load shipping methods');
  const { translatedText: outOfStockItemsRemovedText } = useAutoTranslate('Out of stock items removed');
  const { translatedText: failedToRemoveItemsText } = useAutoTranslate('Failed to remove items');
  const { translatedText: paymentFailedText } = useAutoTranslate('Payment Failed');
  const { translatedText: paymentCancelledText } = useAutoTranslate('Payment Cancelled');
  const { translatedText: couldNotInitializePaymentText } = useAutoTranslate('Could not initialize payment');
  const { translatedText: unexpectedErrorText } = useAutoTranslate('Unexpected error occurred');
  const { translatedText: loadingYourCartText } = useAutoTranslate('Loading your cart...');
  const { translatedText: shipmentText } = useAutoTranslate('Shipment');
  const { translatedText: itemText } = useAutoTranslate('item');
  const { translatedText: itemsText } = useAutoTranslate('items');
  const { translatedText: youMightAlsoLikeText } = useAutoTranslate('You Might Also Like');
  const { translatedText: seeAllProductsText } = useAutoTranslate('See all products →');
  const { translatedText: shippingMethodText } = useAutoTranslate('Shipping Method');
  const { translatedText: changeText } = useAutoTranslate('Change');
  const { translatedText: applyCouponText } = useAutoTranslate('Apply Coupon');
  const { translatedText: availableCouponsText } = useAutoTranslate('Available Coupons');
  const { translatedText: noCouponsAvailableText } = useAutoTranslate('No coupons available');
  const { translatedText: closeText } = useAutoTranslate('Close');
  const { translatedText: selectShippingMethodModalText } = useAutoTranslate('Select Shipping Method');
  const { translatedText: billDetailsText } = useAutoTranslate('Bill Details');
  const { translatedText: subtotalText } = useAutoTranslate('Subtotal');
  const { translatedText: totalSavingsText } = useAutoTranslate('Total Savings');
  const { translatedText: deliveryChargesText } = useAutoTranslate('Delivery Charges');
  const { translatedText: vatText } = useAutoTranslate('VAT');
  const { translatedText: grandTotalText } = useAutoTranslate('Grand Total');
  const { translatedText: amountToPayText } = useAutoTranslate('Amount to Pay');
  const { translatedText: deliverToText } = useAutoTranslate('Deliver to');
  const { translatedText: deliveryAddressText } = useAutoTranslate('Delivery Address');
  const { translatedText: noAddressSelectedText } = useAutoTranslate('No address selected');
  const { translatedText: selectAddressButtonText } = useAutoTranslate('Select Address');
  const { translatedText: yourCartIsEmptyText } = useAutoTranslate('Your cart is empty');
  const { translatedText: looksLikeText } = useAutoTranslate("Looks like you haven't added anything yet");
  const { translatedText: continueShoppingText } = useAutoTranslate('Continue Shopping →');
  const { translatedText: payText } = useAutoTranslate('Pay');
  const { translatedText: onlyAvailableText } = useAutoTranslate('Only available');
  const { translatedText: lowStockText } = useAutoTranslate('Low Stock');

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
      console.log('📦 Selected Shipping:', selectedShipping);
      return Number(selectedShipping?.cost) || 0;
    }
    return 0;
  };

  // Calculate final amount correctly
  const calculateFinalAmount = (): {
    subtotal: number;
    savings: number;
    couponDiscount: number;
    shippingCost: number;
    vatAmount: number;
    grandTotal: number;
  } => {
    if (!cartData || !cartData.items?.length) {
      return {
        subtotal: 0,
        savings: 0,
        couponDiscount: 0,
        shippingCost: 0,
        vatAmount: 0,
        grandTotal: 0,
      };
    }

    try {
      const discountedTotal = Number(cartData?.discounted_total || 0);
      const savings = Number(cartData?.total_savings || 0);
      const couponDiscount = Number(discountAmount || 0);
      const shippingCost = Number(getShippingCost() || 0);
      const vatPercentage = Number(cartData.vat_percentage || 0);

      console.log('💰 Calculation Input:', {
        discountedTotal,
        savings,
        couponDiscount,
        shippingCost,
        vatPercentage,
      });

      const afterCouponDiscount = discountedTotal - couponDiscount;
      const vatAmount = vatPercentage > 0
        ? (afterCouponDiscount * vatPercentage) / 100
        : 0;
      const grandTotal = afterCouponDiscount + shippingCost + vatAmount;
      const roundedGrandTotal = Math.round(grandTotal * 100) / 100;

      console.log('💰 Calculation Result:', {
        afterCouponDiscount,
        vatAmount,
        shippingCost,
        grandTotal: roundedGrandTotal,
      });

      return {
        subtotal: Math.round(discountedTotal * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        couponDiscount: Math.round(couponDiscount * 100) / 100,
        shippingCost: Math.round(shippingCost * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        grandTotal: roundedGrandTotal,
      };
    } catch (error) {
      console.log('❌ Error calculating final amount:', error);
      return {
        subtotal: 0,
        savings: 0,
        couponDiscount: 0,
        shippingCost: 0,
        vatAmount: 0,
        grandTotal: 0,
      };
    }
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

  const UpdateCart = async (item: CartItem, change: number) => {
    showLoader();
    try {
      const currentQty = Number(item.quantity);
      const newQty = currentQty + change;

      if (newQty < 1) {
        Toast.show({ type: 'info', text1: minQuantityText });
        return;
      }
      if (newQty > 99) {
        Toast.show({ type: 'info', text1: maxQuantityText });
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
          text1: res.data?.message || cartUpdatedText,
        });
        await GetCartDetails();
      } else {
        if (res?.data?.message?.toLowerCase().includes('stock')) {
          Toast.show({
            type: 'error',
            text1: insufficientStockText,
            text2: res.data.message,
          });
        } else {
          Toast.show({ type: 'error', text1: updateCartFailedText });
        }
      }
    } catch (err: any) {
      hideLoader();
      const errorMessage = err?.response?.data?.message || '';
      if (errorMessage.toLowerCase().includes('stock')) {
        Toast.show({
          type: 'error',
          text1: insufficientStockText,
          text2: errorMessage,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: err?.response?.data?.message || updateCartFailedText,
        });
      }
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
            Toast.show({ type: 'success', text1: itemRemovedText });
          } catch (err: any) {
            Toast.show({
              type: 'error',
              text1: removeFailedText,
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
    const actualPriceNum = parseFloat(item.actual_price?.toString() || '0');
    const totalPriceNum = parseFloat(item.total_price?.toString() || '0');
    const hasDiscount = totalPriceNum > actualPriceNum;
    const hasStockIssue =
      item.available_quantity !== undefined &&
      item.quantity > item.available_quantity;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <View
          style={[
            styles.shipmentItemCard,
            hasStockIssue && styles.outOfStockItem,
          ]}
        >
          <Image
            source={{ uri: Image_url + item.front_image }}
            style={styles.shipmentImage}
          />

          <View style={styles.itemDetailsContainer}>
            <View style={styles.itemHeader}>
              <Text style={styles.shipmentName} numberOfLines={2}>
                {item.product_name || item.name}
              </Text>
              {hasStockIssue && (
                <View style={styles.stockWarningBadge}>
                  <TransletText text={lowStockText} style={styles.stockWarningText} />
                </View>
              )}
            </View>

            {item?.unit && (
              <Text style={styles.shipmentWeight}>{item.unit}</Text>
            )}

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

            {hasStockIssue && (
              <Text style={styles.stockErrorText}>
                {onlyAvailableText} {item.available_quantity}
              </Text>
            )}

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
      <Text style={styles.suggestionName} numberOfLines={1}>
        {item.name}
      </Text>

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
      text1: `🎉 ${couponAppliedText} ${displayPrice(calculatedDiscount)}`,
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
    Toast.show({ type: 'info', text1: couponRemovedText });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await GetCartDetails();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 CheckoutScreen focused - resetting states and refreshing cart');

      // Reset all payment states when screen comes into focus
      setPaymentIntentId(null);
      setOrderId(null);
      setTrackingNumber(null);
      setOrderAmount(0);
      setOrderCurrency('');
      setBackendResponse(null);
      setSelectedShippingId(null); // Reset shipping selection
      setDiscountAmount(0); // Reset coupon discount
      setAppliedPromo(null); // Reset applied promo
      setSelectedPromoCode({ code: '', type: '', discount: '', max_discount: '' }); // Reset promo code

      // Force refresh cart data
      const refreshCartData = async () => {
        await GetCartDetails();
      };

      refreshCartData();

      return () => {
        console.log('🔄 CheckoutScreen unfocused');
      };
    }, [cartVersion]), // Add cartVersion dependency
  );

  // 3. Add this useEffect to refresh cart when cartVersion changes (already have this)
  useEffect(() => {
    console.log('🔄 cartVersion changed to:', cartVersion, '- refreshing cart data');
    const refreshCartData = async () => {
      await GetCartDetails();
    };

    refreshCartData();
  }, [cartVersion]);

  const GetCartDetails = async () => {
    try {
      setLoadingCart(true);
      const res = await UserService.viewCart();

      console.log('📦 Raw Cart API Response:', JSON.stringify(res.data, null, 2));

      const vatPercentage = Number(res?.data?.vat_percentage || 0);

      let cartDataFromResponse = null;

      if (res?.data?.cart) {
        cartDataFromResponse = res.data.cart;
      } else if (res?.data?.data?.cart) {
        cartDataFromResponse = res.data.data.cart;
      } else if (Array.isArray(res?.data?.items)) {
        cartDataFromResponse = { items: res.data.items, id: res.data.id };
      }

      if (cartDataFromResponse && cartDataFromResponse.items?.length > 0) {
        const processedItems = (cartDataFromResponse.items || []).map(item => {
          const variant = item.variants?.[0] || {};

          return {
            ...item,
            actual_price: Number(item.actual_price || item.price || item.total_price || 0),
            total_price: Number(item.total_price || item.price || 0),
            unit: variant.unit || item.unit,
            variant_id: variant.id || item.variant_id,
            available_quantity: Number(variant.quantity || item.quantity || 0),
            quantity: Number(item.quantity || 1),
          };
        });

        const originalTotal = processedItems.reduce((sum, item) => {
          return sum + (Number(item.total_price || 0) * Number(item.quantity || 1));
        }, 0);

        const discountedTotal = processedItems.reduce((sum, item) => {
          return sum + (Number(item.actual_price || 0) * Number(item.quantity || 1));
        }, 0);

        const totalSavings = originalTotal - discountedTotal;

        console.log('🛒 Calculated Totals:', {
          originalTotal,
          discountedTotal,
          totalSavings,
          itemCount: processedItems.length
        });

        const processedCartData = {
          items: processedItems,
          original_total: Math.round(originalTotal * 100) / 100,
          discounted_total: Math.round(discountedTotal * 100) / 100,
          total_savings: Math.round(totalSavings * 100) / 100,
          id: cartDataFromResponse?.id || null,
          vat_percentage: vatPercentage,
        };

        setApiCartData(processedCartData);
        setcartid(processedCartData?.id);

        console.log('✅ Processed Cart Data:', processedCartData);
      } else {
        console.log('🛒 Cart is empty');
        setApiCartData({
          items: [],
          original_total: 0,
          discounted_total: 0,
          total_savings: 0,
          id: null,
          vat_percentage: vatPercentage,
        });
      }
    } catch (err: any) {
      console.log('❌ GetCartDetails error:', err);
      setApiCartData({
        items: [],
        original_total: 0,
        discounted_total: 0,
        total_savings: 0,
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
      console.log('📦 Fetching shipping methods...');

      const res = await UserService.Shiping();
      console.log(
        '📦 Shipping API Full Response:',
        JSON.stringify(res.data, null, 2),
      );

      let options = [];

      if (res && (res.status === HttpStatusCode.Ok || res.status === 200)) {
        if (Array.isArray(res.data)) {
          options = res.data;
        } else if (res.data?.data && Array.isArray(res.data.data)) {
          options = res.data.data;
        } else if (res.data?.shipping && Array.isArray(res.data.shipping)) {
          options = res.data.shipping;
        } else if (res.data?.result && Array.isArray(res.data.result)) {
          options = res.data.result;
        } else if (res.data?.items && Array.isArray(res.data.items)) {
          options = res.data.items;
        } else if (typeof res.data === 'object' && res.data !== null) {
          for (let key in res.data) {
            if (Array.isArray(res.data[key])) {
              options = res.data[key];
              break;
            }
          }
        }

        if (options.length > 0) {
          const processedOptions = options.map((opt, index) => {
            const id = Number(
              opt.id || opt.shipping_id || opt.method_id || opt.ID || index + 1,
            );
            const type =
              opt.type ||
              opt.name ||
              opt.method_name ||
              opt.title ||
              opt.shipping_method ||
              `Shipping Method ${id}`;
            const cost = Number(
              opt.cost ||
              opt.price ||
              opt.amount ||
              opt.rate ||
              opt.shipping_cost ||
              0,
            );
            const estimated_time =
              opt.estimated_time ||
              opt.delivery_time ||
              opt.time ||
              opt.duration ||
              '3-5 business days';
            const is_active =
              opt.is_active === '1' ||
              opt.is_active === 1 ||
              opt.is_active === true ||
              opt.status === 'active';

            return {
              id,
              type,
              cost,
              estimated_time,
              is_active,
              original: opt,
            };
          });

          setShippingOptions(processedOptions);

          const firstActive =
            processedOptions.find(o => o.is_active) || processedOptions[0];
          if (firstActive) {
            setSelectedShippingId(firstActive.id);
          }

          return processedOptions;
        } else {
          Toast.show({
            type: 'info',
            text1: noShippingMethodsText,
          });
          return [];
        }
      }
      return [];
    } catch (err: any) {
      console.log('❌ Getshiping error:', err);
      Toast.show({
        type: 'error',
        text1: failedToLoadShippingText,
        text2: err?.response?.data?.message || err.message,
      });
      return [];
    } finally {
      setIsFetchingShipping(false);
    }
  };

  const handleStockErrors = (errors: any[]) => {
    setStockErrors(errors);
    setShowStockErrorModal(true);
  };

  const removeOutOfStockItems = async () => {
    showLoader();
    try {
      const outOfStockItems = stockErrors.filter(
        item => item.available_quantity === 0,
      );

      for (const item of outOfStockItems) {
        await removeFromCart(
          parseInt(String(item.product_id), 10),
          item.variant_id ? parseInt(String(item.variant_id), 10) : null,
        );
      }

      Toast.show({
        type: 'success',
        text1: outOfStockItemsRemovedText,
      });

      setShowStockErrorModal(false);
      await GetCartDetails();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: failedToRemoveItemsText,
      });
    } finally {
      hideLoader();
    }
  };

  // Initialize Payment Sheet with proper data saving
  const initializePaymentSheet = async () => {
    try {
      setIsProcessing(true);

      const breakdown = calculateFinalAmount();
      const amountToPay = breakdown.grandTotal;

      // Clean the number
      const displayString = displayPrice(amountToPay);
      const noSpaces = displayString.replace(/\s/g, '');
      const withoutLastChar = noSpaces.slice(0, -1);
      const cleanNumber = parseFloat(withoutLastChar);

      const payload = {
        cart_id: cartid,
        address_id: selectedAddress?.id,
        shipping_id: selectedShippingId,
        currency: selectedCurrency,
        grand_total: cleanNumber,
        ...(appliedPromo && { promo_code: appliedPromo.code }),
      };

      const response = await UserService.Placeorder(payload);
      console.log('✅ Backend Response:', response.data);

      if (!response?.data?.client_secret) {
        throw new Error('No client secret received');
      }

      // Save all data
      setPaymentIntentId(response.data.stripe_order_id);
      setOrderId(response.data.order_id?.toString());
      setTrackingNumber(response.data.tracking_number);
      setOrderAmount(response.data.amount_to_pay);
      setOrderCurrency(response.data.currency);

      console.log('💰 SAVED DATA:', {
        orderId: response.data.order_id,
        paymentIntentId: response.data.stripe_order_id,
        trackingNumber: response.data.tracking_number,
        amount: response.data.amount_to_pay,
        currency: response.data.currency,
      });

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'White Peony',
        paymentIntentClientSecret: response.data.client_secret,
        defaultBillingDetails: {
          name: selectedAddress?.name || '',
          email: selectedAddress?.email || '',
          phone: selectedAddress?.phone || '',
        },
        testEnv: __DEV__,
        allowsDelayedPaymentMethods: true,
        returnURL: 'whitepeony://stripe-redirect',
      });

      if (error) throw error;

      return { success: true };

    } catch (error: any) {
      console.log('❌ Error:', error);
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment with proper navigation for all cases
  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      const { error } = await presentPaymentSheet();
      const breakdown = calculateFinalAmount();

      if (error) {
        // FAILURE CASE
        console.log('Payment Error:', error);

        const errorMessage = error.code === 'Canceled'
          ? paymentCancelledText
          : error.message;

        Toast.show({
          type: 'error',
          text1: error.code === 'Canceled' ? paymentCancelledText : paymentFailedText,
          text2: errorMessage,
        });

        // Clear states on failure
        setPaymentIntentId(null);
        setOrderId(null);
        setTrackingNumber(null);
        setOrderAmount(0);
        setOrderCurrency('');

        navigation.navigate('PaymentSuccess', {
          status: 'failed',
          errorMessage: errorMessage,
          orderId: null,
          paymentIntentId: null,
          trackingNumber: null,
          amount: breakdown.grandTotal,
          currency: selectedCurrency,
        });
        return;
      }

      // SUCCESS CASE - Store variables before clearing
      const successOrderId = orderId;
      const successPaymentIntentId = paymentIntentId;
      const successTrackingNumber = trackingNumber;
      const successAmount = orderAmount || breakdown.grandTotal;
      const successCurrency = orderCurrency || selectedCurrency;

      console.log('✅ Payment Successful! Navigation Data:', {
        orderId: successOrderId,
        paymentIntentId: successPaymentIntentId,
        trackingNumber: successTrackingNumber,
        amount: successAmount,
        currency: successCurrency,
      });

      await clearCart();
      await GetCartDetails();

      // Clear states after successful navigation preparation
      setPaymentIntentId(null);
      setOrderId(null);
      setTrackingNumber(null);
      setOrderAmount(0);
      setOrderCurrency('');

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'PaymentSuccess',
            params: {
              status: 'success',
              orderId: successOrderId,
              paymentIntentId: successPaymentIntentId,
              trackingNumber: successTrackingNumber,
              amount: successAmount,
              currency: successCurrency,
            },
          },
        ],
      });

    } catch (error: any) {
      console.log('❌ Payment error:', error);
      Toast.show({ type: 'error', text1: paymentFailedText });

      // Clear states on error
      setPaymentIntentId(null);
      setOrderId(null);
      setTrackingNumber(null);
      setOrderAmount(0);
      setOrderCurrency('');

      navigation.navigate('PaymentSuccess', {
        status: 'failed',
        errorMessage: error?.message || unexpectedErrorText,
        orderId: null,
        paymentIntentId: null,
        trackingNumber: null,
        amount: breakdown?.grandTotal || 0,
        currency: selectedCurrency,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const PlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('', selectAddressText);
      return;
    }

    if (!cartid) {
      Toast.show({ type: 'error', text1: cartEmptyText });
      return;
    }

    if (!selectedShippingId) {
      Toast.show({ type: 'error', text1: selectShippingText });
      return;
    }

    const stockIssues = cartData.items.filter(
      (item: CartItem) =>
        item.available_quantity !== undefined &&
        item.quantity > item.available_quantity,
    );

    if (stockIssues.length > 0) {
      handleStockErrors(stockIssues);
      return;
    }

    // Clear all payment states before new payment
    setPaymentIntentId(null);
    setOrderId(null);
    setTrackingNumber(null);
    setOrderAmount(0);
    setOrderCurrency('');
    setBackendResponse(null);

    const breakdown = calculateFinalAmount();
    const amountToPay = breakdown.grandTotal;

    Alert.alert(
      confirmPaymentText,
      `${totalAmountText}: ${displayPrice(amountToPay)}`,
      [
        { text: cancelText, style: 'cancel' },
        {
          text: payNowText,
          onPress: async () => {
            const result = await initializePaymentSheet();
            if (result.success) {
              await handlePayment();
            } else {
              // Payment sheet initialization failed
              navigation.navigate('PaymentSuccess', {
                status: 'failed',
                errorMessage: couldNotInitializePaymentText,
                orderId: null,
                paymentIntentId: null,
                trackingNumber: null,
                amount: breakdown.grandTotal,
                currency: selectedCurrency,
              });
            }
          },
        },
      ],
    );
  };

  const renderBillDetails = () => {
    if (!cartData || !cartData.items?.length) return null;

    const breakdown = calculateFinalAmount();
    const vatPercentage = Number(cartData.vat_percentage || 0);

    return (
      <View style={styles.billSection}>
        <TransletText text={billDetailsText} style={styles.billTitle} />

        <View style={styles.billRow}>
          <TransletText text={`${subtotalText} (${cartData.items.length} ${cartData.items.length === 1 ? itemText : itemsText})`} style={styles.billLabel} />
          <Text style={styles.billValue}>
            {displayPrice(cartData.discounted_total)}
          </Text>
        </View>

        {breakdown.savings > 0 && (
          <View style={styles.billRow}>
            <TransletText text={totalSavingsText} style={[styles.billLabel, styles.savingsLabel]} />
            <Text style={[styles.billValue, styles.savingsValue]}>
              -{displayPrice(breakdown.savings)}
            </Text>
          </View>
        )}

        {appliedPromo && breakdown.couponDiscount > 0 && (
          <View style={styles.billRow}>
            <View style={styles.couponRow}>
              <TransletText text={`${applyCouponText} (${appliedPromo.code})`} style={[styles.billLabel, styles.couponLabel]} />
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={styles.removeCouponText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.billValue, styles.couponValue]}>
              -{displayPrice(breakdown.couponDiscount)}
            </Text>
          </View>
        )}

        <View style={styles.billRow}>
          <TransletText text={deliveryChargesText} style={styles.billLabel} />
          <Text style={[styles.billValue, styles.deliveryValue]}>
            {breakdown.shippingCost > 0
              ? displayPrice(breakdown.shippingCost)
              : freeText}
          </Text>
        </View>

        {vatPercentage > 0 && (
          <View style={styles.billRow}>
            <TransletText text={`${vatText} (${vatPercentage}%)`} style={styles.billLabel} />
            <Text style={styles.billValue}>
              {displayPrice(breakdown.vatAmount)}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.billRow}>
          <TransletText text={grandTotalText} style={styles.grandTotalLabel} />
          <Text style={styles.grandTotalValue}>
            {displayPrice(breakdown.grandTotal)}
          </Text>
        </View>

        <View style={[styles.billRow, styles.amountToPayRow]}>
          <TransletText text={amountToPayText} style={styles.amountToPayLabel} />
          <Text style={styles.amountToPayValue}>
            {displayPrice(breakdown.grandTotal)} {selectedCurrency}
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
            <TransletText text="Checkout" style={styles.headerTitle} />
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
            <TransletText text={loadingYourCartText} style={styles.loadingText} />
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
              />
            }
          >
            <View style={styles.shipmentSection}>
              <TransletText text={`${shipmentText} (${cartData.items.length} ${cartData.items.length === 1 ? itemText : itemsText})`} style={styles.sectionTitle} />
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
                <TransletText text={youMightAlsoLikeText} style={styles.sectionTitle} />
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
                    <TransletText text={seeAllProductsText} style={styles.seeAllText} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Shipping Method Card */}
            <TouchableOpacity
              style={styles.shippingSelectorCard}
              onPress={async () => {
                setIsFetchingShipping(true);
                const opts = await Getshiping();
                if (opts && opts.length > 0) {
                  setShippingModalVisible(true);
                }
                setIsFetchingShipping(false);
              }}
            >
              <View style={styles.shippingIconContainer}>
                <Text style={styles.shippingIcon}>🚚</Text>
                <View style={styles.shippingDetails}>
                  <TransletText text={shippingMethodText} style={styles.shippingTitle} />
                  {isFetchingShipping ? (
                    <ActivityIndicator size="small" color="#AEB254" />
                  ) : (
                    <Text style={styles.shippingSelected}>
                      {selectedShippingId
                        ? shippingOptions.find(
                          s => Number(s.id) === Number(selectedShippingId),
                        )?.type || selectShippingMethodText
                        : selectShippingMethodText}
                    </Text>
                  )}
                </View>
              </View>
              <TransletText text={`${changeText} →`} style={styles.changeShipping} />
            </TouchableOpacity>

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
                <TransletText
                  text={selectedPromoCode?.code?.trim()
                    ? selectedPromoCode.code
                    : applyCouponText}
                  style={styles.couponButtonText}
                />
              </View>
              <Text style={styles.couponButtonArrow}>→</Text>
            </TouchableOpacity>

            {renderBillDetails()}

            {/* Address Card */}
            <View style={styles.deliveryAddressCard}>
              <View style={styles.addressIconContainer}>
                <Text style={styles.addressIcon}>🏠</Text>
                <View style={styles.addressDetails}>
                  <TransletText
                    text={selectedAddress?.address_type
                      ? `${deliverToText} ${selectedAddress.address_type}`
                      : deliveryAddressText}
                    style={styles.deliveryAddressTitle}
                  />
                  <Text style={styles.deliveryAddress} numberOfLines={2}>
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
                      : noAddressSelectedText}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalAddress(true)}>
                <TransletText
                  text={selectedAddress ? `${changeText} →` : `${selectAddressButtonText} →`}
                  style={styles.changeAddress}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                (!selectedAddress || !selectedShippingId || isProcessing) &&
                styles.checkoutButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={PlaceOrder}
              disabled={!selectedAddress || !selectedShippingId || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.checkoutButtonIcon}>💳</Text>
                  <TransletText
                    text={`${payText} ${displayPrice(calculateFinalAmount().grandTotal)}`}
                    style={styles.checkoutBtnText}
                  />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.emptyCartContainer}>
            <Text style={styles.emptyCartIcon}>🛒</Text>
            <TransletText text={yourCartIsEmptyText} style={styles.emptyCartTitle} />
            <TransletText text={looksLikeText} style={styles.emptyCartSubtitle} />
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('BottomTabScreen', { screen: 'Category' })
              }
              style={styles.shopNowButton}
            >
              <TransletText text={continueShoppingText} style={styles.shopNowText} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Shipping Modal */}
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
            <TransletText text={selectShippingMethodModalText} style={styles.modalTitle} />

            {isFetchingShipping ? (
              <ActivityIndicator
                size="large"
                color="#AEB254"
                style={styles.modalLoader}
              />
            ) : shippingOptions.length === 0 ? (
              <TransletText text={noShippingMethodsText} style={styles.noShippingText} />
            ) : (
              <FlatList
                data={shippingOptions}
                keyExtractor={item =>
                  item.id?.toString() || Math.random().toString()
                }
                renderItem={({ item }) => {
                  const isSelected =
                    Number(item.id) === Number(selectedShippingId);
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedShippingId(Number(item.id));
                        setShippingModalVisible(false);
                        Toast.show({
                          type: 'success',
                          text1: `${item.type} ${shippingMethodSelectedText}`,
                          text2: `${deliveryText}: ${item.cost > 0 ? displayPrice(item.cost) : freeText
                            }`,
                        });
                      }}
                      style={[
                        styles.shippingOption,
                        isSelected && styles.shippingOptionSelected,
                      ]}
                    >
                      <View style={styles.shippingOptionLeft}>
                        <Text style={styles.shippingOptionType}>
                          {item.type || 'Standard Shipping'}
                        </Text>
                        {item.estimated_time && (
                          <Text style={styles.shippingOptionTime}>
                            {item.estimated_time}
                          </Text>
                        )}
                      </View>
                      <View style={styles.shippingOptionRight}>
                        <Text style={styles.shippingOptionCost}>
                          {item.cost > 0 ? displayPrice(item.cost) : freeText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.shippingList}
              />
            )}

            <TouchableOpacity
              onPress={() => setShippingModalVisible(false)}
              style={styles.modalButton}
            >
              <TransletText text={closeText} style={styles.modalButtonText} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Promo Modal */}
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
            <TransletText text={availableCouponsText} style={styles.modalTitle} />

            {isFetchingPromo ? (
              <ActivityIndicator
                size="large"
                color="#AEB254"
                style={styles.modalLoader}
              />
            ) : promoOptions.length === 0 ? (
              <TransletText text={noCouponsAvailableText} style={styles.noCouponsText} />
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
                    discountText = `${item.discount_value}% off${item.max_discount
                      ? ` (max ${displayPrice(item.max_discount)})`
                      : ''
                      }`;
                  } else {
                    discountText = `${displayPrice(item.discount_value)} off`;
                  }

                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPromoCode({
                          code: item.coupon_code || item.code,
                          type: item.discount_type,
                          discount: item.discount_value,
                          max_discount: item.max_discount || '',
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
                        {item.expiry_date && (
                          <Text style={styles.couponDate}>
                            Exp:{' '}
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </Text>
                        )}
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
                <TransletText text={cancelText} style={styles.modalButtonTextSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={SetPromo}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <TransletText text={applyCouponText} style={styles.modalButtonTextPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stock Error Modal */}
      <Modal
        visible={showStockErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStockErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.stockErrorModalContent}>
            <Text style={styles.stockErrorModalIcon}>⚠️</Text>
            <TransletText text={stockErrorTitle} style={styles.stockErrorModalTitle} />
            <TransletText text={stockErrorMessage} style={styles.stockErrorModalMessage} />

            {stockErrors.map((error, index) => (
              <View key={index} style={styles.stockErrorItem}>
                <Text style={styles.stockErrorItemName}>
                  {error.product_name || 'Product'}
                </Text>
                <Text style={styles.stockErrorItemDetail}>
                  Requested: {error.quantity} | Available:{' '}
                  {error.available_quantity || 0}
                </Text>
              </View>
            ))}

            <View style={styles.stockErrorModalButtons}>
              <TouchableOpacity
                style={[
                  styles.stockErrorButton,
                  styles.stockErrorButtonSecondary,
                ]}
                onPress={() => setShowStockErrorModal(false)}
              >
                <TransletText text={updateCartText} style={styles.stockErrorButtonTextSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stockErrorButton,
                  styles.stockErrorButtonPrimary,
                ]}
                onPress={removeOutOfStockItems}
              >
                <TransletText text={removeItemsText} style={styles.stockErrorButtonTextPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.stockErrorCloseButton}
              onPress={() => setShowStockErrorModal(false)}
            >
              <Text style={styles.stockErrorCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Address Modal */}
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
  outOfStockItem: {
    opacity: 0.8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shipmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
    flex: 1,
  },
  stockWarningBadge: {
    backgroundColor: '#FFE0E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  stockWarningText: {
    fontSize: 9,
    color: '#D32F2F',
    fontWeight: '600',
  },
  shipmentWeight: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
  stockErrorText: {
    fontSize: 11,
    color: '#D32F2F',
    marginBottom: 4,
    fontWeight: '500',
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
  shippingSelectorCard: {
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
  shippingIconContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  shippingIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  shippingDetails: {
    flex: 1,
  },
  shippingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  shippingSelected: {
    fontSize: 12,
    color: '#666',
  },
  changeShipping: {
    fontSize: 12,
    color: '#AEB254',
    fontWeight: '500',
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
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
    width: '100%',
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
  noShippingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 24,
  },
  stockErrorModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
  },
  stockErrorModalIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  stockErrorModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 8,
  },
  stockErrorModalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  stockErrorItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 6,
  },
  stockErrorItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  stockErrorItemDetail: {
    fontSize: 12,
    color: '#D32F2F',
  },
  stockErrorModalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%',
  },
  stockErrorButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  stockErrorButtonPrimary: {
    backgroundColor: '#D32F2F',
  },
  stockErrorButtonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  stockErrorButtonTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stockErrorButtonTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  stockErrorCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockErrorCloseText: {
    fontSize: 16,
    color: '#999',
  },
});

export default CheckoutScreen;