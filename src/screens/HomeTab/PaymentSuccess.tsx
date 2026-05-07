import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { CommonLoader } from '../../components/CommonLoader/commonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserService, Image_url } from '../../service/ApiService';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../../hooks/useAppSelector';
import { convertAndFormatPrice } from '../../utils/currencyUtils';
import { useGetRatesQuery } from '../../api/endpoints/currencyEndpoints';
import TransletText from '../../components/TransletText';

// ── Theme (matches OrdersScreen) ──────────────────────────────────────────────
const T = {
  accent: '#AEB254',
  accentBg: '#F4F5E8',
  accentDark: '#8A8C3E',
  bg: '#F6F6F4',
  card: '#FFFFFF',
  border: '#EBEBEB',
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textHint: '#AAAAAA',
  success: '#2A6A4A',
  successBg: '#EAF6EF',
  danger: '#9B3333',
  dangerBg: '#FDEAEA',
  warning: '#8A6D20',
  warningBg: '#FDF5E6',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d: any) => {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
};

// ── Status config ─────────────────────────────────────────────────────────────
const statusConfig = {
  success: {
    iconBg: '#EAF6EF',
    iconColor: T.success,
    badgeBg: T.successBg,
    badgeText: T.success,
    badgeLabel: 'Paid',
    title: 'Order Confirmed',
    sub: 'Your order has been placed. Thank you for shopping with us!',
  },
  failed: {
    iconBg: T.dangerBg,
    iconColor: T.danger,
    badgeBg: T.dangerBg,
    badgeText: T.danger,
    badgeLabel: 'Failed',
    title: 'Payment Failed',
    sub: 'Your payment could not be processed. Please try again.',
  },
  pending: {
    iconBg: T.warningBg,
    iconColor: T.warning,
    badgeBg: T.warningBg,
    badgeText: T.warning,
    badgeLabel: 'Pending',
    title: 'Payment Processing',
    sub: 'Your payment is being verified. Please wait a moment.',
  },
};

const PaymentSuccess = ({ navigation, route }: any) => {
  const { showLoader, hideLoader } = CommonLoader();
  const {
    orderId,
    paymentIntentId,
    amount,
    currency,
    status,
    errorMessage,
    trackingNumber,
    message,
  } = route.params || {};

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    'success' | 'failed' | 'pending'
  >(status || 'success');
  const [verifying, setVerifying] = useState(false);

  const selectedCurrency = useAppSelector(s => s.currency.selectedCurrency);
  const { data: rates } = useGetRatesQuery(undefined);

  const displayPrice = (price: any): string =>
    convertAndFormatPrice(price, selectedCurrency, rates);

  useEffect(() => {
    fetchOrderDetails();
    if (paymentStatus === 'pending') {
      const iv = setInterval(checkPaymentStatus, 5000);
      return () => clearInterval(iv);
    }
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      // ── Same API call as OrdersScreen ──────────────────────────────────────
      // Response shape: { success, orders: [ { id, stripe_order_id,
      //   tracking_number, final_total, payment_status, items: [...] } ] }
      const res = await UserService.order();

      if (res?.data?.success && Array.isArray(res.data.orders)) {
        const match = res.data.orders.find(
          (o: any) => String(o.id) === String(orderId),
        );

        if (match) {
          // Fields come directly from the orders list API — no renaming needed
          setOrderDetails(match);

          const ps: string = match.payment_status ?? '';
          if (ps === 'paid' || ps === 'success') setPaymentStatus('success');
          else if (ps === 'failed') setPaymentStatus('failed');
          else setPaymentStatus('pending');
          return;
        }
      }

      // Fallback: API succeeded but order not found yet (just placed),
      // build a minimal object from route params so the screen is never blank
      setOrderDetails({
        id: orderId,
        stripe_order_id: paymentIntentId,
        tracking_number: trackingNumber,
        final_total: amount,
        payment_status: status ?? 'paid',
        items: [],
      });
    } catch {
      // Network error fallback
      setOrderDetails({
        id: orderId,
        stripe_order_id: paymentIntentId,
        tracking_number: trackingNumber,
        final_total: amount,
        payment_status: status ?? 'paid',
        items: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      const res = await UserService.order();
      if (res?.data?.success && Array.isArray(res.data.orders)) {
        const match = res.data.orders.find(
          (o: any) => String(o.id) === String(orderId),
        );
        if (match) {
          const ps: string = match.payment_status ?? '';
          if (ps === 'paid' || ps === 'success') {
            setPaymentStatus('success');
            setOrderDetails(match);
          } else if (ps === 'failed') {
            setPaymentStatus('failed');
            setOrderDetails(match);
          }
        }
      }
    } catch {
    } finally {
      setVerifying(false);
    }
  };

  const onShareReceipt = async () => {
    showLoader();
    try {
      await Share.share({
        message: `Order Receipt\nOrder #${
          orderDetails?.id || orderId
        }\nTracking: ${
          orderDetails?.tracking_number || trackingNumber || 'N/A'
        }\nTransaction: ${
          orderDetails?.stripe_order_id || paymentIntentId || 'N/A'
        }\nTotal: ${displayPrice(
          orderDetails?.final_total || amount || 0,
        )}\nStatus: ${paymentStatus}\n\nThank you for shopping with White Peony!`,
        title: `Order Receipt #${orderDetails?.id || orderId}`,
      });
    } catch {
      Alert.alert('Error', 'Could not share receipt');
    } finally {
      hideLoader();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.loader}>
        <ActivityIndicator color={T.accent} />
        <TransletText text="Loading order details…" style={s.loaderText} />
      </SafeAreaView>
    );
  }

  const cfg = statusConfig[paymentStatus];

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status icon ── */}
        <View style={[s.iconWrap, { backgroundColor: cfg.iconBg }]}>
          {paymentStatus === 'pending' ? (
            <ActivityIndicator color={cfg.iconColor} size="large" />
          ) : (
            <Text style={[s.iconChar, { color: cfg.iconColor }]}>
              {paymentStatus === 'success' ? '✓' : '✕'}
            </Text>
          )}
        </View>

        {/* ── Title + sub ── */}
        <Text style={[s.title, { color: cfg.iconColor }]}>{cfg.title}</Text>
        <Text style={s.sub}>{message || cfg.sub}</Text>

        {/* ── Summary card ── */}
        <View style={s.card}>
          {/* Order row */}
          <View style={s.cardHead}>
            <Text style={s.orderNum}>Order #{orderDetails?.id || orderId}</Text>
            <View style={[s.badge, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[s.badgeText, { color: cfg.badgeText }]}>
                {cfg.badgeLabel}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Key details */}
          <View style={s.rows}>
            {/* Order ID */}
            {/* <View style={s.row}>
              <Text style={s.rowLabel}>Order ID</Text>
              <Text style={s.rowValue}>#{orderDetails?.id || orderId}</Text>
            </View> */}

            {/* Transaction ID = stripe_order_id from API */}
            {/* <View style={s.row}>
              <Text style={s.rowLabel}>Transaction ID</Text>
              <Text style={s.rowValue} numberOfLines={1} ellipsizeMode="middle">
                {orderDetails?.stripe_order_id || paymentIntentId || '—'}
              </Text>
            </View> */}

            {/* Tracking No = tracking_number from API */}
            {/* <View style={s.row}>
              <Text style={s.rowLabel}>Tracking No.</Text>
              <Text style={[s.rowValue, { color: T.accent }]} numberOfLines={1}>
                {orderDetails?.tracking_number || trackingNumber || '—'}
              </Text>
            </View> */}

            {/* Date */}
            <View style={s.row}>
              <Text style={s.rowLabel}>Date</Text>
              <Text style={s.rowValue}>
                {formatDate(orderDetails?.created_at || new Date())}
              </Text>
            </View>

            {/* Payment method */}
            <View style={s.row}>
              <Text style={s.rowLabel}>Payment</Text>
              <Text style={s.rowValue}>
                {orderDetails?.payment_method || 'Credit Card'}
              </Text>
            </View>
          </View>

          {/* Error banner */}
          {paymentStatus === 'failed' &&
            (errorMessage || orderDetails?.error_message) && (
              <View style={s.errorBanner}>
                <Text style={s.errorBannerText}>
                  {errorMessage || orderDetails?.error_message}
                </Text>
              </View>
            )}

          {/* Pending banner */}
          {paymentStatus === 'pending' && (
            <View style={s.pendingBanner}>
              <ActivityIndicator size="small" color={T.warning} />
              <Text style={s.pendingBannerText}>
                {verifying ? 'Verifying…' : 'Awaiting confirmation'}
              </Text>
              <TouchableOpacity
                onPress={checkPaymentStatus}
                disabled={verifying}
                style={s.refreshBtn}
              >
                <Text style={s.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.divider} />

          {/* Items preview — up to 2 */}
          {orderDetails?.items?.length > 0 && (
            <>
              {orderDetails.items.slice(0, 2).map((item: any, i: number) => {
                // Support both orders-list shape (item.product.front_image)
                // and getOrderById shape (item.image / item.product_image)
                const product = item.product || {};
                const imgPath =
                  product.front_image || item.image || item.product_image;
                const name =
                  product.name || item.product_name || item.name || 'Product';
                const price =
                  item.subtotal ||
                  item.total_price ||
                  item.unit_price ||
                  item.price ||
                  0;
                return (
                  <View
                    key={i}
                    style={[
                      s.itemRow,
                      i > 0 && {
                        borderTopWidth: 0.5,
                        borderTopColor: T.border,
                      },
                    ]}
                  >
                    <Image
                      source={
                        imgPath
                          ? { uri: Image_url + imgPath }
                          : require('../../assets/Png/product.png')
                      }
                      style={s.itemImg}
                      defaultSource={require('../../assets/Png/product.png')}
                    />
                    <View style={s.itemInfo}>
                      <Text style={s.itemName} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={s.itemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={s.itemPrice}>{displayPrice(price)}</Text>
                  </View>
                );
              })}
              {orderDetails.items.length > 2 && (
                <Text style={s.moreItems}>
                  +{orderDetails.items.length - 2} more items
                </Text>
              )}
              <View style={s.divider} />
            </>
          )}

          {/* Price summary — uses exact orders API field names */}
          {Number(orderDetails?.discount_amount) > 0 && (
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Subtotal</Text>
              <Text style={s.priceVal}>
                {displayPrice(orderDetails?.total_amount || 0)}
              </Text>
            </View>
          )}
          {Number(orderDetails?.discount_amount) > 0 && (
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Discount</Text>
              <Text style={[s.priceVal, { color: T.success }]}>
                −{displayPrice(orderDetails?.discount_amount)}
              </Text>
            </View>
          )}

          <View style={[s.priceRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text
              style={[
                s.totalVal,
                paymentStatus === 'failed' && { color: T.danger },
              ]}
            >
              {displayPrice(orderDetails?.final_total || amount || 0)}
            </Text>
          </View>
        </View>

        {/* ── Actions ── */}
        {paymentStatus === 'success' && (
          <>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => navigation.navigate('OrdersScreen')}
              activeOpacity={0.85}
            >
              <TransletText text="Track Order" style={s.btnPrimaryText} />
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={s.btnOutline}
              onPress={onShareReceipt}
              activeOpacity={0.85}
            >
              <TransletText text="Share Receipt" style={s.btnOutlineText} />
            </TouchableOpacity> */}
          </>
        )}

        {paymentStatus === 'failed' && (
          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: T.danger }]}
            onPress={() =>
              navigation.navigate('BottomTabScreen', { screen: 'Cart' })
            }
            activeOpacity={0.85}
          >
            <TransletText text="Try Again" style={s.btnPrimaryText} />
          </TouchableOpacity>
        )}

        {paymentStatus === 'pending' && !verifying && (
          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: T.warning }]}
            onPress={checkPaymentStatus}
            activeOpacity={0.85}
          >
            <TransletText text="Check Status" style={s.btnPrimaryText} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'BottomTabScreen', params: { screen: 'Home' } }],
            })
          }
          style={s.linkBtn}
        >
          <Text style={s.linkBtnText}>← Continue Shopping</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentSuccess;

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 18, paddingBottom: 36, alignItems: 'center' },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg,
  },
  loaderText: { marginTop: 12, fontSize: 13, color: T.textHint },

  // Status icon
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 14,
  },
  iconChar: { fontSize: 30, fontWeight: '700', lineHeight: 34 },

  // Title / sub
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: T.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: T.textHint,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 16,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: T.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: T.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  orderNum: { fontSize: 14, fontWeight: '700', color: T.text },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 0.5, backgroundColor: T.border },

  // Detail rows
  rows: { paddingHorizontal: 14, paddingVertical: 10, gap: 7 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: { fontSize: 12, color: T.textHint },
  rowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textSub,
    maxWidth: '65%',
    textAlign: 'right',
    flexShrink: 1,
  },

  // Banners
  errorBanner: {
    backgroundColor: T.dangerBg,
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },
  errorBannerText: { fontSize: 12, color: T.danger, textAlign: 'center' },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.warningBg,
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },
  pendingBannerText: { flex: 1, fontSize: 12, color: T.warning },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.warningBg,
    borderWidth: 0.5,
    borderColor: T.warning,
    borderRadius: 6,
  },
  refreshBtnText: { fontSize: 11, color: T.warning, fontWeight: '600' },

  // Items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  itemImg: { width: 44, height: 44, borderRadius: 8, backgroundColor: T.bg },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 2 },
  itemQty: { fontSize: 11, color: T.textHint },
  itemPrice: { fontSize: 13, fontWeight: '700', color: T.accent },
  moreItems: {
    fontSize: 12,
    color: T.textHint,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Price rows
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  priceLabel: { fontSize: 12, color: T.textHint },
  priceVal: { fontSize: 12, fontWeight: '600', color: T.textSub },
  totalRow: {
    paddingTop: 8,
    marginTop: 2,
    paddingBottom: 14,
    borderTopWidth: 0.5,
    borderTopColor: T.border,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: T.text },
  totalVal: { fontSize: 16, fontWeight: '800', color: T.accent },

  // Buttons
  btnPrimary: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: T.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnOutline: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnOutlineText: { fontSize: 15, fontWeight: '700', color: T.accentDark },
  linkBtn: { marginTop: 8, paddingVertical: 8 },
  linkBtnText: { fontSize: 13, color: T.textHint },
});
